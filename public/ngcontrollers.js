var myApp = angular.module('SWApp', []);

myApp.constant('YT_event', {
  STOP:            0, 
  PLAY:            1,
  PAUSE:           2,
  STATUS_CHANGE:   3
});

myApp.controller('punchingBallController', function($scope, YT_event,$http) {
  //initial settings
  $scope.yt = {
    width: 300, 
    height: 240, 
    videoid: "aJFsQfhbKCU",
    playerStatus: "NOT PLAYING"
  };
  $scope.top_3 = new Array();
  $scope.i = 0;
  $scope.punch = 0;

  $scope.YT_event = YT_event;

  $scope.sendControlEvent = function (ctrlEvent) {
    this.$broadcast(ctrlEvent);
  }

  $scope.$on(YT_event.STATUS_CHANGE, function(event, data) {
      $scope.yt.playerStatus = data;
      if (data=='ENDED') {
          var mod = $scope.top_3.length;
          console.log(mod);
          console.log($scope.i);
          console.log($scope.top_3[$scope.i][2]);
          $scope.i = ($scope.i+1)%mod;
          $scope.yt.videoid = $scope.top_3[$scope.i][2];
          $scope.punch = $scope.top_3[$scope.i][1];
          $scope.sendControlEvent(YT_event.PLAY);
      };
  });
$scope.refresh_top = function (){
    $http.get('/punchingball/top10').
      success(function(data, status, headers, config) {
        $scope.top_3 = data;
      }).
      error(function(data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
      });
  };
  $scope.refresh_top;
  setInterval($scope.refresh_top, 4*1000);
});

myApp.directive('youtube', function($window, YT_event) {
  return {
    restrict: "E",

    scope: {
      height: "@",
      width: "@",
      videoid: "@"
    },

    template: '<div></div>',

    link: function(scope, element, attrs, $rootScope) {
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      var player;

      $window.onYouTubeIframeAPIReady = function() {

        player = new YT.Player(element.children()[0], {
          playerVars: {
            autoplay: 1,
            html5: 1,
            theme: "light",
            modesbranding: 0,
            color: "white",
            iv_load_policy: 3,
            showinfo: 0,
            controls: 0
          },
          
          height: scope.height,
          width: scope.width,
          videoId: scope.videoid, 

          events: {
            'onStateChange': function(event) {
              
              var message = {
                event: YT_event.STATUS_CHANGE,
                data: ""
              };
              
              switch(event.data) {
                case YT.PlayerState.PLAYING:
                  message.data = "PLAYING";
                  break;
                case YT.PlayerState.ENDED:
                  message.data = "ENDED";
                  break;
                case YT.PlayerState.UNSTARTED:
                  message.data = "NOT PLAYING";
                  break;
                case YT.PlayerState.PAUSED:
                  message.data = "PAUSED";
                  break;
              }

              scope.$apply(function() {
                scope.$emit(message.event, message.data);
              });
            }
          } 
        });
      };

      scope.$watch('height + width', function(newValue, oldValue) {
        if (newValue == oldValue) {
          return;
        }
        
        player.setSize(scope.width, scope.height);
      
      });

      scope.$watch('videoid', function(newValue, oldValue) {
        if (newValue == oldValue) {
          return;
        }
        
        player.cueVideoById(scope.videoid);
      
      });

      scope.$on(YT_event.STOP, function () {
        player.seekTo(0);
        player.stopVideo();
      });

      scope.$on(YT_event.PLAY, function () {
        player.playVideo();
      }); 

      scope.$on(YT_event.PAUSE, function () {
        player.pauseVideo();
      });  

    }  
  };
});