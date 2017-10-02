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
     * @returns {String} - the parsed URL
     */
    appendParamToURL: function(url, name, value) {
        // quit if the param already exists
        if (url.indexOf(name + '=') !== -1) {
            return url;
        }
        var separator = url.indexOf('?') !== -1 ? '&' : '?';
        return url + separator + name + '=' + encodeURIComponent(value);
    },

    /**
     * Takes a URL and an object with parameters and appends the params to the URL
     * @param {String} url - the URL
     * @param {Object} params - an object containing parameter name:value pairs
     * @returns {String} - the parsed URL
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

    // Public API
    return {

        /**
         * Creates a cookie
         * @param {String} name - the cookie's name
         * @param {String} value - the cookie's value
         * @param {Number} days - expire after this many days
         */
        createCookie: function(name, value, days) {
            var expires = createCookieExpirationValue(days);
            name = encodeURIComponent(name);
            value = encodeURIComponent(value);

            document.cookie = name + '=' + value + expires + '; path=/';
        },

        /**
         * Fetches a cookie by name
         * @param {String} name - the cookie's name
         * @returns {?String} - the cookie
         */
        readCookie: function(name) {
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
    };
}());

/**
 * Basic Ajax handler.
 */
var Ajax = {

    /**
     * Convenience AJAX get method on top of XHR.
     * @param {Object} options {
     *   url {String}: the URL to get from,
     *   params {Object}: parameter key-value pairs,
     *   success {Function}: a callback function on success,
     *   error {Function}: a callback function on error
     * }
     */
    get: function(options) {
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
};

/**
 * Controls the local elements
 */
var SiteControls = {

    /**
     * Initializes the distance selector.
     * Refreshes the map when changing the distance.
     */
    initDistanceSelector: function() {
        var rangeSelector = document.querySelector('.js-max-range');
        var rangeIndicator = document.querySelector('.js-max-range-indicator');

        rangeSelector.addEventListener('change', function() {
            rangeIndicator.innerText = this.value;
            Foursquare.getNearbyVenues(this.value);
        });
    },

    /**
     * Shows the main content.
     * Called when a user has logged in.
     */
    showMainContent: function() {
        var mainContent = document.querySelector('.js-main-content');
        mainContent.removeAttribute('hidden');
    }
};

/**
 * Google Maps component.
 */
var GoogleMaps = (function() {
    var mapInstance, googleMap, infoWindow;
    var MAP_CONTAINER = document.querySelector('.js-map');
    var API_KEY = 'AIzaSyAyQ3ELRKDAlnC5UEpAm2UPnWUIBpN6ihE';
    var SETTINGS = {
        center: {

            // lat: 52.376356,
            // lng: 4.905937
            lat: 42.696832,
            lng: 23.289583
        },
        fullscreenControl: false,
        mapTypeControl: false,
        scrollwheel: false,
        streetViewControl: false,
        zoom: 14
    };

    var markersOnMap = [];

    /**
     * Adds a tooltip when clicking on a marker
     * @param {Object} marker - a Google Map marker
     */
    function addMarkerClickEvent(marker) {
        var clickEvent = function() {
            var markerContent = document.createElement('div');
            markerContent.innerHTML = '<div class="marker-content">' +
            '<h1>' + marker.name + '</h1>' +
            '<p class="marker-content__address">' + marker.address + '</p>' +
            '</div>';

            infoWindow.setContent(markerContent);
            infoWindow.open(googleMap, marker);
        };

        marker.addListener('click', clickEvent);
    }

    /**
     * Adds a Foursquare venue result to the Google map
     * @param {Object} result - a Foursquare venue result
     */
    function addMarker(result) {
        var marker = new mapInstance.Marker({
            map: googleMap,
            position: new mapInstance.LatLng(result.location.lat, result.location.lng),
            address: result.location.address || '',
            name: result.name || ''
        });

        addMarkerClickEvent(marker);
        markersOnMap.push(marker);
    }

    /**
     * Removes all markers from the map
     */
    function clearMarkers() {
        for (var i = 0; i < markersOnMap.length; i++) {
            markersOnMap[i].setMap(null);
        }

        markersOnMap = [];
    }

    // Public API
    return {

        /**
         * Map initializer.
         * Creates a DOM node, then sends a callback method name as a URI parameter.
         * Callback needs to be a global method.
         */
        init: function() {
            if (this.hasStarted) {
                return;
            }

            window.googleMapCallback = function() {
                mapInstance = window.google.maps;
                SETTINGS.mapTypeId = mapInstance.MapTypeId.ROADMAP;

                googleMap = new mapInstance.Map(MAP_CONTAINER, SETTINGS);
                infoWindow = new mapInstance.InfoWindow();
                this.hasStarted = true;
            };

            var mapNode = document.createElement('script');
            mapNode.src = '//maps.googleapis.com/maps/api/js?callback=googleMapCallback&key=' + API_KEY;
            document.body.appendChild(mapNode);
        },

        /**
         * Takes an array of results and adds them to the map
         * @param {Array} results = [{
         *   name {String}: Venue name,
         *   location {Object}: the foursquare location {
         *     lat {Number}: latitude,
         *     lng {Number}: longitude
         *   }
         * }]
         */
        setMarkers: function(results) {
            clearMarkers();
            var venues = results.venues;

            for (var i = 0; i < venues.length; i++) {
                addMarker(venues[i]);
            }
        }
    };
}());

var Foursquare = (function() {
    var accessToken, currentUserLocation;
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
     * Displays the login button and binds event listeners
     */
    function showLogin() {
        var login = document.querySelector('.js-login');
        var loginButton = login.querySelector('.js-login-button');
        
        login.removeAttribute('hidden');
        loginButton.setAttribute('href', REDIRECT_URL);
    }

    /**
     * Queries Foursquare for nearby venues
     * @param {Object} coordinates - an object containing a latitude and a longitude property
     * @param {Number} distance - the radius to search within
     */
    function searchNear(coordinates, distance) {
        Ajax.get({
            url: FOURSQUARE_VENUES_URL,
            params: {
                oauth_token: accessToken,
                ll: [coordinates.latitude, coordinates.longitude].join(','),
                radius: distance || 500,
                limit: 20,
                v: 20160801,
                m: 'foursquare'
            },
            success: function(xhr) {
                var results = JSON.parse(xhr.response);
                GoogleMaps.setMarkers(results.response);
            }
        });
    }

    // Public API
    return {

        /**
         * Queries Foursquare for nearby venues and adds them on the map
         * @param {Number} distance - the distance (radius) to look into
         */
        getNearbyVenues: function(distance) {
            // Avoid querying the browser twice
            if (currentUserLocation) {
                searchNear(currentUserLocation, distance);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                function(result) {
                    var coordinates = result.coords;
                    currentUserLocation = coordinates;
                    searchNear(currentUserLocation, distance);
                },
                function() {
                    throw new Error('Geolocation is missing');
                });
        },

        /**
         * Initialize the Foursquare functionality.
         * Show the login button if user doesn't have an access token.
         */
        init: function() {
            if (this.hasStarted) {
                return;
            }

            this.hasStarted = true;
            accessToken = getAccessToken();

            if (accessToken) {
                GoogleMaps.init();
                SiteControls.initDistanceSelector();
                SiteControls.showMainContent();
                this.getNearbyVenues();

                return;
            }

            showLogin();
        }
    };
}());

document.addEventListener('DOMContentLoaded', function() {
    Foursquare.init();
});
