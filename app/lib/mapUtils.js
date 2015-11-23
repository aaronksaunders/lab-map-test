
var baseURL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={0},{1}&radius={2}&key={3}";
var API_KEY = "AIzaSyAKqHtjBz0fc0CGg0D2r1yA7nc6el2PEA8";


// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}
