var myApp = angular.module('SWApp', []);
myApp.controller('punchingBallTop10Controller', function ($scope, $http) {

	$scope.top_10 = new Array();
	$scope.top_3 = new Array();
	// fetching top 10 every 10 seconds


	$scope.refresh_top = function (){
		$http.get('/punchingball/top10').
		  success(function(data, status, headers, config) {
		  	$scope.top_3 = data.slice(0,3);
		  	$scope.top_10 = data.slice(3,11);

		  	console.log($scope.top_3);
		  	console.log($scope.top_10);
		  }).
		  error(function(data, status, headers, config) {
		    // called asynchronously if an error occurs
		    // or server returns response with an error status.
		  });
	};
	$scope.refresh_top;
	setInterval($scope.refresh_top, 10*1000);
});