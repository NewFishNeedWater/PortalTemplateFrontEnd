sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/FilterOperator"
], function (UI5Object, FilterOperator) {
    "use strict";

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
         oModelRead: function(oModel, baseURL, oSettings ){
             var url = this.getHost()+ baseURL;
             if(this._checkURLWithCondition(oSettings)){
                 url = url + "?";
             }
            if(oSettings && oSettings.filters){
                 // In case need to add filter conditions
                 url = this._setURLByFilters(url, oSettings.filters);
             }
            $.ajax({
                url:url,
                type:'GET',
                async:false,
                beforeSend: function(request) {
                    //request.setRequestHeader("Authorization", chatbotAPI.nlAPIToken);
                    request.setRequestHeader("Type", "application/json");
                },
                dataType:'json',
                success: function(oData){
                    if(oSettings && oSettings.success){
                        oSettings.success(oData);
                    }
                }.bind(this),
                error: function(jqXHR){
                    // var elm = jqXHR.responseXML.getElementsByTagName("message")[0];
                    // var error = elm.innerHTML || elm.textContent;
                    // //MessageBox.error(error);
                    // oSettings.error(error);
                    if(oSettings && oSettings.error){
                        oSettings.error(jqXHR);
                    }
                }
            });
        },

        getModelReadPromise: function(baseURL, oSettings){
            var url = this.getHost()+ baseURL;
            if(this._checkURLWithCondition(oSettings)){
                url = url + "?";
            }
            if(oSettings && oSettings.filters){
                // In case need to add filter conditions
                url = this._setURLByFilters(url, oSettings.filters);
            }
             return new Promise(function(resolve, reject){
                 $.ajax({
                     url:url,
                     type:'GET',
                     beforeSend: function(request) {
                         request.setRequestHeader("Type", "application/json");
                     },
                     dataType:'json',
                     success: function(oData){
                         resolve(oData);
                     }.bind(this),
                     error: function(jqXHR){
                         reject(jqXHR);
                     }
                 });
             });
        },

        /**
         * Check if the url should has conditions
         * @param oSettings
         * @returns {boolean}
         * @private
         */
        _checkURLWithCondition: function(oSettings){
            if(!oSettings){
                return false;
            }
            if(oSettings.filters){
                return true;
            }
            return false;
        },

         _setURLByFilters: function(baseURL, filters){
             if(!filters || filters.length === 0){
                 return baseURL;
             }
             var i = 0, len = filters.length, str = '$filter=';
             for(i = 0; i < len; i++){
                 var filter = filters[i];
                 if(filter.sOperator === FilterOperator.EQ){
                     str += filter.sPath + ' eq ' + '\''+filter.oValue1+'\'';
                 }
                 if(i < len - 1){
                     str = str + ' and '
                 }
             }
             return baseURL + str;
         },

        getHost : function(){
            return "http://127.0.0.1:4002/client";
        }

    });

    //TODO change id to SCP destination
    UtilityHandler.getHost = function(){

        return "http://127.0.0.1:4002/client";
    };

    return UtilityHandler;
});

