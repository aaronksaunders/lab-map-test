Alloy.Globals.Map = require('ti.map');
var geoService = require('geoService');

function doClick(e) {
    alert($.label.text);
}

function redoQuery() {
    alert("Redo The Query");
}

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
