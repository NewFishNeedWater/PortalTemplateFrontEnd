sap.ui.define([
    "sap/ui/base/Object"
], function (UI5Object) {
    "use strict";

    var UtilityHandlerTile = UI5Object.extend("ServiceRequests.tile.UtilityHandlerTile", {
    });

    UtilityHandlerTile.getHost = function () {
        return "/sap/fiori/servicerequests/destinations/supportportal/client";
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

