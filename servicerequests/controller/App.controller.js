sap.ui.define([
        "ServiceRequests/controller/BaseController",
        "ServiceRequests/controller/UtilityHandler",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/m/MessageToast",
    ],
    function (BaseController, UtilityHandler, JSONModel, MessageBox, MessageToast) {
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
                    // oListSelector = this.getOwnerComponent().oListSelector,
                    iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

                this.utilityHandler = new UtilityHandler();

                oViewModel = new JSONModel({
                    busy: true,
                    delay: 0
                });
                this.setModel(oViewModel, "appView");

                fnSetAppNotBusy = function () {
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
                // oListSelector.attachListSelectionChange(function () {
                //     this.byId("idAppControl").hideMaster();
                // }, this);

                // apply content density mode to root view
                this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
            },

            /**
             * Business Meta-data Load Promise Methods: Service Issue Category
             * @returns {Promise<Array>}
             */
            getServiceCategoryPromise: function () {
                return new Promise(function (resolve, reject) {
                    if (this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection) {
                        resolve(this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection)
                    }
                    this.utilityHandler.getModelReadPromise('/getServiceCategory').then(function (oData) {
                        this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection = oData;
                        resolve(this.functionMetaData.ServiceIssueCategoryCatalogueCategoryCollection)
                    }.bind(this));
                }.bind(this), function(oData){ reject(oData); });
            },

            /**
             * Business Meta-data Load Promise Methods: Products Collection
             * @returns {Promise<Array>}
             */
            getProductCollectionPromise: function () {
                return new Promise(function (resolve, reject) {
                    if (this.functionMetaData.ProductCollection) {
                        resolve(this.functionMetaData.ProductCollection)
                    }
                    this.utilityHandler.getModelReadPromise('/getProducts?$skip=0&$top=100').then(function (oData) {
                        this.functionMetaData.ProductCollection = oData;
                        resolve(this.functionMetaData.ProductCollection)
                    }.bind(this), function(oData){ reject(oData); });
                }.bind(this));
            },

            /**
             * Business Meta-data Load Promise Methods: Ticket Priority
             * @returns {Promise<Array>}
             */
            getServiceRequestServicePriorityCodePromise: function () {
                return new Promise(function (resolve, reject) {
                    if (this.functionMetaData.ServiceRequestServicePriorityCodeCollection) {
                        resolve(this.functionMetaData.ServiceRequestServicePriorityCodeCollection)
                    }
                    this.utilityHandler.getModelReadPromise('/getServicePriorityCode').then(function (oData) {
                        this.functionMetaData.ServiceRequestServicePriorityCodeCollection = oData;
                        resolve(this.functionMetaData.ServiceRequestServicePriorityCodeCollection)
                    }.bind(this), function(oData){ reject(oData); });
                }.bind(this));
            },

            /**
             * Business Meta-data Load Promise Methods: Incident Category
             * @returns {Promise<Array>}
             */
            getIncidentModelPromise: function () {
                return new Promise(function (resolve, reject) {
                    if (this.functionMetaData.incidentModel) {
                        resolve(this.functionMetaData.incidentModel)
                    }
                    this.utilityHandler.getModelReadPromise('/getIncidentCategory').then(function (oData) {
                        this.functionMetaData.incidentModel = oData;
                        resolve(this.functionMetaData.incidentModel)
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
                        filters: this.getOwnerComponent().createIncidentCategoryFilters(parentObject, typeCode),
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
            },

        });

    }
);
