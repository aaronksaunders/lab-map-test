Alloy.Globals.Map = require('ti.map');
var geoService = require('geoService');
var mapUtilsService = require('mapUtils');
// will use this for promises
var Q = require('q');


function doClick(e) {
    alert($.label.text);
}


function renderOnMap(_mapView, _objects) {
	
	var deferred = Q.defer();
		
	var annotationArray = [];
	
	var annotationRightButton = function() {
		return Ti.UI.createButton({title : "X"});
	};
	
	// clear the map
	_mapView.removeAllAnnotations();

	
	if ( true ) {
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
	}
	
	_mapView.setAnnotations(annotationArray);
	
	setTimeout(function(){
		return deferred.resolve(annotationArray);
	},4);

	
	return deferred.promise;
}



/**
 * Get the screen boundaries as latitude and longitude values 
 */
function getMapBounds(region) {
    var b = {};
    b.northWest = {}; b.northEast = {};
    b.southWest = {}; b.southEast = {};

    b.northWest.lat = parseFloat(region.latitude) + 
        parseFloat(region.latitudeDelta) / 2.0;
    b.northWest.lng = parseFloat(region.longitude) - 
        parseFloat(region.longitudeDelta) / 2.0;

    b.southWest.lat = parseFloat(region.latitude) - 
        parseFloat(region.latitudeDelta) / 2.0;
    b.southWest.lng = parseFloat(region.longitude) - 
        parseFloat(region.longitudeDelta) / 2.0;

    b.northEast.lat = parseFloat(region.latitude) + 
        parseFloat(region.latitudeDelta) / 2.0;
    b.northEast.lng = parseFloat(region.longitude) + 
        parseFloat(region.longitudeDelta) / 2.0;

    b.southEast.lat = parseFloat(region.latitude) - 
        parseFloat(region.latitudeDelta) / 2.0;
    b.southEast.lng = parseFloat(region.longitude) + 
        parseFloat(region.longitudeDelta) / 2.0;

    return b;
}

/**
 * 
 */
function getDistance(startCoord, endCoord) {
    var R = 6371; // km
    var dLat = (endCoord.lat - startCoord.lat) * Math.PI / 180;
    var dLon = (endCoord.lng - startCoord.lng) * Math.PI / 180;
    var lat1 = startCoord.lat * Math.PI / 180;
    var lat2 = endCoord.lat * Math.PI / 180;

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    var m = d * 0.621371;
    return {
        km: d,
        m: m
    };
}


/**
 * 
 */
function updateHandler(evt){
	var mapView = $.MapView_1;
	
	console.debug("$.MapView_1.distance.km/3.6 ",(mapView.distance.km/2) *1000);
	console.debug("$.MapView_1.distance ",mapView.distance);
	
	mapView.removeAllCircles();
		
	var circle = Alloy.Globals.Map.createCircle({
		center: {
			latitude : Number(mapView.getRegion().latitude), 
			longitude: Number(mapView.getRegion().longitude) 
		},
		radius: Number((mapView.distance.km/2) *1000), //in meters..
		fillColor: "#20FF0000",
		strokeColoe : 'grey',
		strokeWidth : .1
	});
	mapView.addCircle(circle);
 };
 
/**
 * called when the user clicks the redoQuery Button OR when a 
 * region changed event is fired... If the redo button is clicked
 * then we use the current map region, else we reset it
 * 
 */
function redoQuery(_event) {
	
	var lat, lng, bounds, distance, _currentRegion;
	
	// if i have an event then reset the region...
	if (_event.type === "regionchanged") {
		$.MapView_1.setRegion(_event);
	}
	
	_currentRegion = $.MapView_1.getRegion();
	
	bounds = getMapBounds(_currentRegion);
		
	console.debug("_currentRegion ", _currentRegion);
	console.debug("Bounds ", bounds);
	
	// get the distance of the viewable region
	distance = getDistance(bounds.northWest, bounds.northEast);
	console.log("Distance ", distance);

	// Save the distance on the map Object, we need it later when we draw the 
	// circle around the search region
	$.MapView_1.distance = distance;
	 
	lat = _currentRegion.latitude;
	lng = _currentRegion.longitude;
	
    geoService.getPlace("food", lat, lng, (distance.km * 1000)/2).then(function(_places){
    	
		return renderOnMap($.MapView_1, _places.results.results);
    }).then(function(){
    	
    	// redraw the clice on the screen
    	return Q.defer().thenResolve(updateHandler());
    	
    }, function(_error) {
    	console.log(_error);
    });
}


function handleRegionChanged(_event) {
	if (_event) {
		eventString = _event.latitude + " " + _event.longitude;
	}
	console.log("handleRegionChanged ", eventString);
	    
	redoQuery(_event);
}

$.MapView_1.addEventListener('complete', updateHandler);

$.MapView_1.addEventListener('regionchanged',handleRegionChanged);




// get the users current location and set the map 
// region appropriately
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


var API_KEY = "AIzaSyAKqHtjBz0fc0CGg0D2r1yA7nc6el2PEA8";
Ti.App.Properties.setString("Google_APIKey",API_KEY);
$.index.open();
