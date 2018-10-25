sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"ServiceRequests/controller/UtilityHandler"
],
function (Controller, UtilityHandler) {
	"use strict";
	/*global $*/

	return Controller.extend("ServiceRequests.tile.OpenTickets", {

		onAfterRendering: function() {
			$("#openTicketsTile").click(function() {
				var oViewData = this.getView().getViewData();
				var navTargetUrl = oViewData.properties && oViewData.properties.navigation_target_url;
				if (navTargetUrl) {
					window.hasher.setHash(navTargetUrl);
				}
			}.bind(this));

			if (window.location.href.indexOf("mockData") !== -1 || sap.ushell.Container.getUser().getEmail() === "") {
				$("#openTicketsTileNumber").text("3");
			} else {
				var email = sap.ushell.Container.getUser().getEmail();
				var url = UtilityHandler.getHost() + "/getServiceRequestsCount?$filter=ReporterEmail eq %27" + email + "%27and ServiceRequestUserLifeCycleStatusCodeText ne %27Completed%27";

				$.ajax({
					method: "GET",
					// url: "/servicerequests/destinations/c4c/sap/byd/odata/v1/c4codata/ServiceRequestCollection/$count?$filter=ReporterEmail eq %27" + email + "%27and ServiceRequestUserLifeCycleStatusCodeText ne %27Completed%27",
					url: url,
					success: function(result) {
						$("#openTicketsTileNumber").text(result.count);
					},
					error: function() {
						$("#openTicketsTileNumber").text("!");
					}
				});
			}
		}

	});

});