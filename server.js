const express = require('express');
const fs = require('fs');
const puppeteer = require('puppeteer');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '\\index.html');
});

app.get('/data', (req, res) => {
    const data = require('./search.json');
    console.log('data', data);
    res.json(data);
});

app.post('/updatesearch', (req, res) => {
    console.log('post received');
    fs.writeFileSync('./search.json', JSON.stringify(req.body));
    console.log('job', req.body.job);
    console.log('location', req.body.location);
    console.log('keywords', req.body.keywords);
    res.json(req.body);
});

app.post('/scrape', (req, res) => {
    const data = require('./search.json');

    scrape(data.job, data.keywords, data.location);
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Server listening on port: ${port}`);
});

async function scrape(jobTitle, keywordArr, location) {

    const stateObj = {
        job: jobTitle,
        location,
        keywords: keywordArr
    };

    const city = location.match(/\w+(?=,)/g)[0].trim();
    const state = location.match(/(?<=,)\s?\w+/g)[0].trim();
    const title = jobTitle.replace(' ', '+');

    const browser = await puppeteer.launch({
        args: ['--disable-web-security'],
        headless: true,
        defaultViewport: {
            width: 1600,
            height: 1200
        }
    });
    const page = await browser.newPage();
    await page.goto(`https://www.indeed.com/jobs?q=${title}&l=${city}%2C+${state}`);

    let numItems = 1;
    let numErrors = 0;
    let nextPage;
    let totalItems = 0;
    let paginationErr = 0;

    do {
        do {
            try {
                await page.click('.jobsearch-SerpJobCard');
                await page.waitFor(2000);
                const data = await page.evaluate(() => {
                    const iframe = document.querySelector('iframe');
                    let content = iframe.contentWindow.document.body.innerHTML;
                    let doc = new DOMParser().parseFromString(content, 'text/html');
                    doc = doc.querySelector('#jobDescriptionText').innerHTML;
                    doc = JSON.stringify(doc);
                    const firstJob = document.querySelectorAll('.jobsearch-SerpJobCard')[0];
                    firstJob.parentNode.removeChild(firstJob);

                    return { numItems: document.querySelectorAll('.jobsearch-SerpJobCard').length, text: doc };
                });

                // await page.waitFor(1000);
                numItems = data.numItems;
                totalItems++;
                console.log('total jobs scraped', totalItems);

                for (let i = 0; i < keywordArr.length; i++) {
                    const regex = new RegExp(keywordArr[i].term, 'gi');
                    const count = (data.text.match(regex) || []).length;
                    stateObj.keywords[i].numHits += count;
                }

                console.log(stateObj);
                console.log('numItems', numItems);
            } catch (error) {
                numErrors++;
                console.log('numErrors', numErrors);
                console.log(error);
            }
        } while (numItems)
        try {
            nextPage = await page.evaluate(() => {
                const next = document.querySelector('a[aria-label=Next]').innerHTML;
                return next;
            });
            await page.waitFor(1000);
            if (nextPage) {
                await page.click('[aria-label=Next]');
                await page.waitFor(1000);
            }
            console.log('nextPage', nextPage);
        } catch (error) {
            console.log('pagination error');
            paginationErr++;
            if (paginationErr > 5) {
                fs.writeFileSync('./search.json', JSON.stringify(stateObj));
                return stateObj;
            }
        }
    } while (nextPage)

    fs.writeFileSync('./search.json', JSON.stringify(stateObj));
    return stateObj;
}
