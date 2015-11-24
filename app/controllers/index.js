Alloy.Globals.Map = require('ti.map');

var API_KEY = "AIzaSyAKqHtjBz0fc0CGg0D2r1yA7nc6el2PEA8";
Ti.App.Properties.setString("Google_APIKey", API_KEY);


var geoService = require('geoService');
var mapUtilsService = require('mapUtils');
// will use this for promises
var Q = require('q');

var currentDistanceValue = 0;

function doClick(e) {
    alert($.label.text);
}

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

    if (true) {
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

    setTimeout(function() {
        return deferred.resolve(annotationArray);
    }, 4);

    return deferred.promise;
}

/**
 * Get the screen boundaries as latitude and longitude values
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
 *
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
 *
 */
function updateHandler(evt) {
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

    // if i have an event then reset the region...
    if (_event.type === "regionchanged") {
        //$.MapView_1.setRegion(_event);
    }

    _currentRegion = $.MapView_1.getRegion();

    bounds = getMapBounds(_currentRegion);

    // console.debug("_currentRegion ", _currentRegion);
    // console.debug("Bounds ", bounds);

    // get the currentDistanceValue of the viewable region
    currentDistanceValue = getDistance(bounds.northWest, bounds.northEast);
    console.log("currentDistanceValue ", currentDistanceValue);

    lat = _currentRegion.latitude;
    lng = _currentRegion.longitude;

    geoService.getPlace("food", lat, lng, (currentDistanceValue.km * 1000) / 2).then(function(_places) {
        console.log("query data " + _places.results.results.length);
        return renderOnMap($.MapView_1, _places.results.results);
    }).then(function() {

        // redraw the clice on the screen
        return Q.defer().thenResolve(updateHandler());

    }, function(_error) {
        console.error(_error);
        
        alert("Error: " + _error.error);
    });
}

function handleRegionChanged(_event) {
    if (_event) {
        eventString = _event.latitude + " " + _event.longitude;
    }
    console.log("handleRegionChanged ", eventString);

    return redoQuery(_event);
}

$.MapView_1.addEventListener('complete', updateHandler);

$.MapView_1.addEventListener('regionchanged', handleRegionChanged);

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


$.index.open();
