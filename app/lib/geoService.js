/**
 * geo location service
 * this service provide getting current user location and
 * near place information using google place api call
 * !!! need to set google api key in tiapp.xml property!!!
 * ex) <property name="Google_APIKey">your google api server key</property>
 */

// will use this for promises
var Q = require('q');

/**
 * gets the current location of the user
 *
 * @returns {Promise}
 */
function getCurrentLocation() {

	var deferred = Q.defer();

	if (!Ti.Geolocation.getLocationServicesEnabled()) {
		alert('Location Services are not enabled');
		deferred.reject({
			location : null,
			message : 'Location Services are not enabled'
		});

	} else {

		Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_HIGH; //ACCURACY_HIGH;
		Ti.Geolocation.distanceFilter = 10;
		//Ti.Geolocation.trackSignificantLocationChange = true;
		Ti.Geolocation.addEventListener('location', function listener(_location) {
			
			// remove event handler since event was received
			Ti.Geolocation.removeEventListener('location', listener);
			
			locationCallbackHandler(_location, deferred);
			
		});
	}

	return deferred.promise;
};

/**
 * @param {Object} _location
 * @param {Object} _deferred
 */
function locationCallbackHandler(_location, _deferred) {

	// process the results
	if (!_location.error && _location && _location.coords) {

		_deferred.resolve({
			location : _location.coords,
			message : null
		});

	} else {
		alert('Location Services Error: ' + _location.error);

		_deferred.reject({
			location : null,
			message : _location.error
		});

	}
}

/**
 *
 * converts the current location in to a string for display. returns
 * the title, address and original coordinates when promise is resolved
 * successfully
 *
 * @param {Object} _lat
 * @param {Object} _lng
 *
 * @returns {Promise}
 */
function reverseGeocoder(_lat, _lng) {
	var title;
	var deferred = Q.defer();

	// callback method converting lat lng into a location/address
	Ti.Geolocation.reverseGeocoder(_lat, _lng, function(_data) {
		if (_data.success) {
			Ti.API.debug("reverseGeo " + JSON.stringify(_data, null, 2));
			var place = _data.places[0];
			if (place.city === "") {
				title = place.address;
			} else {
				title = place.street + " " + place.city;
			}
			deferred.resolve({
				title : title,
				place : place,
				location : {
					latitude : _lat,
					longitude : _lng,
				}
			});
		} else {
			title = "No Address Found: " + _lat + ", " + _lng;
			deferred.reject({
				title : title,
				location : {
					latitude : _lat,
					longitude : _lng,
				}
			});
		}

	});
	return deferred.promise;
}

/*
 * get google places list withith 30mi from user's current location and type
 * 20 items
 *  ex: https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=38.899227,-77.027969&radius=48300&types=hospital&key=AIzaSyA1dZV49G9hkeacYcnw92afPqA6RRqaSeM
 * @params : type : name of place type(ex: hospital, restaurant), latitude, longitude
 * //sort by distance : rankby=distance 
 */
function getPlace(type, latitude, longitude, _distance) {

	var deferred = Q.defer();
	
	// default to 5 mile radius
	var distInRadians = (_distance ? (_distance / 3959) : 0.00126);
	
	//can't display more than 20 items: http://stackoverflow.com/questions/6965847/obtaining-more-than-20-results-with-google-places-api 
	var url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?max-results=50&radius="+ distInRadians +"&location=" + latitude + "," + longitude + "&types=" + type + "&key=" + Ti.App.Properties.getString("Google_APIKey");
	
	var client = Ti.Network.createHTTPClient({
		// function called when the response data is available
		onload : function(e) {

			var json = JSON.parse(this.responseText);

			deferred.resolve({
				success : e,
				results : json
			});

		},
		// function called when an error occurs, including a timeout
		onerror : function(err) {
			deferred.reject({
				error : err,
				results : err.error
			});

			Ti.API.info("err: " + e.error);
		}
	});
	client.open("GET", url);
	client.send();
	return deferred.promise;

}

/*
 * get place detail information using google place api
 * placeId : google place api specific place id to get detail information
 */
function getPlaceDetail(placeId){
	var deferred = Q.defer();
	
	var url = "https://maps.googleapis.com/maps/api/place/details/json?placeid=" + placeId + "&key=" + Ti.App.Properties.getString("Google_APIKey");
	
	var client = Ti.Network.createHTTPClient({
		// function called when the response data is available
		onload : function(e) {

			var json = JSON.parse(this.responseText);

			deferred.resolve({
				success : e,
				results : json
			});

		},
		// function called when an error occurs, including a timeout
		onerror : function(err) {
			deferred.reject({
				error : err,
				results : err.error
			});

			Ti.API.info("err: " + e.error);
		}
	});
	client.open("GET", url);
	client.send();
	return deferred.promise;	
}


/*
 * google geocode api
 * param : address
 * sample : 1600+Amphitheatre+Parkway,+Mountain+View,+CA
 */
function getGeocoding(address){
	var deferred = Q.defer();
	var url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + address  +"&key=" +  Ti.App.Properties.getString("Google_APIKey");
	var client = Ti.Network.createHTTPClient({
		onload : function(e) {
			var json = JSON.parse(this.responseText);
			deferred.resolve(json);
		},
		onerror : function(err) {
			deferred.reject(err);
			Ti.API.info("err: " + e.error);
		}
	});
	client.open("GET", url);
	client.send();
	return deferred.promise;	
}

/*
 * google geocode api
 * param : input
 * sample : 1600+Amphitheatre+Parkway,+Mountain+View,+CA
 * https://maps.googleapis.com/maps/api/place/autocomplete/output?json
 * //TODO : request client to enable google ? or just use geocoding api with display all list below search
 */
function getAutoCompleteLocation(_params){
	var deferred = Q.defer();
	var url = "https://maps.googleapis.com/maps/api/place/autocomplete/output?json&input="+ _params.input + "&key=" +  Ti.App.Properties.getString("Google_APIKey");
	//var url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + address  +"&key=" +  Ti.App.Properties.getString("Google_APIKey");
	var client = Ti.Network.createHTTPClient({
		onload : function(e) {
			var json = JSON.parse(this.responseText);
			deferred.resolve(json);
		},
		onerror : function(err) {
			deferred.reject(err);
			Ti.API.info("err: " + e.error);
		}
	});
	client.open("GET", url);
	client.send();
	return deferred.promise;	
}

// functions exposed by this module
exports.reverseGeocoder = reverseGeocoder;
exports.getCurrentLocation = getCurrentLocation;
exports.getPlace = getPlace;
exports.getPlaceDetail = getPlaceDetail;
exports.getGeocoding = getGeocoding;
