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
        var request = request = new XMLHttpRequest();
        options.success = options.success || function() {};
        options.params = options.params || {};
        var url = URLUtils.appendParams(options.url, options.params);

        
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
