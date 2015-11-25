//var activityWindow = require("ActivityWindow");
var ONE_MINUTE = 60000;

// var activityWindow = new AW();

var options = {
	retryCount : 0,
	cacheSeconds : 1800,
	pruneSeconds : 2520000,
};

Ti.App.addEventListener('app.purge.cache', function(_options) {
	_prune_cache(0, _options.showAlert);
});

function InitAdapter(config) {
	db = Titanium.Database.open('http_client_cache');

	db.execute('CREATE TABLE IF NOT EXISTS REQUESTS (URL_HASH STRING, RESPONSE TEXT, UPDATED_AT INTEGER)');

	db.close();

	return {};
}

function _prune_cache(seconds, _showAlert) {
	var count,
	    row,
	    origCount;

	if (seconds == null) {
		seconds = options.pruneSeconds;
	}
	db = Titanium.Database.open('http_client_cache');
	var row = db.execute("SELECT COUNT(*) FROM REQUESTS WHERE UPDATED_AT < DATETIME('now','-" + seconds + " seconds')");
	origCount = ((row && row.rowCount !== 0) ? row.field(0) : 0);
	Ti.API.debug(' num to purge ' + origCount);

	db.execute("DELETE FROM REQUESTS WHERE UPDATED_AT < DATETIME('now','-" + seconds + " seconds')");

	row = db.execute("SELECT COUNT(*) FROM REQUESTS WHERE UPDATED_AT < DATETIME('now','-" + seconds + " seconds')");
	Ti.API.debug('remaining after purge ' + ((row && row.rowCount !== 0) ? row.field(0) : 0));

	if (_showAlert) {
		alert("Purged " + origCount + ' records from cache');
	}

	return db.close();

};

function _compute_url_hash(_options) {
	return url_hash = Ti.Utils.md5HexDigest(_options.type + _options.url + _options.data);
};

function _get_cached_response(seconds, _url_hash) {

	var cachedAt,
	    responseText,
	    row;
	db = Titanium.Database.open('http_client_cache');
	if (seconds == null) {
		seconds = options.cacheSeconds;
	}
	row = db.execute("SELECT RESPONSE, UPDATED_AT FROM REQUESTS WHERE URL_HASH=? AND UPDATED_AT > DATETIME('now','-" + seconds + " seconds')", _url_hash);
	responseText = ((row && row.rowCount !== 0) ? row.field(0) : null);
	cachedAt = ((row && row.rowCount !== 0) ? row.field(1) : null);
	row.close();
	db.close();
	if (responseText != null) {
		Ti.API.debug(' cache hits ' + _url_hash);
		return {
			responseText : responseText,
			cached : true,
			cached_at : cachedAt,
			status : 200
		};
	}
};

function _exists_in_cache(_url_hash) {

	var count,
	    row,
	    _ref;
	row = db.execute("SELECT COUNT(*) FROM REQUESTS WHERE URL_HASH=?", _url_hash);

	count = ((row && row.rowCount !== 0) ? row.field(0) : 0);
	row.close();
	return ( _ref = count > 0) != null ? _ref : {
		"true" : false
	};
};

function _save_to_cache(_response, _options) {

	var urlHash;
	if (_response.status >= 400 || _response.cached) {
		return;
	}
	db = Titanium.Database.open('http_client_cache');
	urlHash = _compute_url_hash(_options);
	if (_exists_in_cache(urlHash)) {
		Ti.API.debug('updated cache ' + urlHash);
		db.execute("UPDATE REQUESTS SET RESPONSE=?, UPDATED_AT=CURRENT_TIMESTAMP WHERE URL_HASH=?", _response.responseText, urlHash);
	} else {
		Ti.API.debug('cached ' + urlHash);
		db.execute("INSERT INTO REQUESTS (RESPONSE, URL_HASH, UPDATED_AT) VALUES (?,?,CURRENT_TIMESTAMP)", _response.responseText, urlHash);
	}
	return db.close();
};

function apiCall(_options, _callback) {

	_prune_cache();

	var urlHash = _compute_url_hash(_options);

	// Cache only if useCache is explicitly set in the model.
	// Use the ttl passed in from the model (or the default of 30 minutes set in Sync)
	if (_options.useCache && ( response = _get_cached_response(_options.ttl, urlHash))) {
		try {
			_callback({
				success : true,
				text : response.responseText || null,
				data : data = JSON.parse(response.responseText) || null
			});
			return;
		} catch (EE) {
			Ti.API.error('bad cache entry ' + _options.url);
			// trying to make the call again
		}

		if (_options.preventActivityIndicator !== true) {
			//	activityWindow.hide();
		}

	}

	var xhr = Ti.Network.createHTTPClient({
		timeout : ONE_MINUTE
	});

	// save them for later!!
	xhr.options = _options;

	//Prepare the request
	/**
	 * The URL needs to be URI encoded, because it contains JSON in the URL.
	 * Otherwise you lose control of your URL as characters get escaped and encoded differently by iOS and Android.
	 */
	xhr.open(_options.type, encodeURI(_options.url), true);
	
	//below header is for Moonlighting tiket header
	xhr.setRequestHeader("ml-ticket", Alloy.CFG.ML_TICKET);

	/// Checking if we don't want to hide the activity indicator automatically
	if (_options.maxTimeout !== null && _options.maxTimeout != undefined) {
		//activityWindow.setMaxTime(_options.maxTimeout);
	}

	xhr.onload = function() {
		//if( Alloy.Globals.displayInfoLog ) Ti.API.info(_options.url + " hide // prevent actvity check: "+ _options.preventActivityIndicator);
		//if( Alloy.Globals.displayInfoLog ) Ti.API.info("_options.preventActivityIndicator: " + _options.preventActivityIndicator);
		//if( Alloy.Globals.displayInfoLog ) Ti.API.info(JSON.stringify(_options));
		//if (_options.preventActivityIndicator !== true)
		//	activityWindow.hide();

		var data = null;

		try {
			_save_to_cache(xhr, xhr.options);
			Ti.API.debug("Line 170");
			Ti.API.debug("apiCall response Text::" + xhr.responseText);
			if(xhr.responseText){
			data = JSON.parse(xhr.responseText);
			} else {
				data = null;
				//if it's null return http status for update password different alert message
				data = {"status":  xhr.status};
			}
			
			_callback({
				success : true,
				text : xhr.responseText || null,
				data : data || null,
				//status : xhr.status,
			});

		} catch (EE) {
			Ti.API.error('Error parsing response text: ' + EE);
			Ti.API.error('Error parsing response text: ' + xhr.responseText);
			_callback({
				success : false,
				text : xhr.responseText || null,
				data : data || null
			});
		}

	};

	//Handle error
	xhr.onerror = function() {
		// Hide Loading Dialog once WS call done
		//if( Alloy.Globals.displayInfoLog ) Ti.API.info(_options.url + " hide // prevent actvity check: "+ _options.preventActivityIndicator);
		//if( Alloy.Globals.displayInfoLog ) Ti.API.info("_options.preventActivityIndicator: " + _options.preventActivityIndicator);
		//if( Alloy.Globals.displayInfoLog ) Ti.API.info(JSON.stringify(_options));
		//if (_options.preventActivityIndicator !== true)
		//	activityWindow.hide();

		_callback({
			'success' : false,
			'text' : xhr.responseText
		});
		Ti.API.error("Error Text::" + xhr.responseText);

	};
	for (var header in _options.headers) {
		xhr.setRequestHeader(header, _options.headers[header]);
	}

	if (_options.beforeSend) {
		_options.beforeSend(xhr);
	}

	//Show Loading dialog
	// If _options.preventActivityIndicator is true, we don't show the activity
	// indicator
	//if( Alloy.Globals.displayInfoLog ) Ti.API.info(_options.url + " show // prevent: "+ _options.preventActivityIndicator);
	//if( Alloy.Globals.displayInfoLog ) Ti.API.info("_options.preventActivityIndicator: " + _options.preventActivityIndicator);
	//if( Alloy.Globals.displayInfoLog ) Ti.API.info(JSON.stringify(_options));
	//if (_options.preventActivityIndicator !== true)
	//	activityWindow.show(_options.ActivityMessage || "Loading");

	Ti.API.debug('_options.url: ' + _options.url);
	Ti.API.debug('_options.type: ' + _options.type);
	Ti.API.debug('_options.data: ' + JSON.stringify(_options.data));
	Ti.API.debug('_options.headers: ' + JSON.stringify(_options.headers));
	Ti.API.debug('_options.contentType: ' + JSON.stringify(_options.contentType));

	try {
		if (_options.type == "GET") {
			xhr.send();
		} else {
			xhr.send(_options.data || {});
		}

	} catch(EE) {
		// looking for exceptions here

	}
}

function Sync(method, model, opts) {

	// Check for a flag indicating whether or not to use the cache (defaults to no).
	// This property can be set on the entire model (model.config.useCache),
	// or passed on a per-API call basis (opts.useCache)
	opts.useCache = model.config.useCache || opts.useCache || false;

	// Check for a flag called ttl and use that as the cacheSeconds.
	// Otherwise, default to 1800 seconds (30 minutes)
	opts.ttl = model.config.ttl || opts.ttl || 1800;

	/// Allowing developers to prevent activity indicator to be shown.
	// var preventActivityIndicator = opts.preventActivityIndicator;
	// opts.preventActivityIndicator && delete opts.preventActivityIndicator;

	var methodMap = {
		'create' : 'POST',
		'read' : 'GET',
		'update' : 'PUT',
		'delete' : 'DELETE'
	};

	var type = methodMap[method];
	var params = _.extend({}, opts);

	// allow the user to pass in the method type
	params.type = params.type || type;

	//set default headers
	params.headers = params.headers || {};

	// We need to ensure that we have a base url.
	if (!params.url) {
		params.url = model && model.url && model.url();
		if (!params.url) {
			Ti.API.debug("fetch ERROR: NO BASE URL");
			return;
		}
	}

	// For older servers, emulate JSON by encoding the request into an HTML-form.
	if (Alloy.Backbone.emulateJSON) {
		params.contentType = 'application/x-www-form-urlencoded';
		params.processData = true;
		params.data = params.data ? {
			model : params.data
		} : {};
	}

	// For older servers, emulate HTTP by mimicking the HTTP method with
	// `_method`
	// And an `X-HTTP-Method-Override` header.
	if (Alloy.Backbone.emulateHTTP) {
		if (type === 'PUT' || type === 'DELETE') {
			if (Alloy.Backbone.emulateJSON)
				params.data._method = type;
			params.type = 'POST';
			params.beforeSend = function(xhr) {
				params.headers['X-HTTP-Method-Override'] = type;
			};
		}
	}

	//json data transfers ONLY SET IF iPhone
	/**
	 * Commenting out the following line of code.
	 * Otherwise you end up with the following error:
	 * [ERROR] : "Unable to parse JSON string"
	 */
	//!Ti.Android && (params.headers['Content-Type'] = "application/json; charset=utf-8");

	/*
	 *
	 */
	var callbackOptions = function(_resp) {
		if (_resp.success) {
			params.success(_resp.data || _resp.text, _resp.text);
		} else {
			try {
				params.error(JSON.parse(_resp.text), _resp.text);
			} catch (EE) {
				params.error({}, _resp.text);
			}
			Ti.API.debug("ERROR" + _resp.text);
			model.trigger("error");
		}
	};

	if (opts.JSON) {
		params.data = model.toJSON();
	} else if (!opts.data && model && (method == 'create' || method == 'update')) {
		// comment, this might have to be configurable
		params.data = JSON.stringify(model.toJSON());
	} else if (opts.data && type !== "POST") {
		// add any of the extras as parameters on the URL,
		// this content should be JSON objects converted
		// to strings
		var query = "";
		for (var i in opts.data) {
			query += i + "=" + opts.data[i] + "&";
		}

		// add the params, remove trailing "&"
		params.url += "?" + query.substring(0, query.length - 1);

		Ti.API.debug('THE URL ' + params.url);
		// no data, it is all on URL
		params.data = null;
	} else {
		params.data = opts.data || model.toJSON();
	}

	switch (method) {
	case "delete":
	case "update":

		apiCall(params, function(_r) {
			callbackOptions(_r);
			_r ? model.trigger("fetch change sync") : model.trigger("error");
		});
		break;
	case "create":
		apiCall(params, function(_r) {
			callbackOptions(_r);
			_r ? model.trigger("fetch sync") : model.trigger("error");
		});
		break;
	case "read":
		apiCall(params, function(_r) {
			callbackOptions(_r);
			_r ? model.trigger("fetch sync") : model.trigger("error");
		});
		break;
	}

};

//we need underscore
var _ = require("alloy/underscore")._;

module.exports.sync = Sync;

module.exports.beforeModelCreate = function(config) {
	config = config || {};
	InitAdapter(config);
	return config;
};

module.exports.afterModelCreate = function(Model) {
	Model = Model || {};
	Model.prototype.config.Model = Model;
	return Model;
};
