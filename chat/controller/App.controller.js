sap.ui.define([
        "Chat/controller/BaseController",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/m/MessageToast",
    ],
    function (BaseController, JSONModel, MessageBox, MessageToast) {
        "use strict";

        return BaseController.extend("Chat.controller.App", {


            onInit: function () {
                var oViewModel,
                    fnSetAppNotBusy,
                    iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

                oViewModel = new JSONModel({
                    busy: true,
                    delay: 0
                });
                this.setModel(oViewModel, "appView");

                // apply content density mode to root view
                this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
            },


        });

    }
);
