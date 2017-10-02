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