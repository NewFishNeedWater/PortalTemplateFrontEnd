sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
], function (UI5Object, FilterOperator, MessageBox) {
    "use strict";
    /**
     * Utility Class for get/post data from/to back-end server, as well as information/data processing.
     */

    var UtilityHandler = UI5Object.extend("ServiceRequests.controller.UtilityHandler", {

        /**
         * Utility method: Read data from server and render oModel
         * @param {JSONModel}oModel
         * @param {string}baseURL
         * @param {object}oSettings
         *         ----{function} success: success call back method
         *         ----{function} error: error call back method
         *         ----{array} filters: filter table
         */
        oModelRead: function (oModel, baseURL, oSettings) {
            var url = UtilityHandler.getHost() + baseURL;
            if (this._checkURLWithCondition(oSettings)) {
                url = url + "?";
            }
            if (oSettings && oSettings.filters) {
                // In case need to add filter conditions
                url = this._setURLByFilters(url, oSettings.filters);
            }
            $.ajax({
                url: url,
                type: 'GET',
                beforeSend: function (request) {
                    //request.setRequestHeader("Authorization", chatbotAPI.nlAPIToken);
                    request.setRequestHeader("Type", "application/json");
                },
                dataType: 'json',
                success: function (oData) {
                    if (oSettings && oSettings.success) {
                        oSettings.success(oData);
                    }
                }.bind(this),
                error: function (jqXHR) {
                    if (oSettings && oSettings.error) {
                        oSettings.error(jqXHR);
                    }
                }
            });
        },

        /**
         * Utility method: Read data from server and return Promise
         * @param {string}baseURL
         * @param {object}oSettings
         *         ----{function} success: success call back method
         *         ----{function} error: error call back method
         *         ----{array} filters: filter table
         */
        getModelReadPromise: function (baseURL, oSettings) {
            var url = UtilityHandler.getHost() + baseURL;
            if (this._checkURLWithCondition(oSettings)) {
                url = url + "?";
            }
            if (oSettings && oSettings.filters) {
                // In case need to add filter conditions
                url = this._setURLByFilters(url, oSettings.filters);
            }
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: url,
                    type: 'GET',
                    beforeSend: function (request) {
                        request.setRequestHeader("Type", "application/json");
                    },
                    dataType: 'json',
                    success: function (oData) {
                        resolve(oData);
                    }.bind(this),
                    error: function (jqXHR) {
                        reject(jqXHR);
                    }
                });
            });
        },

        /**
         * @private Check if the url should has conditions
         * @param oSettings
         * @returns {boolean}
         */
        _checkURLWithCondition: function (oSettings) {
            if (!oSettings) {
                return false;
            }
            if (oSettings.filters) {
                return true;
            }
            return false;
        },

        /**
         * @private Converting the Filters into Complete URI value: URI parameters
         * @param oSettings
         * @returns {string} baseURL + URL parameters
         */
        _setURLByFilters: function (baseURL, filters) {
            if (!filters || filters.length === 0) {
                return baseURL;
            }
            var i = 0, len = filters.length, str = '$filter=';
            for (i = 0; i < len; i++) {
                var filter = filters[i];
                if (filter.sOperator === FilterOperator.EQ) {
                    str += filter.sPath + ' eq ' + '\'' + filter.oValue1 + '\'';
                }
                if (i < len - 1) {
                    str = str + ' and '
                }
            }
            return baseURL + str;
        },
    });

    //TODO change id to SCP destination
    /**
     * Utility method to get the HOST URI
     * @returns {string}
     */
    UtilityHandler.getHost = function () {
        //for local test
        //return "http://127.0.0.1:4002/client";
        return jQuery.sap.getModulePath("ServiceRequests") + "/destinations/supportportal/client";
        //return "https://supportportal.cfapps.us10.hana.ondemand.com/client";
    };

    /**
     * Utility method to format date from miliseconds format: {/Date(XXXXXX)} to display format on UI.
     * @param rawValue
     * @returns {Date}
     */
    UtilityHandler.getDate = function (rawValue) {
        if (typeof rawValue === 'string') {
            // In case string type raw date value
            let regex = new RegExp("^\/Date");
            if (regex.test(rawValue)) {
                // In case start with '/Date'
                var date = new Date(rawValue.slice(6, rawValue.length - 2) * 1);
                console.log('Current Date:' + date);
                return date;

            }
        }
        if (typeof rawValue === 'object' && rawValue instanceof Date) {
            return rawValue;
        }
    };

    /**
     * Utility Method to get C4C Contact
     * @param fnSuccess
     * @param fnError
     * @param sUserEmail
     */
    UtilityHandler.getC4CContact = function (fnSuccess, fnError, sUserEmail) {
        var url = UtilityHandler.getHost() + "/getC4CContact?userEmail=" + sUserEmail;
        $.ajax({
            method: "GET",
            url: url,
            success: fnSuccess,
            error: fnError
        });
    };


    /**
     * @public: Utility method, converting response from server error info object to error message
     * @param {object} jqXHR
     * @returns {string} error message
     *
     */
    UtilityHandler.getErrorMessageFromErrorResponse = function (jqXHR) {
        var errorUnion;
        if(jqXHR && jqXHR.responseText){
            if(jqXHR.responseText.getElementsByTagName && jqXHR.responseText.getElementsByTagName("message")) {
                errorUnion = jqXHR.responseText.getElementsByTagName("message");
                if (typeof errorUnion === 'string') {
                    return errorUnion;
                }
                if (typeof errorUnion === 'object' && errorUnion.length && errorUnion.length > 0) {
                    return errorUnion[0];
                }
            }
        }
        if (jqXHR.error && typeof jqXHR.error === 'string') {
            return jqXHR.error;
        }
        if (jqXHR.error && typeof jqXHR.error === 'object') {
            if (jqXHR.error.message && typeof jqXHR.error.message === 'string') {
                return jqXHR.error.message;
            }
            if (jqXHR.error.message && typeof jqXHR.error.message === 'object') {
                if (jqXHR.error.message.value && typeof jqXHR.error.message.value === 'string') {
                    return jqXHR.error.message.value;
                }
            }
        }
    };

    /**
     * Utility method of Posting AJAX request
     * @param {Object} oSetting: request setting
     *       ----{String} url: url of request
     *       ----{String} method: ajax method type, default is "POST"
     *       ----{String} data: url of request
     *       ----{function} success: success call back method
     *       ----{function} error: error call back method			 *
     *       ----{function} complete: complete call back method
     */
    UtilityHandler.postHttpRequest = function(oSetting){
        jQuery.ajax({
            url: oSetting.url,
            method: oSetting.method? oSetting.method: "POST",
            contentType: "application/json",
            data: JSON.stringify(oSetting.data),
            success: oSetting.success,
            error: oSetting.error,
            complete: oSetting.complete
        });
    };

    /**
     * Utility method of Posting AJAX request
     * @param {Object} oSetting: request setting
     *       ----{String} url: url of request
     *       ----{function} success: success call back method
     *       ----{function} error: error call back method			 *
     *       ----{function} complete: complete call back method
     */
    UtilityHandler.getHttpRequest = function(oSetting){
        jQuery.ajax({
            url: oSetting.url,
            method: "GET",
            contentType: "application/json",
            data: JSON.stringify(oSetting.data),
            success: oSetting.success,
            error: oSetting.error,
            complete: oSetting.complete
        });
    };

    /**
     * Wrapper method when exception happens in post/get data from back-end
     * @param {object} jqXHR
     */
    UtilityHandler.onErrorDataReadWrap = function (jqXHR) {
        var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
        if(errorMessage){
            MessageBox.error(errorMessage);
        }
    };

    /**
     * Wrapper method when error message is founded in success returned data from back-end
     * @param {object} oError
     */
    UtilityHandler.raiseErrorMessageWrap = function(oError){
        if(oError.message && oError.message.value){
            MessageBox.error(oError.message.value);
        }
    };

    return UtilityHandler;
});

