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
    cityzendata_class = config.cityzendata.classname;

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
        "'"+"0 ->MAP"+"'\n"+
        "'"+start+"'\n"+
        "'"+stop+"'\n"+
        "'"+"5 ->LIST"+"'\n"+
        "'"+"FETCH"+"'\n";
    return script;
}