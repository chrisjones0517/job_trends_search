$(document).ready(() => {

    const searchObj = {
        job: '',
        location: '',
        keywords: []
    };

    $('#scrape').click(() => {
        $.post('/scrape', (data, status) => {
            console.log(status);
        });
    });

    $('#delete-all').click(() => {
        $('#keyword-btns').empty();
        searchObj.keywords = [];
        $('#keyword').val('');
    });

    $('#keyword-btns').click(e => {
        $('#keyword').val('');
        const term = $(e.target).text();

        for (let i = 0; i < searchObj.keywords.length; i++) {
            if (term === searchObj.keywords[i].term) {
                searchObj.keywords.splice(i, 1);
                $(e.target).remove();
            }
        }

        console.log('searchObj', searchObj);
    });

    $.get('/data', (data, status) => {
        createChart(data.keywords);
        console.log('data was requested');
        console.log(data);
        console.log(status);
        $('#job-title').val(data.job);
        $('#location').val(data.location);
        data.keywords.map((item, index) => {
            $('#keyword-btns').append(`<button class="btn btn-danger keyword-btn m-3">${item.term}</button>`);
            searchObj.keywords.push(item);
        });
    });

    $('#submit').click(e => {
        console.log('submit was clicked');
        console.log('searchObj', searchObj);
        e.preventDefault();

        searchObj.job = $('#job-title').val();
        searchObj.location = $('#location').val();
        const newKeyword = $('#keyword').val();

        if (newKeyword) {
            searchObj.keywords.push({ term: newKeyword, numHits: 0 });
            $('#keyword-btns').append(`<button class="btn btn-danger keyword-btn mt-3">${newKeyword}</button>`);
        }

        $('#keyword').val('');

        $.ajax({
            url: '/updatesearch',
            type: 'POST',
            data: JSON.stringify(searchObj),
            contentType: 'application/json; charset=utf8',
            dataType: 'json',
            success: res => {
                console.log(res);
            },
            error: (jqXHR, textStatus, err) => {
                console.log(jqXHR);
                console.log(textStatus);
                console.log(err);
            }
        });
    });
});

function createChart(arrayOfObj) {
    let myLabels = [];
    let myData = [];
    arrayOfObj.forEach((value, index) => {
        myLabels.push(value.term);
        myData.push(value.numHits);
    });
    let ctx = document.getElementById('chart').getContext('2d');
    let chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'bar',

        // The data for our dataset

        data: {
            labels: myLabels,
            datasets: [{
                label: 'Number of Keyword Occurrences',
                backgroundColor: 'rgb(219, 112, 147)',
                borderColor: 'rgb(219, 112, 147)',
                data: myData
            }]
        },

        // Configuration options go here

        options: {
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Number of Keyword Occurrences'
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Search Terms'
                    }
                }]
            }
        }
    });
}