sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/json/JSONModel",
	"ServiceRequests/model/models",
    "ServiceRequests/controller/UtilityHandler",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function(UIComponent, Device, ODataModel, JSONModel, models, UtilityHandler , MessageBox , MessageToast) {
	"use strict";

	return UIComponent.extend("ServiceRequests.Component", {

		metadata: {
			manifest: "json"
		},

		contactUUID: null,
		contactID: null,
		mockData: false,
		SELECT_BOX_URLS: {
			ServiceRequestLifeCycleStatusCode: '/ServiceRequestServiceRequestLifeCycleStatusCodeCollection',
			ServicePriorityCode: '/ServiceRequestServicePriorityCodeCollection',
			ServiceCategory: '/ServiceIssueCategoryCatalogueCategoryCollection',
			IncidentCategory: '/ServiceIssueCategoryCatalogueCategoryCollection?$filter=ParentObjectID%20eq%20%27${0}%27',
			DescriptionTypeCollection: '/ServiceRequestTextCollectionTypeCodeCollection',
			ProductCategoryCollection: '/ProductCollection'
		},

        /**
		 * Functional Meta data for drop-down list on UI
         */
        functionMetaData: {
            ServiceRequestServicePriorityCodeCollection: null,
            ServiceIssueCategoryCatalogueCategoryCollection: null,
            ProductCollection: null,
            IncidentModel: null
        },

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this method, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function() {

		    //TODO remove it when deploy to SCP
           /* sap.ushell.Container = {
                getUser: function () {

                    return {
                        getEmail: function () {
                            return "joey.yang02@sap.com";

                        }
                    };
                },
            };*/

            //get C4C Contact via email at the very beginning
			this._getC4CContact();

            // set list model for contain the service ticket list data
            var model = new JSONModel();
            this.setModel(model, "listModel");

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// call the base component's init function and create the App view
			UIComponent.prototype.init.apply(this, arguments);

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * @public
		 * @override
		 */
		destroy: function() {
			if (!this.mockData) {

			}
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},
		onConfigChange: function(oEvent) {
			var settings = this.getMetadata().getManifest()["sap.cloud.portal"].settings;
			this.getAggregation("rootControl").$().css("height", settings.widgetHeight.value + "px");
		},
        /**
		 *
         * @private get C4C contact at the very beginning
         */
        _getC4CContact : function(){
            var sUserEmail = sap.ushell.Container.getUser().getEmail();
            var url = UtilityHandler.getHost() + "/getC4CContact?userEmail=" + sUserEmail;
            $.ajax({
                async:false,
                method: "GET",
                url: url,
                success: function (result) {
                    if(result){
                    	// if we can get contact ID & contact UUID from back end , set it as global variable.
                        this.contactID = result[0].ContactID;
                        this.contactUUID = result[0].UUID;
                    }else{
                        MessageToast.show("You cannot view or create tickets because your email " + sUserEmail + " is not assigned to a contact in the C4C tenant",{Duration:5000});
                    }
                }.bind(this),
                error: function(jqXHR){
                    var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                    var error = errorMessage?errorMessage:'Can not retrieve users email:' + sUserEmail;
                    MessageBox.error(error);
				}
            });

        },
	});

});