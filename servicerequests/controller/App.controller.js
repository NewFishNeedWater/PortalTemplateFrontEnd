sap.ui.define([
		"ServiceRequests/controller/BaseController",
		"ServiceRequests/controller/UtilityHandler",
		"sap/ui/model/json/JSONModel"
	],
	function (BaseController, UtilityHandler, JSONModel) {
		"use strict";

		return BaseController.extend("ServiceRequests.controller.App", {

			functionMetaData: {
				ServiceRequestServicePriorityCodeCollection: null,
				ServiceIssueCategoryCatalogueCategoryCollection: null,
				ProductCollection: null,
				IncidentModel: null
			},

			onInit: function () {
				var oViewModel,
					fnSetAppNotBusy,
					oListSelector = this.getOwnerComponent().oListSelector,
					iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

				this.utilityHandler = new UtilityHandler();
				this.getServiceIssueCategoryPromise();
				this.getProductCollectionPromise();
				this.getServiceRequestServicePriorityCodePromise();

				oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});
				this.setModel(oViewModel, "appView");

				fnSetAppNotBusy = function() {
					oViewModel.setProperty("/busy", false);
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				};

				// if (!this.getOwnerComponent().mockData) {
				// 	this.getOwnerComponent().getModel().metadataLoaded()
				// 		.then(fnSetAppNotBusy);
				// } else {
				// 	fnSetAppNotBusy();
				// }

				// Makes sure that master view is hidden in split app
				// after a new list entry has been selected.
				oListSelector.attachListSelectionChange(function () {
					this.byId("idAppControl").hideMaster();
				}, this);

				// apply content density mode to root view
				this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			},

			getServiceIssueCategoryPromise: function () {
				return new Promise(function (resolve, reject) {
					if (this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection) {
						resolve(this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection)
					}
					this.utilityHandler.getModelReadPromise('/getServiceCategory').then(function (oData) {
						this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection = oData;
						resolve(this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection)
					}.bind(this));
				}.bind(this));
			},

			getProductCollectionPromise: function () {
				return new Promise(function (resolve, reject) {
					if (this.functionMetaData.ProductCollection) {
						resolve(this.functionMetaData.ProductCollection)
					}
					this.utilityHandler.getModelReadPromise('/getProductCollection?$skip=0&$top=100').then(function (oData) {
						this.functionMetaData.ProductCollection = oData;
						resolve(this.functionMetaData.ProductCollection)
					}.bind(this));
				}.bind(this));
			},

			getServiceRequestServicePriorityCodePromise: function () {
				return new Promise(function (resolve, reject) {
					if (this.functionMetaData.ServiceRequestServicePriorityCodeCollection) {
						resolve(this.functionMetaData.ServiceRequestServicePriorityCodeCollection)
					}
					this.utilityHandler.getModelReadPromise('/getServicePriorityCode').then(function (oData) {
						this.functionMetaData.ServiceRequestServicePriorityCodeCollection = oData;
						resolve(this.functionMetaData.ServiceRequestServicePriorityCodeCollection)
					}.bind(this));
				}.bind(this));
			},

			getIncidentModelPromise: function () {
				return new Promise(function (resolve, reject) {
					if (this.functionMetaData.incidentModel) {
						resolve(this.functionMetaData.incidentModel)
					}
					this.utilityHandler.getModelReadPromise('/getIncidentCategory').then(function (oData) {
						this.functionMetaData.incidentModel = oData;
						resolve(this.functionMetaData.incidentModel)
					}.bind(this));
				}.bind(this));
			},


		});

	}
);
