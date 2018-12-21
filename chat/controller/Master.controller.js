sap.ui.define([
    "Chat/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
    "sap/ui/core/util/Export",
    "sap/ui/core/util/ExportTypeCSV",
    "sap/m/GroupHeaderListItem",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "Chat/model/formatter",
    "Chat/controller/ChatUtilityHandler"
], function (BaseController, JSONModel, Filter, FilterOperator, Device, Export, ExportTypeCSV, GroupHeaderListItem, MessageBox, MessageToast, formatter, UtilityHandler) {
    "use strict";
    /*global $*/

    return BaseController.extend("Chat.controller.Master", {

        formatter: formatter,


        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
         * @public
         */
        onInit: function () {
            this.component = this.getOwnerComponent();

            this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
            this.getRouter().attachBypassed(this.onBypassed, this);
        },



        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Handler method before the master view is rendered.
         */
        onBeforeRendering: function () {

        },


        /**
         * Event handler for the bypassed event, which is fired when no routing pattern matched.
         * If there was an object selected in the master list, that selection is removed.
         * @public
         */
        onBypassed: function () {

        },



        /**
         * If the master route was hit (empty hash) we have to set
         * the hash to to the first item in the list as soon as the
         * listLoading is done and the first item in the list is known
         * @private
         */
        _onMasterMatched: function () {



        },


    });

});