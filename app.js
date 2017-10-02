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
 * Read/write component for cookies.
 * Heavily borrowed from Peter-Paul Koch.
 * See {@link https://www.quirksmode.org/js/cookies.html QuirksMode}
 */
var Cookies = (function() {
    /**
     * Generates an expiration value for a cookie
     * @param {String} days - the amount of days
     * @return {String} - the expiration value
     */
    function createCookieExpirationValue(days) {
        var date;
        if (!days) {
            return '';
        }

        date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        return '; expires=' + date.toGMTString();
    }

    /**
     * Creates a cookie
     * @param {String} name - the cookie's name
     * @param {String} value - the cookie's value
     * @param {Number} days - expire after this many days
     */
    function createCookie(name, value, days) {
        var expires = createCookieExpirationValue(days);
        name = encodeURIComponent(name);
        value = encodeURIComponent(value);

        document.cookie = name + '=' + value + expires + '; path=/';
    }

    /**
     * Fetches a cookie by name
     * @param {String} name - the cookie's name
     * @returns {?String} - the cookie
     */
    function readCookie(name) {
        var cookie;
        var cookieName = encodeURIComponent(name) + '=';
        var siteCookies = document.cookie.split(';');

        for (var i = 0; i < siteCookies.length; i++) {
            cookie = siteCookies[i];

            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1, cookie.length);
            }

            if (cookie.indexOf(cookieName) === 0) {
                return decodeURIComponent(
                    cookie.substring(cookieName.length, cookie.length)
                );
            }
        }

        return null;
    }

    // Public API
    return {
        createCookie: createCookie,
        readCookie: readCookie
    };
}());

/**
 * Basic Ajax handler.
 */
var Ajax = (function() {
    
    /**
     * Convenience AJAX get method on top of XHR.
     * @param {Object} options {
     *   url {String}: the URL to get from,
     *   params {Object}: parameter key-value pairs,
     *   data {Object}: {
     *     oauth_token {String}: the access token,
     *     v {Number}: The version in format YYYYMMDD
     *   }
     *   success {Function}: a callback function on success,
     *   error {Function}: a callback function on error
     * }
     */
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
    var APP_URL = 'https://4s.vergilpenkov.com/';

    // Authentication
    var FOURSQUARE_CLIENT_ID = 'CMLELAZKKVF3DUWDTABSU01U4DUYLM2DTTPKOSWWU15N25MR';
    var FOURSQUARE_OAUTH_URL = 'https://foursquare.com/oauth2';
    var FOURSQUARE_AUTH_URL = FOURSQUARE_OAUTH_URL + '/authenticate?client_id=' + FOURSQUARE_CLIENT_ID;
    var REDIRECT_URL = FOURSQUARE_AUTH_URL + '&response_type=token&redirect_uri=' + APP_URL;

    // API endpoints
    var FOURSQUARE_API_URL = 'https://api.foursquare.com/v2';
    var FOURSQUARE_VENUES_URL = FOURSQUARE_API_URL + '/venues/search';

    /**
     * Gets the access token for Foursquare.
     * First it tries to get it from a cookie, then from the URL.
     * The URL case is after Foursquare redirects us back after clicking on the login button
     * @returns {String} - the access token
     */
    function getAccessToken() {
        var token, tokenLocation, foursquareHash;

        // Try to get from cookie
        token = Cookies.readCookie('foursquare');
        if (token) {
            return token;
        }

        // use location.href instead of hash because it won't work on DOMContentLoaded
        foursquareHash = '#access_token=';
        tokenLocation = window.location.href.indexOf(foursquareHash);

        // Create a cookie and return the token
        if (tokenLocation > 0) {
            tokenLocation += foursquareHash.length; // remove the hash parameter
            token = window.location.href.slice(tokenLocation);
            Cookies.createCookie('foursquare', token);

            return token;
        }
    }
    
    /**
     * Queries Foursquare for nearby venues and adds them on the map
     */
    function getNearbyVenues() {
        navigator.geolocation.getCurrentPosition(
            function(result) {
                var coordinates = result.coords;

                return Ajax.get({
                    url: FOURSQUARE_VENUES_URL,
                    params: {
                        oauth_token: accessToken,
                        ll: [coordinates.latitude, coordinates.longitude].join(','),
                        v: 20160801,
                        m: 'foursquare'
                    },
                    success: function(xhr) {
                        var results = JSON.parse(xhr.response);
                        console.log(results.response);
                    }
                });
            },
            function() {
                throw new Error('Geolocation is disabled');
            });
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

    // Public API
    return {
        init: init
    };
}());

document.addEventListener('DOMContentLoaded', function() {
    Foursquare.init();
});
