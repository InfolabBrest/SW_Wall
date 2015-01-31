var save = require("./top.txt"),
    config = require('./config.json'),
    express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    morgan = require('morgan'),
    io = require('socket.io')(server),
    _ = require('lodash'),
    cityzendata_token = config.cityzendata.token,
    cityzendata_url = config.cityzendata.api_url,
    request = require('request'),
    urlencode = require('urlencode'),
    topPunch = new Array(),
    fs = require('fs'),
    last_value,
    einstein_raw_script,
    PunchSize = 10,
    last_fetch;

/************************************************************************************************************************
 * Server Setup
 ************************************************************************************************************************/
var port = process.env.PORT || 8080;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use(morgan('dev'));
app.use(express.static(__dirname + '/public'));

app.use(function logErrors (err, req, res, next) {
    console.error(err.stack);
    next(err);
});

app.use(function clientErrorHandler (err, req, res, next) {
    if (req.xhr) {
        res.status(500).send({ error: 'Something blew up!' });
    } else {
        next(err);
    }
});

app.use(function errorHandler (err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
});

/************************************************************************************************************************
 * App
 ************************************************************************************************************************/

/************************************************************************************************************************
 * CityzenData RUNTIME
 ************************************************************************************************************************/
fs.readFile('top.txt', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  topPunch = JSON.parse(data);
});

fs.readFile('script.einstein', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
    einstein_raw_script = data;
    einstein_raw_script = einstein_raw_script.replace(/_TOKEN_/g,cityzendata_token);
});


setInterval(fetchCityzenData, 10*1000);

/************************************************************************************************************************
 * CityzenData Functions
 ************************************************************************************************************************/

/**
 * [fetchCityzenData fetch Cityzen API]
 * @param  {[type]} TS of start in ms
 * @param  metric name
 */
function fetchCityzenData(){

    request.post({
        'content-type': 'text/plain;charset=UTF-8',
        url : cityzendata_url,
        encoding : "utf8",
        form : einstein_raw_script
    }, function httpcallback(error, response, body){
        console.log(body);
        if (!error && response.statusCode == 200) {

            //if (body:!) {};
            retrieveValue(JSON.parse(body));
        }
    });

}

function retrieveValue(data){

    if (last_fetch == data) {
        return;
    };
    last_fetch = data;

    var ts = data[1][0].v[0][0];
    var punch = data[0][0].v[data[0][0].v.length-1][1];
    var videoId = data[1][2].v[0][1];
    var userid = data[1][1][0].v[0][1];

    sortingArray([ts,punch,videoId,userid]);
}

/**
 * This function is handling the contest between candidates.
 * Top 3 is in the array named topPunch
 * @param  {[type]} data [description]
 */
function sortingArray(data){

    if (last_value == data[0]) {
    } else{
            topPunch.push(data);
            last_value = data[0];
            topPunch.sort(function compare(a, b) {
                if (a[1]<b[1])
                      return 1;
                 if (a[1]>b[1])
                       return -1;
                // a doit être égal à b
                 return 0;
            });
            topPunch = topPunch.slice(0,PunchSize);
    };
fs.writeFile("top.txt",JSON.stringify(topPunch), function(err) {
    if(err) {
        console.log(err);
    }
});
console.log(topPunch);
}

/************************************************************************************************************************
 * Routing function for PunchingBall
 ************************************************************************************************************************/

app.get('/punchingball/top10', function (req, res) {
  res.send(topPunch);
})
