sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"ServiceRequests/controller/UtilityHandler"
],
function (Controller, UtilityHandler) {
	"use strict";
	/*global $*/

	return Controller.extend("ServiceRequests.tile.PendingResponse", {

		onAfterRendering: function() {
			$("#pendingResponseTile").click(function() {
				var oViewData = this.getView().getViewData();
				var navTargetUrl = oViewData.properties && oViewData.properties.navigation_target_url;
				if (navTargetUrl) {
					window.hasher.setHash(navTargetUrl);
				}
			}.bind(this));

			if (window.location.href.indexOf("mockData") !== -1 || sap.ushell.Container.getUser().getEmail() === "") {
				$("#pendingResponseTileNumber").text("0");
			} else {
				var email = sap.ushell.Container.getUser().getEmail();
				var url = UtilityHandler.getHost() + "/getServiceRequestsCount?$filter=ReporterEmail eq %27" + email + "%27and ServiceRequestUserLifeCycleStatusCode eq %274%27";

				$.ajax({
					method: "GET",
					// url: "/sap/fiori/servicerequests/destinations/c4c/sap/byd/odata/v1/c4codata/ServiceRequestCollection/$count?$filter=ReporterEmail eq %27" + email + "%27and ServiceRequestUserLifeCycleStatusCode eq %274%27",
					url: url,
					success: function(result) {
						$("#pendingResponseTileNumber").text(result.count);
					},
					error: function() {
						$("#pendingResponseTileNumber").text("!");
					}
				});
			}
		}

	});

});