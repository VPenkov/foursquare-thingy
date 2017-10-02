'use strict';

/**
 * All-public URL handler class
 */
var URLUtils = {

    /**
     * Appends a single parameter to a URL
     * @param {String} url - the URL
     * @param {String} name - the param name
     * @param {String} value - the param value
     */
    appendParamToURL: function(url, name, value) {
        var separator;

        // bail if the param already exists
        if (url.indexOf(name + '=') !== -1) {
            return url;
        }

        separator = url.indexOf('?') !== -1 ? '&' : '?';

        return url + separator + name + '=' + encodeURIComponent(value);
    },

    /**
     * Takes a URL and an object with parameters and appends the params to the URL
     * @param {String} url - the URL
     * @param {Object} params - an object containing parameter name:value pairs
     */
    appendParams: function(url, params) {
        var parsedUrl = url;

        for (var i in params) {
            parsedUrl = this.appendParamToURL(parsedUrl, i, params[i]);
        }

        return parsedUrl;
    }
};

/**
 * Basic Ajax handler.
 */
var Ajax = (function() {

    function get(options) {
        var request, url;
        if (!options || !options.url) {
            throw new Error('Ajax.get() needs an "options" object with a "url" property.');
        }

        options.success = options.success || function() {};
        options.params = options.params || {};
        url = URLUtils.appendParams(options.url, options.params);

        request = new XMLHttpRequest();
        request.open('GET', url, true);

        request.onload = function() {
            options.success(request);
        };
 
        request.onerror = options.error || function(error) {
            throw new Error(JSON.stringify(error));
        };

        request.send();
    }
    
    // Public API
    return {
        get: get
    }
}());

/**
 * Google Maps wrapper
 */
var GoogleMaps = (function() {
    var mapInstance;
    var MAP_CONTAINER = document.querySelector('.js-map');
    var API_KEY = 'AIzaSyAyQ3ELRKDAlnC5UEpAm2UPnWUIBpN6ihE';
    var SETTINGS = {
        center: {
            lat: 52.376356,
            lng: 4.905937
        },
        fullscreenControl: false,
        mapTypeControl: false,
        scrollwheel: false,
        streetViewControl: false,
        zoom: 14
    }

    /**
     * Map initializer.
     * Creates a DOM node, then sends a callback method name as a URI parameter.
     * Callback needs to be a global method.
     */
    function init() {
        window.googleMapCallback = function() {
            mapInstance = window.google.maps;
            
            new mapInstance.Map(MAP_CONTAINER, SETTINGS);
        };

        var mapNode = document.createElement('script');
        mapNode.src = '//maps.googleapis.com/maps/api/js?callback=googleMapCallback&key=' + API_KEY;
        document.body.appendChild(mapNode);
    }

    // Public API
    return {
        init: init
    }
}());

var Foursquare = (function() {
    var accessToken;
    var CLIENT_ID = 'CMLELAZKKVF3DUWDTABSU01U4DUYLM2DTTPKOSWWU15N25MR';
    var APP_URL = 'https://4s.vergilpenkov.com/';

    /**
     * Gets the access token for Foursquare.
     */
    function getAccessToken() {
    }

    /**
     * Displays the login button and binds event listeners
     */
    function showLogin() {
        var loginButton = document.querySelector('.js-login-button');
        loginButton.removeAttribute('hidden');
        loginButton.setAttribute('href', REDIRECT_URL);
    }

    /**
     * Initialize the Foursquare functionality.
     * Show the login button if user doesn't have an access token.
     */
    function init() {
        accessToken = getAccessToken();
        
        if (accessToken) {
            getNearbyVenues();
            return;
        }

        showLogin();
    }
    
    function getNearbyVenues() {}

    // Public API
    return {
        init: init
    };
}());

document.addEventListener('DOMContentLoaded', function() {
    Foursquare.init();
});
