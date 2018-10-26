sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"ServiceRequests/controller/UtilityHandler"
],
function (Controller, UtilityHandler) {
	"use strict";
	/*global $*/

	return Controller.extend("ServiceRequests.tile.HighPriority", {

		onAfterRendering: function() {
            var sUserEmail = sap.ushell.Container.getUser().getEmail();
			$("#highPriorityTile").click(function() {
			    var fnSuccess = function(result){
			        if(!result){
                        MessageToast.show("You cannot view or create tickets because your email " + sUserEmail + " is not assigned to a contact in the C4C tenant",{Duration:5000});
                    }else{
                        var oViewData = this.getView().getViewData();
                        var navTargetUrl = oViewData.properties && oViewData.properties.navigation_target_url;
                        if (navTargetUrl) {
                            window.hasher.setHash(navTargetUrl);
                        }
                    }
                };
			    var fnError = function(jqXHR){
                    MessageToast.show("Retrieve contact by Email error , Email: " + sUserEmail ,{Duration:5000});
                };

                UtilityHandler.getC4CContact(fnSuccess,fnError);
			}.bind(this));

			if (window.location.href.indexOf("mockData") !== -1 || sap.ushell.Container.getUser().getEmail() === "") {
				$("#highPriorityTileNumber").text("2");
			} else {
				var email = sap.ushell.Container.getUser().getEmail();
				var url = UtilityHandler.getHost() + "/getServiceRequestsCount?$filter=ReporterEmail eq %27" + email + "%27and ServiceRequestUserLifeCycleStatusCodeText ne %27Completed%27 and ServicePriorityCode lt %273%27";

				$.ajax({
					method: "GET",
					// url: "/sap/fiori/servicerequests/destinations/c4c/sap/byd/odata/v1/c4codata/ServiceRequestCollection/$count?$filter=ReporterEmail eq %27" + email + "%27and ServiceRequestUserLifeCycleStatusCodeText ne %27Completed%27 and ServicePriorityCode lt %273%27",
					url: url,
					success: function(result) {
						$("#highPriorityTileNumber").text(result.count);
					},
					error: function() {
						$("#highPriorityTileNumber").text("!");
					}
				});
			}

		}

	});

});