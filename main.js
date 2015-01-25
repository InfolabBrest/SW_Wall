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
    cityzendata_class = config.cityzendata.classname,
    request = require('request'),
    urlencode = require('urlencode'),
    data_bearing = config.cityzendata.bearing;

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
 * CityzenData Functions
 ************************************************************************************************************************/

/**
 * [EinsteinMaker creates the Einstein request and return it]
 * @param {string} classname  
 * The start and end timestamps are in ISO8601 format, i.e. YYYY-MM-DDTHH:MM:SS.SSSSSSZ
 * @param {string} start
 * @param {string} stop
 * @return {string} einstein_script
 */
function EinsteinMaker(start,stop) {

    var script =  
        "'"+cityzendata_token+"'\n"+
        "'"+cityzendata_class+"'\n"+
        "0 ->MAP\n"+
        "'"+encodeURIComponent(start)+"'\n"+
        "'"+encodeURIComponent(stop)+"'\n"+
        "5 ->LIST\n"+
        "FETCH";
    return script;
}
/**
 * [fetchCityzenData fetch data from CityzenData]
 * @param  {String} einstein script
 * @return {[type]} data fetch
 */

// Test
fetchCityzenData(EinsteinMaker("2013-01-12T10:02:00+01:00","2016-01-12T10:08:10+01:00"));
function fetchCityzenData(einstein_script){

    request.post({
        'content-type': 'text/plain;charset=UTF-8',
        url : cityzendata_url,
        encoding : "utf8",
        form : einstein_script
    }, function httpcallback(error, response, body){
                if (!error && response.statusCode == 200) {
                    retrieveFirstPick(JSON.parse(body));
                }
    });

}
/**
 * [retrieveFirstPick cleans the array by retrieving first pick]
 * @param  {[type]} raw_data [description]
 * @return {[type]}          [description]
 * https://api0.cityzendata.net/doc/api/gts-output-format
 */
function retrieveFirstPick(raw_data){

    var data = new Array;
    var first = true;

    // Retrieve first pick
    raw_data[0][0].v.forEach(function (element, index, array) {
        if (index!=0) {

            //console.log("TS="+element[0] +" && VALUE="+element[1]);
            
            /**
             * First if stands for the acceleration. If it decreases, 
             * we need to take the n-1 value if first is true.
             * Then a bearing is triggered, and it'll be set to true only
             * if acceleration value goes under the bearing, 
             */
            if (element[1]<array[index-1][1] && first && element[1]>data_bearing) {
                data[data.length] = [array[index-1][0],array[index-1][1]];
                first = false;
                //console.log("ajout de "+[array[index-1][0]+":"+array[index-1][1]]);
            }else{
                if (element[1]<data_bearing) {
                    first = true;
                };
            };
        };
    }); 
    console.log(data);
}



