Alloy.Globals.Map = require('ti.map');


// will use this for promises
var Q = require('q');

// API KEY used for testing the application, the geoService API
// is expecting to find the key there.
var API_KEY = "AIzaSyAKqHtjBz0fc0CGg0D2r1yA7nc6el2PEA8";
Ti.App.Properties.setString("Google_APIKey", API_KEY);

// geoService from original moonlighting project
var geoService = require('geoService');


// the current distance showing on the mapView, this is used
// when rendering the circle on the map and calculating where
// to query for objects
var currentDistanceValue = 0;

/**
 * renders the map with the associated annotations.
 *
 * @param _mapView {Ti.UI.MapView}
 * @param _objects {Array} - the results from the google places API query
 *
 * @returns {Promise}
 */
function renderOnMap(_mapView, _objects) {

    var deferred = Q.defer();

    var annotationArray = [];

    var annotationRightButton = function() {
        return Ti.UI.createButton({
            title : "X"
        });
    };

    // clear the map
    _mapView.removeAllAnnotations();

    // loop through and create annotations
    for (var i in _objects) {

        var mapData = _objects[i];
        var coords = mapData.geometry.location;

        var annotation = Alloy.Globals.Map.createAnnotation({
            latitude : Number(coords.lat),
            longitude : Number(coords.lng),
            subtitle : mapData.vicinity,
            title : mapData.name,
            //animate : true,
            data : mapData
        });
        if (OS_IOS) {
            annotation.setPincolor(Alloy.Globals.Map.ANNOTATION_RED);
            annotation.setRightButton(Titanium.UI.iPhone.SystemButton.DISCLOSURE);
        } else {
            annotation.setRightButton(annotationRightButton);
        }
        annotationArray.push(annotation);
    };

    _mapView.setAnnotations(annotationArray);

    setTimeout(function() {
        return deferred.resolve(annotationArray);
    }, 4);

    return deferred.promise;
}

/**
 * Get the screen boundaries as latitude and longitude values. This is a utility
 * function that should be moved to the geoServices library
 *
 * @param region {Object}
 *
 * @returns {Object} returns the coords for the northWest,northEast,southWest, southEast
 *                  locations in the current mapView
 *
 * @TODO - Move to geoServices library
 */
function getMapBounds(region) {
    var b = {};
    b.northWest = {};
    b.northEast = {};
    b.southWest = {};
    b.southEast = {};

    b.northWest.lat = parseFloat(region.latitude) + parseFloat(region.latitudeDelta) / 2.0;
    b.northWest.lng = parseFloat(region.longitude) - parseFloat(region.longitudeDelta) / 2.0;

    b.southWest.lat = parseFloat(region.latitude) - parseFloat(region.latitudeDelta) / 2.0;
    b.southWest.lng = parseFloat(region.longitude) - parseFloat(region.longitudeDelta) / 2.0;

    b.northEast.lat = parseFloat(region.latitude) + parseFloat(region.latitudeDelta) / 2.0;
    b.northEast.lng = parseFloat(region.longitude) + parseFloat(region.longitudeDelta) / 2.0;

    b.southEast.lat = parseFloat(region.latitude) - parseFloat(region.latitudeDelta) / 2.0;
    b.southEast.lng = parseFloat(region.longitude) + parseFloat(region.longitudeDelta) / 2.0;

    return b;
}

/**
 * calculate the distance between two coordinates. The object has two values, lat,lng
 * @param startCoord {Object}
 * @param endCoord {Object}
 *
 * @returns {Object} - contains distance in km and miles
 */
function getDistance(startCoord, endCoord) {
    var R = 6371;
    // km
    var dLat = (endCoord.lat - startCoord.lat) * Math.PI / 180;
    var dLon = (endCoord.lng - startCoord.lng) * Math.PI / 180;
    var lat1 = startCoord.lat * Math.PI / 180;
    var lat2 = endCoord.lat * Math.PI / 180;

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    var m = d * 0.621371;
    return {
        km : d,
        m : m
    };
}

/**
 * draws the circle on the map after the region has changed and the new annotations are plotted
 *
 * uses global variable `currentDistance`
 *
 */
function updateHandlerToDrawCircle(evt) {
    var mapView = $.MapView_1;

    currentDistanceValue && console.debug("currentDistanceValue.km/2 ", (currentDistanceValue.km / 2) * 1000);
    currentDistanceValue && console.debug("currentDistanceValue ", currentDistanceValue);

    mapView.removeAllCircles();

    if (currentDistanceValue) {

        var circle = Alloy.Globals.Map.createCircle({
            center : {
                latitude : Number(mapView.getRegion().latitude),
                longitude : Number(mapView.getRegion().longitude)
            },
            radius : Number((currentDistanceValue.km / 2) * 1000), //in meters..
            fillColor : "#20FF0000",
            strokeColoe : 'grey',
            strokeWidth : .1
        });
        mapView.addCircle(circle);
    }
};

/**
 * called when the user clicks the redoQuery Button OR when a
 * region changed event is fired... If the redo button is clicked
 * then we use the current map region, else we reset it
 *
 */
function redoQuery(_event) {

    var lat,
        lng,
        bounds,
        _currentRegion;

    // if i have an event then reset the region... was doing this on IOS but
    // caused issues on Android so it is commented out until I do further testing
    if (_event.type === "regionchanged") {
        //$.MapView_1.setRegion(_event);
    }

    _currentRegion = $.MapView_1.getRegion();

    bounds = getMapBounds(_currentRegion);

    // get the currentDistanceValue of the viewable region
    currentDistanceValue = getDistance(bounds.northWest, bounds.northEast);
    console.log("currentDistanceValue ", currentDistanceValue);

    lat = _currentRegion.latitude;
    lng = _currentRegion.longitude;

    // find places...
    geoService.getPlace("food", lat, lng, (currentDistanceValue.km * 1000) / 2).then(function(_places) {
        console.log("query data " + _places.results.results.length);
        return renderOnMap($.MapView_1, _places.results.results);
    }).then(function() {

        // redraw the clice on the screen
        return Q.defer().thenResolve(updateHandlerToDrawCircle());

    }, function(_error) {
        console.error(_error);

        alert("Error: " + _error.error);
    });
}

/**
 * called when the map region is changed, this will trigger a new
 * query
 *
 * @param {Object} _event
 */
function handleRegionChanged(_event) {
    if (_event) {
        eventString = _event.latitude + " " + _event.longitude;
    }
    console.debug("handleRegionChanged ", eventString);

    return redoQuery(_event);
}


/**
 * 
 * @param {Object} _event
 */
function handleMapClick(_event) {
	
}



// START THE APPLICATON
// ----------------------------------------------------------------------------

// get the users current location and set the map region appropriately
// to get the application started up!

function initializeMap() {
	

// SET THE EVENT LISTENERS
// ----------------------------------------------------------------------------

	// need when on IOS to redraw the circle when map is done rendering
	$.MapView_1.addEventListener('complete', updateHandlerToDrawCircle);
	
	// fired when the map region has changed
	$.MapView_1.addEventListener('regionchanged', handleRegionChanged);
	
	// fired when the map region has been clicked
	$.MapView_1.addEventListener('click', handleMapClick);
	
	
	
	geoService.getCurrentLocation().then(function(_location) {
	
	    console.log("getCurrentLocation - success:", _location);
	
	    // set the region around the photo
	    $.MapView_1.setRegion({
	        latitude : _location.location.latitude,
	        longitude : _location.location.longitude,
	        latitudeDelta : 0.030,
	        longitudeDelta : 0.040
	    });
	}, function(_error) {
	    console.log("getCurrentLocation", _error);
	});
}


var jobs = Alloy.createCollection('JobsLocal');

// setting global for testing purposes
Alloy.Globals.currentUserId  = 154;


function getJobsForMap() {
	
	var deferred = Q.defer();
	   
	jobs.fetchWithOptions({
		success : function(_collection, _response) {
			Ti.API.info('_collection ' + _collection);
			deferred.resolve({response : _collection});
		},
		error: function (_error, _response) {
			Ti.API.error(_error);
			deferred.reject({error : _error});
		}
	});
	
	return deferred.promise;
}


getJobsForMap().then(function(_data){
	var firstOne = _data.response.models[0];
	
	Ti.API.info('firstOne ', firstOne.attributes);
	
}, function(_error){
	
});

$.index.open();
