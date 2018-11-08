sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/odata/v2/ODataModel",
	"sap/ui/model/json/JSONModel",
	"ServiceRequests/model/models",
	"ServiceRequests/controller/ListSelector",
    "ServiceRequests/controller/UtilityHandler",
    "ServiceRequests/controller/ErrorHandler"
], function(UIComponent, Device, ODataModel, JSONModel, models, ListSelector,UtilityHandler ,ErrorHandler ) {
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

		functionMetaData: {
            ServiceRequestServicePriorityCodeCollection:null,
            ServiceIssueCategoryCatalogueCategoryCollection:null,
            ProductCollection:null,
            IncidentModel:null
		},

		listModel:undefined,

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this method, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init: function() {

		    //TODO remove it when deploy to SCP
          /*  sap.ushell.Container = {
                getUser: function () {

                    return {
                        getEmail: function () {
                            return "joey.yang02@sap.com";

                        }
                    };
                },
            };*/

            this.utilityHandler = new UtilityHandler();
            // Initial function metadata from back-end.
            // this.getServiceIssueCategoryPromise();
            // this.getProductCollectionPromise();
            // this.getServiceRequestServicePriorityCodePromise();

			this.oListSelector = new ListSelector();
			this.startupParams = this.receiveStartupParams();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// call the base component's init function and create the App view
			UIComponent.prototype.init.apply(this, arguments);

			// create the views based on the url/hash
			this.getRouter().initialize();
		},


		getListModel: function(){
			return this.listModel;
		},

        setListModel: function(listModel){
            this.listModel = listModel;
        },


        // getServiceRequestServicePriorityCodePromise: function(){
        //     return new Promise(function(resolve, reject) {
        //     	if(this.functionMetaData.ServiceRequestServicePriorityCodeCollection){
        //     		resolve(this.functionMetaData.ServiceRequestServicePriorityCodeCollection)
		// 		}
		// 		this.utilityHandler.getModelReadPromise('/getServicePriorityCode').then(function(oData){
        //             this.functionMetaData.ServiceRequestServicePriorityCodeCollection = oData;
        //             resolve(this.functionMetaData.ServiceRequestServicePriorityCodeCollection)
        //         }.bind(this));
        //     }.bind(this));
		// },

        // getServiceIssueCategoryPromise: function(){
        //     return new Promise(function(resolve, reject) {
        //         if(this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection){
        //             resolve(this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection)
        //         }
        //         this.utilityHandler.getModelReadPromise('/getServiceCategory').then(function(oData){
        //             this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection = oData;
        //             resolve(this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection)
		// 		}.bind(this));
        //     }.bind(this));
        // },

        // getProductCollectionPromise: function(){
        //     return new Promise(function(resolve, reject) {
        //         if(this.functionMetaData.ProductCollection){
        //             resolve(this.functionMetaData.ProductCollection)
        //         }
        //         this.utilityHandler.getModelReadPromise('/getProductCollection?$skip=0&$top=100').then(function(oData){
        //             this.functionMetaData.ProductCollection = oData;
        //             resolve(this.functionMetaData.ProductCollection)
        //         }.bind(this));
        //     }.bind(this));
        // },

        // getIncidentModelPromise: function(){
        //     return new Promise(function(resolve, reject) {
        //         if(this.functionMetaData.incidentModel){
        //             resolve(this.functionMetaData.incidentModel)
        //         }
        //         this.utilityHandler.getModelReadPromise('/getIncidentCategory').then(function(oData){
        //             this.functionMetaData.incidentModel = oData;
        //             resolve(this.functionMetaData.incidentModel)
        //         }.bind(this));
        //     }.bind(this));
        // },

        createIncidentCategoryFilters: function(parentObject, typeCode) {
            return [
                new sap.ui.model.Filter({
                    path: "ParentObjectID",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: parentObject
                }),
                new sap.ui.model.Filter({
                    path: "TypeCode",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: typeCode
                })
            ];
        },



		receiveStartupParams: function() {
			var obj = {},
				oComponentData = this.getComponentData && this.getComponentData();

			if (oComponentData && oComponentData.startupParameters) {
				var startupParameters = oComponentData.startupParameters;
				obj.createNewTicket = startupParameters.createNewTicket && startupParameters.createNewTicket[0];
				obj.highPriority = startupParameters.highPriority && startupParameters.highPriority[0];
				obj.pendingResponse = startupParameters.pendingResponse && startupParameters.pendingResponse[0];
			}

			return obj;
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ListSelector and ErrorHandler are destroyed.
		 * @public
		 * @override
		 */
		destroy: function() {
			this.oListSelector.destroy();
			if (!this.mockData) {
				this._oErrorHandler.destroy();
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
		}
	});

});