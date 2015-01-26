var myApp = angular.module('SWApp', []);
myApp.controller('punchingBallTop10Controller', function ($scope, $http) {

	$scope.top_10 = new Array();
	// fetching top 10 every 10 seconds
	setInterval(function () {
		$http.get('/punchingball/top10').
		  success(function(data, status, headers, config) {
		  	$scope.top_10 = data;
		  }).
		  error(function(data, status, headers, config) {
		    // called asynchronously if an error occurs
		    // or server returns response with an error status.
		  });

	}, 10*1000);
});