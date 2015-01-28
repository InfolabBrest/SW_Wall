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
    cityzendata_class_punchingball = config.cityzendata.classname_punchingball,
    request = require('request'),
    urlencode = require('urlencode'),
    data_bearing = config.cityzendata.bearing,
    top_10 = new Array(),
    fs = require('fs'),
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
 * CityzenData Functions
 ************************************************************************************************************************/

/**
 * [creates the Einstein request]
 */
fs.readFile('script.einstein', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
    einstein_raw_script = data;
    einstein_raw_script = einstein_raw_script.replace("_TOKEN_",cityzendata_token);

    fetchCityzenData(cityzendata_class_punchingball,1000000);
});

/**
 * [fetchCityzenData fetch Cityzen API]
 * @param  {[type]} start [start in sec]
 * @param  metric name
 */
function fetchCityzenData(metric,start){

    var script = einstein_raw_script;

    script = script.replace("_CLASS_",metric);
    script = script.replace("_TIME_",start*1000);

    request.post({
        'content-type': 'text/plain;charset=UTF-8',
        url : cityzendata_url,
        encoding : "utf8",
        form : script
    }, function httpcallback(error, response, body){
                if (!error && response.statusCode == 200) {
                    retrieveIntegralValue(JSON.parse(body));
                }
    });

}


/**
<<<<<<< HEAD
 * retrieve value of the integrale and first TS
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
function retrieveIntegralValue(data){

    // return [TS,VALUE]
    return [data[0][0].v[0][0],data[0][0].v[data[0][0].v.length-1][1]]

}

/**
=======
>>>>>>> 93a233d... addinf fetching function with new einstein script
 * Warning: USELESS FUNCTION
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
    sortingArray(data);
}

function test_top10_value(){
    top_10.push([12345678910, 99999 ]);
}

/**
 * This function is handling the contest between candidates.
 * Top 10 is in the array named top_10
 * @param  {[type]} data [description]
 */
function sortingArray(data){

    test_top10_value();

    var temp = top_10.concat(data);
    
    temp.sort(function compare(a, b) {
          if (a[1]<b[1])
             return 1;
          if (a[1]>b[1])
             return -1;
          // a doit être égal à b
          return 0;
    });

    top_10=temp.slice(0,11);
    console.log(top_10);
}

/************************************************************************************************************************
 * Routing function for PunchingBall
 ************************************************************************************************************************/

app.get('/punchingball/top10', function (req, res) {
  res.send(top_10);
})