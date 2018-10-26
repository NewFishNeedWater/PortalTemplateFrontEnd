sap.ui.define([
    "sap/ui/base/Object"
], function (UI5Object) {
    "use strict";

    var UtilityHandlerTile = UI5Object.extend("ServiceRequests.tile.UtilityHandlerTile", {
    });
    //TODO change id to SCP destination
    UtilityHandlerTile.getHost = function () {

        //for local test
        //return "http://127.0.0.1:4002/client";
        return "/sap/fiori/servicerequests/destinations/supportportal/client";
        //return "https://supportportal.cfapps.us10.hana.ondemand.com/client";
    };

    UtilityHandlerTile.getC4CContact = function (fnSuccess, fnError, sUserEmail) {
        var url = UtilityHandlerTile.getHost() + "/getC4CContact?userEmail=" + sUserEmail;
        $.ajax({
            method: "GET",
            url: url,
            success: fnSuccess,
            error: fnError
        });
    };

    return UtilityHandlerTile;
});

