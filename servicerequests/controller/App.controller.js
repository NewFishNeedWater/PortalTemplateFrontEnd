sap.ui.define([
        "ServiceRequests/controller/BaseController",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/m/MessageToast",
    ],
    function (BaseController, JSONModel, MessageBox, MessageToast) {
        "use strict";

        return BaseController.extend("ServiceRequests.controller.App", {


            onInit: function () {
                var oViewModel,
                    fnSetAppNotBusy,
                    iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

                oViewModel = new JSONModel({
                    busy: true,
                    delay: 0
                });
                this.setModel(oViewModel, "appView");

                // if (!this.getOwnerComponent().mockData) {
                // 	this.getOwnerComponent().getModel().metadataLoaded()
                // 		.then(fnSetAppNotBusy);
                // } else {
                // 	fnSetAppNotBusy();
                // }

                // Makes sure that master view is hidden in split app
                // after a new list entry has been selected.
                // oListSelector.attachListSelectionChange(function () {
                //     this.byId("idAppControl").hideMaster();
                // }, this);

                // apply content density mode to root view
                this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
            },


        });

    }
);
