$(function ()
{
    var socket = io();

    var tweets = $('#tweets');

    console.log('loaded');


    socket.on('tweet', function (data)
    {
        console.log('tweet received');
        var domTweet = '<li><div class="tweet">' +
            '<div class="pic">' +
            '<img src="' + data.user.image + '" />' +
            '</div>' +
            '<div class="content">' +
            '<h1>' + data.user.name + '</h1>' +

            '<p><span>@' + data.user.screen_name + '</span>&nbsp;-&nbsp;' + data.text + '</p>' +
            '<div class="underline"></div>' +
            '</div>' +
            '</div></li>';

        tweets.prepend(domTweet);

        if (tweets.find('li').size() > 10)
        {
            tweets.find('li:last').remove();
        }
    });

    socket.on('battle', function (data)
    {
        console.log(data);
        var max = 0,
            hashArr = [];

        $.each(data, function (k, v)
        {
            max = Math.max(max, v);
            hashArr.push({hash: k, value: v});
        });

        hashArr.sort(function (a, b)
        {
            return b.value - a.value;
        });

        var ranking = $('#ranking');
        ranking.empty();

        var i = 0;
        $.each(hashArr, function (i, v)
        {
            console.log(v);
            var tmp = $('<div class="rank"></div>');
            tmp.append( '<span class="index"><span>' + (i+1) + '</span></span>' );
            tmp.append( '<span class="hash">#' + v.hash + '</span>' );
            tmp.append( '<span class="score">' + v.value + '</span>' );
            tmp.append( '<div class="underline"></div>' );

            ranking.append(tmp);
        });
    });
    socket.on('punchingBall', function (data)
    {
    
    });
});
