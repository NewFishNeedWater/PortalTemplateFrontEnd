/*global history */
sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/routing/History",
    "ServiceRequests/controller/UtilityHandler",
	], function (Controller, History, UtilityHandler) {
		"use strict";

		return Controller.extend("ServiceRequests.controller.BaseController", {

            onInit: function() {

            },

			/**
			 * Convenience method for accessing the router in every controller of the application.
			 * @public
			 * @returns {sap.ui.core.routing.Router} the router for this component
			 */
			getRouter: function () {
				return this.getOwnerComponent().getRouter();
			},

			/**
			 * Convenience method for getting the view model by name in every controller of the application.
			 * @public
			 * @param {string} sName the model name
			 * @returns {sap.ui.model.Model} the model instance
			 */
			getModel: function (sName) {
				return this.getView().getModel(sName);
			},

			/**
			 * Convenience method for setting the view model in every controller of the application.
			 * @public
			 * @param {sap.ui.model.Model} oModel the model instance
			 * @param {string} sName the model name
			 * @returns {sap.ui.mvc.View} the view instance
			 */
			setModel: function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},

			/**
			 * Convenience method for getting the resource bundle.
			 * @public
			 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
			 */
			getResourceBundle: function () {
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},

            /**
             * Utility method of Getting AJAX request
             * @param {Object} oSetting: request setting
             *       ----{String} url: url of request
             *       ----{function} successCallBack: success call back method
             *       ----{function} errorCallBack: error call back method			 *
             *       ----{function} completeCallBack: complete call back method
             */
            getHttpRequest: function(oSetting){
            	UtilityHandler.getHttpRequest(oSetting);
            },


            /**
             * Utility method of Getting AJAX request
             * @param {Object} oSetting: request setting
             *       ----{String} url: url of request
             *       ----{function} successCallBack: success call back method
             *       ----{function} errorCallBack: error call back method			 *
             *       ----{function} completeCallBack: complete call back method
             */
            postHttpRequest: function(oSetting){
                UtilityHandler.postHttpRequest(oSetting);
            },

			getFunctionMetaData: function(){
            	return this.getOwnerComponent().functionMetaData;
			},

            /**
             * Business Meta-data Load Promise Methods: Service Issue Category
             * @returns {Promise<Array>}
             */
            getServiceCategoryPromise: function () {
                return new Promise(function (resolve, reject) {
                    if (this.getFunctionMetaData().ServiceIssueCategoryCatalogueCategoryCollection) {
                        resolve(this.getFunctionMetaData().ServiceIssueCategoryCatalogueCategoryCollection)
                    }
                    this.utilityHandler.getModelReadPromise('/getServiceCategory').then(function (oData) {
                        this.getFunctionMetaData().ServiceIssueCategoryCatalogueCategoryCollection = oData;
                        resolve(this.getFunctionMetaData().ServiceIssueCategoryCatalogueCategoryCollection)
                    }.bind(this));
                }.bind(this), function(oData){ reject(oData); });
            },

            /**
             * Business Meta-data Load Promise Methods: Products Collection
             * @returns {Promise<Array>}
             */
            getProductCollectionPromise: function () {
                return new Promise(function (resolve, reject) {
                    if (this.getFunctionMetaData().ProductCollection) {
                        resolve(this.getFunctionMetaData().ProductCollection)
                    }
                    this.utilityHandler.getModelReadPromise('/getProducts?$skip=0&$top=100').then(function (oData) {
                        this.getFunctionMetaData().ProductCollection = oData;
                        resolve(this.getFunctionMetaData().ProductCollection)
                    }.bind(this), function(oData){ reject(oData); });
                }.bind(this));
            },

            /**
             * Business Meta-data Load Promise Methods: Ticket Priority
             * @returns {Promise<Array>}
             */
            getServiceRequestServicePriorityCodePromise: function () {
                return new Promise(function (resolve, reject) {
                    if (this.getFunctionMetaData().ServiceRequestServicePriorityCodeCollection) {
                        resolve(this.getFunctionMetaData().ServiceRequestServicePriorityCodeCollection)
                    }
                    this.utilityHandler.getModelReadPromise('/getServicePriorityCode').then(function (oData) {
                        this.getFunctionMetaData().ServiceRequestServicePriorityCodeCollection = oData;
                        resolve(this.getFunctionMetaData().ServiceRequestServicePriorityCodeCollection)
                    }.bind(this), function(oData){ reject(oData); });
                }.bind(this));
            },

            /**
             * Utility method of loading 'Incident Category' Meta-data by Parent object
             * @param {Object} oSettings
             *         ----{String} parentObject: Parent Object from UI Control 'Service Category'             *
             *         ----{String} typeCode: Type code from UI Control 'Service Category'         *
             *         ----{UI5 Control} incidentCategoryControl: UI Control for this 'Incident Category'         *
             *         ----{Object} serviceRequestMockData: Mock object of service request data
             *         ----{JSONModel} incidentModel JSON Model
             *         ----{Object} oSelectetedItem: In case there is already selected value
             */
            getIncidentCategoryList: function (oSettings) {
                var parentObject = oSettings.parentObject;
                var typeCode = oSettings.typeCode;
                var incidentCategoryControl = oSettings.incidentCategoryControl;
                var serviceRequestMockData = oSettings.serviceRequestMockData;
                var incidentModel = oSettings.incidentModel;
                var fnSuccessCallBack = oSettings.fnSuccessCallBack;
                var cmpt = this.getOwnerComponent(),
                    oModel = cmpt.getModel(),
                    _self = this;
                incidentCategoryControl.setBusy(true);
                if (cmpt.mockData) {
                    // var mockModelData = this.oDialog.getModel("ServiceRequest").getData();
                    incidentModel = serviceRequestMockData.IncidentModel;
                    this.initIncidentModel(incidentModel[parentObject], incidentCategoryControl, incidentModel);
                } else {
                    this.utilityHandler.oModelRead(oModel, '/getServiceCategory', {
                        filters: this.createIncidentCategoryFilters(parentObject, typeCode),
                        success: function(oData) {
                            if(oData && oData.error){
                                UtilityHandler.onErrorDataReadWrap(oData.error);
                            }else{
                                _self.initIncidentModel(oData, incidentCategoryControl, incidentModel);
                                if(fnSuccessCallBack && typeof  fnSuccessCallBack === 'function'){
                                    // In case Metadata is loaded success, call call back
                                    fnSuccessCallBack();
                                }
                            }
                        }.bind(this),
                        error: function (jqXHR) {
                            var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                            if (errorMessage) {
                                MessageBox.error(errorMessage);
                            }
                            incidentCategoryControl.setBusy(false);
                        }
                    });
                }
            },

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
                    oComponentData = this.getOwnerComponent().getComponentData && this.getOwnerComponent().getComponentData();

                if (oComponentData && oComponentData.startupParameters) {
                    var startupParameters = oComponentData.startupParameters;
                    obj.createNewTicket = startupParameters.createNewTicket && startupParameters.createNewTicket[0];
                    obj.highPriority = startupParameters.highPriority && startupParameters.highPriority[0];
                    obj.pendingResponse = startupParameters.pendingResponse && startupParameters.pendingResponse[0];
                }

                return obj;
            },


            /**
             * Set Meta data for 'incident model' and refresh dropdown plugin
             * @param data
             * @param incidentCategoryControl
             * @param incidentModel
             */
            initIncidentModel: function (data, incidentCategoryControl, incidentModel) {
                incidentModel.setData({results: data});
                incidentModel.refresh();
                incidentCategoryControl.setBusy(false);
            }

        });

	}
);
