
/**
 * @TODO Uncomment out the global user id
 *
 * 
* REQUIRES
* Alloy.CFG.MOONLIGHT_BASE_URL
* Alloy.Globals.currentUserId
* 
* */


// will use this for promises
var Q = require('q');

var deferred = Q.defer();
var url = Alloy.CFG.MOONLIGHT_BASE_URL;
exports.definition = {
    config : {
        adapter : {
            type : "restapi",
        }
    },
    extendModel : function(Model) {
        
        _.extend(Model.prototype, {
            url : function(){ 
            	return url + '/job/state/NEW/scope/LOCAL/user/' + 2/*Alloy.Globals.currentUserId*/+ "?pageNum=0&pageSize=10";
            }
           
        });
        return Model;
    },
    extendCollection : function(Collection) {
        _.extend(Collection.prototype, {
            url : function(){ 
            	return url + '/job/state/NEW/scope/LOCAL/user/' + 2/*Alloy.Globals.currentUserId*/+ "?pageNum=0&pageSize=10";
            },

            parse : function(_response) {
                try { 
                    var models = [];
                    for (var i in _response) {
                        var model = _response[i];
                        model._id = i;
                        models.push(model);
                    };
                    return models;
                } catch(EE) {
                    Ti.API.error('Error Parsing Location Response');
                    Ti.API.error(response);
                    return {};
                }
            },
            
            fetchWithOptions : function(_options){
            	console.log("fetch with options ", _options);
            	var model = this;
            	_options.url = url 
            				 + '/job/state/NEW/scope/LOCAL/user/' 
            				 + Alloy.Globals.currentUserId 
            				 + "?pageNum=" 
            				 + (_options.pageNum || 0)
            				 + "&pageSize=" + 
            				 + (_options.pageSize || 10);
            	model.fetch(_options);
            }
        });

        return Collection;
    }
};