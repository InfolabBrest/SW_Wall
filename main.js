var Twitter = require('node-tweet-stream'),
    config = require('./config.json'),
    t = new Twitter({
        consumer_key: config.twitter.consumer_key,
        consumer_secret: config.twitter.consumer_secret,
        token: config.twitter.token,
        token_secret: config.twitter.token_secret
    }),
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
    top_3 = new Array(),
    fs = require('fs'),
    last_value,
    einstein_raw_script;



/************************************************************************************************************************
 * Server Setup
 ************************************************************************************************************************/
var port = process.env.PORT || 3000;

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
 * Loading config
 ************************************************************************************************************************/
config.wall = _.map(config.wall, function(hash) {
    return hash.toLowerCase();
});
config.battle = _.map(config.battle, function(hash) {
    /*if( hash[0] !== '#')
        hash = '#' + hash;*/

    return hash.toLowerCase();
});

var tracking = _.union(config.wall, config.battle),
    battleCount = _.zipObject(config.battle, _.range(0, config.battle.length, 0));

console.log(battleCount);
_.forEach(tracking, function(hash) {
    t.track(hash);
});


/************************************************************************************************************************
 * App
 ************************************************************************************************************************/
io.on('connection', function (socket) {
    socket.join('clients');

    socket.on('disconnect', function () {
        console.log('a user disconnect');
    });

    socket.emit('battle', battleCount);

    console.log('a user connect');
});

t.on('tweet', function (tweet) {
    var tl = {
        text: tweet.text,
        time: tweet.timestamp_ms,
        user: {
            name: tweet.user.name,
            screen_name: tweet.user.screen_name,
            image: tweet.user.profile_image_url
        }
    };

    var lowText = tl.text.toLowerCase();
    _.forEach(config.wall, function(hash) {
        if(lowText.indexOf(hash) !== -1) {
            io.to('clients').emit('tweet', tl);
            return false;
        }
    });

    _.forEach(config.battle, function(hash) {
        if(lowText.indexOf(hash) !== -1) {
            battleCount[hash] += 1;
            io.to('clients').emit('battle', battleCount);
        }
    });
});

t.on('error', function (err) {
    console.log('Oh no')
});

/************************************************************************************************************************
 * CityzenData RUNTIME
 ************************************************************************************************************************/
sortingArray([1422564139000,1,"aJFsQfhbKCU",1]);
//sortingArray([1422564139000,2,"WuUUqHzVEMs",2]);
//sortingArray([1422564179000,3,"aJFsQfhbKCU",3]);
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
        if (!error && response.statusCode == 200) {
            retrieveValue(JSON.parse(body));
        }
    });

}

function retrieveValue(data){


    var ts = data[1][0].v[0][0];
    var punch = data[0];
    var videoId = data[1][2].v[0][1];
    var userid = data[1][1][0].v[0][1];

    sortingArray([ts,punch,videoId,userid]);
}

/**
 * This function is handling the contest between candidates.
 * Top 3 is in the array named top_3
 * @param  {[type]} data [description]
 */
function sortingArray(data){

    if (last_value == data[0]) {
        console.log("meme donnée");
    } else{
            top_3.push(data);
            last_value = data[0];
            top_3.sort(function compare(a, b) {
                if (a[1]<b[1])
                      return 1;
                 if (a[1]>b[1])
                       return -1;
                // a doit être égal à b
                 return 0;
            });
            top_3.slice(0,4);
    };
console.log(top_3);
}




/************************************************************************************************************************
 * Routing function for PunchingBall
 ************************************************************************************************************************/

app.get('/punchingball/top10', function (req, res) {
    console.log(top_3);
  res.send(top_3);
})