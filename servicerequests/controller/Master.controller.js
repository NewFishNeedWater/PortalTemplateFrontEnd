sap.ui.define([
    "ServiceRequests/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
    "sap/ui/core/util/Export",
    "sap/ui/core/util/ExportTypeCSV",
    "sap/m/GroupHeaderListItem",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "ServiceRequests/model/formatter",
    "ServiceRequests/controller/UtilityHandler"
], function (BaseController, JSONModel, Filter, FilterOperator, Device, Export, ExportTypeCSV, GroupHeaderListItem, MessageBox, MessageToast, formatter, UtilityHandler) {
    "use strict";
    /*global $*/

    return BaseController.extend("ServiceRequests.controller.Master", {

        formatter: formatter,
        oDialog: null,
        fileToUpload: null,
        initialCreateTicketOpened: false,
        contactUUID: null,
        contactID: null,
        component: null,
        mockData: false,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
         * @public
         */
        onInit: function () {
            this.component = this.getOwnerComponent();
            var oList = this.byId("list"),
                oViewModel = this._createViewModel(),
                // Put down master list's original value for busy indicator delay,
                // so it can be restored later on. Busy handling on the master list is
                // taken care of by the master list itself.
                iOriginalBusyDelay = oList.getBusyIndicatorDelay();

            // Class attributes for error message
            // Indicator wheather the ticket list error message is open or not
            this._bListErrorMessageOpen = false;
            this.app = this.component.getAggregation("rootControl");
            this._oResourceBundle = this.component.getModel("i18n").getResourceBundle();
            this._sErrorText = this._oResourceBundle.getText("errorText");
            this.component.startupParams = this.receiveStartupParams();


            this.setModel(oViewModel, "masterView");
            this.utilityHandler = new UtilityHandler();
            this.initServiceRequestList();
            // Checking what's the use
            var eventBus = sap.ui.getCore().getEventBus();
            eventBus.subscribe("Detail", "DetailHasRendered", function () {
            });
            this._oList = oList;
            // keeps the filter and search state
            this._oListFilterState = {
                aFilter: [],
                aSearch: []
            };


            oList.attachEventOnce("updateFinished", function () {
                // Restore original busy indicator delay for the list
                oViewModel.setProperty("/delay", iOriginalBusyDelay);
            });
            // this.getView().addEventDelegate({
            // 	onBeforeFirstShow: function() {
            // 		//this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
            // 	}.bind(this)
            // });

            this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
            this.getRouter().attachBypassed(this.onBypassed, this);

            if (this.getOwnerComponent().mockData) {
                this.mockData = true;
                var view = this.getView();
                view.byId("addButton").setEnabled(true);
                view.byId("downloadButton").setEnabled(true);
            }
        },

        /**
         * Core logic of getting Service request list data from back-end
         * @param model
         * @param fnComplete
         */
        getServiceRequestListBackend: function (model, fnComplete) {
            var email = sap.ushell.Container.getUser().getEmail();
            var url = UtilityHandler.getHost() + "/getServiceRequests?$skip=0&$top=20&$orderby=CreationDateTime desc&$filter=(ReporterEmail eq '" + email + "' or ReporterEmail eq '" + email
                + "') and (ServiceRequestUserLifeCycleStatusCodeText ne 'Completed' or ServiceRequestUserLifeCycleStatusCodeText ne 'Completed')&$expand=ServiceRequestDescription,ServiceRequestAttachmentFolder";

            this.getHttpRequest({
                url: url,
                success: function (result) {
                    if (result && result.forEach) {
                        result.forEach(function (oServiceRequest) {
                            if (oServiceRequest.ServiceRequestDescription.length > 0) {
                                oServiceRequest.ServiceRequestDescription.forEach(function (description) {
                                    // set description created on date formate
                                    description.CreatedOn = new Date(parseInt(description.CreatedOn.substring(description.CreatedOn.indexOf("(") + 1, description.CreatedOn.indexOf(")"))));
                                });
                            }
                        });
                        model.setData({"ServiceRequestCollection": result});
                        model.refresh();
                        var oItem = this._oList.getItems() && this._oList.getItems().length > 0 ? this._oList.getItems()[0] : undefined;
                        model.fireRequestCompleted({
                            statusCode: 200,
                            list: this._oList,
                            firstListitem: oItem
                        });
                    } else {
                        // In case empty data
                    }
                }.bind(this),
                error: function (jqXHR) {
                    if (jqXHR.status === 404 || (jqXHR.status === 404 && jqXHR.responseText.indexOf("Cannot POST") === 0)) {
                        this._showListServiceError(jqXHR);
                        return;
                    }
                    var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                    var error = errorMessage ? errorMessage : 'Service requests list can not be retrieved!';
                    MessageBox.error(error);
                }.bind(this),
                complete: function () {
                    if (fnComplete) {
                        fnComplete();
                    }
                }.bind(this)
            });
            this.setModel(model);
        },

        /**
         * @private In case loading ticket list server error: pop-up error message
         * @param sDetails
         *
         */
        _showListServiceError: function (sDetails) {
            if (this._bListErrorMessageOpen) {
                return;
            }
            this._bListErrorMessageOpen = true;
            MessageBox.error(
                this._sErrorText,
                {
                    id: "serviceErrorMessageBox",
                    details: sDetails,
                    styleClass: this.getOwnerComponent().getContentDensityClass(),
                    actions: [MessageBox.Action.CLOSE],
                    onClose: function () {
                        this._bListErrorMessageOpen = false;
                    }.bind(this)
                }
            );
        },

        /**
         * Wrapper method to initial loading the service requests list data and set to component data area
         */
        initServiceRequestList: function () {
            if (window.location.href.indexOf("mockData") !== -1 || sap.ushell.Container.getUser().getEmail() === "") {
                // In case mock data
                var mockModel = new JSONModel(jQuery.sap.getModulePath("ServiceRequests") + "/mock/c4codata.json");
                mockModel.attachRequestCompleted(function () {
                    this.getData().ServiceRequestCollection.forEach(function (request) {
                        request.ServiceRequestDescription.forEach(function (description) {
                            description.CreatedOn = new Date(parseInt(description.CreatedOn.substring(description.CreatedOn.indexOf("(") + 1, description.CreatedOn.indexOf(")"))));
                        });
                    });
                });
                this.setModel(model);
            } else {
                // In case NOT mock data
                this.app.setBusy(true);
                var model = this.getOwnerComponent().getModel("listModel");
                this.getServiceRequestListBackend(model, function () {
                    this.app.setBusy(false);
                }.bind(this));
            }
        },

        /**
         * Checking the Contact email information and Authorization from back-end
         */
        checkC4CContact: function () {

            var sUserEmail = sap.ushell.Container.getUser().getEmail();
            if (this.component.contactID && this.component.contactUUID) {
                var view = this.getView();
                view.byId("addButton").setEnabled(true);
                view.byId("downloadButton").setEnabled(true);
            } else {
                MessageToast.show("You cannot view or create tickets because your email " + sUserEmail + " is not assigned to a contact in the C4C tenant", {Duration: 5000});
            }

        },


        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Handler method before the master view is rendered.
         */
        onBeforeRendering: function () {
            this.checkC4CContact();
            this.setListFilters();
        },

        /**
         * Handler method when drop-down plugin 'Service Category' is selected.
         * which is the parent object for drop-down plugin: 'incident category', then the metadata for 'incident category' will
         * be loaded and default value will be set for drop-down plugin: 'incident category'.
         */
        onServiceCategorySelectCreateFragment: function () {
            var createServiceSelect = sap.ui.getCore().byId("createServiceCategory");
            this.getIncidentCategoryList({
                parentObject: createServiceSelect.getSelectedItem().data("parentObject"),
                typeCode: createServiceSelect.getSelectedItem().data("typeCode"),
                incidentCategoryControl: sap.ui.getCore().byId("createIncidentCategory"),
                serviceRequestMockData: this.oDialog.getModel("ServiceRequest").getData(),
                incidentModel: this.oDialog.getModel("IncidentModel")
            });
        },

        /**
         * After list data is available, this handler method updates the
         * master list counter and hides the pull to refresh control, if
         * necessary.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished: function (oEvent) {
            // update the master list object counter after new data is loaded
            this._updateListItemCount(oEvent.getParameter("total"));
            // hide pull to refresh if necessary
            this.byId("pullToRefresh").hide();
            var items = this._oList.getItems();
            var self = this;

        },

        /**
         * Open Create New Ticket Dialog by parameters in URL.
         */
        openNewTicketParam: function () {
            var startupParams = this.component.startupParams;
            if (window.location.hash.substring(1).indexOf("createNewTicket=true") > -1 || startupParams.createNewTicket === "true") {
                if (!this.initialCreateTicketOpened) {
                    var newSiteProperties = window.location.hash.substring(1).split('?')[1];
                    this.onAdd(this.splitData(newSiteProperties));
                    this.initialCreateTicketOpened = true;
                }
            }
        },

        /**
         * Event handler for the master search field. Applies current
         * filter value and triggers a new search. If the search field's
         * 'refresh' button has been pressed, no new search is triggered
         * and the list binding is refresh instead.
         * @param {sap.ui.base.Event} oEvent the search event
         * @public
         */
        onSearch: function (oEvent) {
            if (oEvent.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any master list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
                return;
            }

            var sQuery = oEvent.getParameter("query");

            if (sQuery) {
                this._oListFilterState.aSearch = [new Filter("Name/content", FilterOperator.Contains, sQuery)];
            } else {
                this._oListFilterState.aSearch = [];
            }
            this._applyFilterSearch();

        },

        /**
         * Event handler for refresh list panel. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh: function () {
            this._oList.getBinding("items").refresh();
            this.refreshServiceRequestList();
        },

        /**
         * Event handler for the list selection event
         * @param {sap.ui.base.Event} oEvent the list selectionChange event
         * @public
         */
        onSelectionChange: function (oEvent) {
            // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
            this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
        },

        /**
         * Event handler for the bypassed event, which is fired when no routing pattern matched.
         * If there was an object selected in the master list, that selection is removed.
         * @public
         */
        onBypassed: function () {
            this._oList.removeSelections(true);
        },

        /**
         * Used to create GroupHeaders with non-capitalized caption.
         * These headers are inserted into the master list to
         * group the master list's items.
         * @param {Object} oGroup group whose text is to be displayed
         * @public
         * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
         */
        createGroupHeader: function (oGroup) {
            return new GroupHeaderListItem({
                title: oGroup.text,
                upperCase: false
            });
        },
        splitData: function (urlData) {
            var result = {};
            if (urlData) {
                var query = urlData;
                query.split("&").forEach(function (part) {
                    var item = part.split("=");
                    result[item[0]] = decodeURIComponent(item[1]);
                });
            }
            return result;
        },

        /**
         * Event handler method to add new ticket
         * @param context
         */
        onAdd: function (context) {
            var sUserEmail = sap.ushell.Container.getUser().getEmail();
            if (this.component.contactID && this.component.contactUUID) {
                if (!this.oDialog) {
                    var _self = this;
                    this.oDialog = sap.ui.xmlfragment("ServiceRequests.fragment.Create", this);
                    var dialogModel = new JSONModel();
                    dialogModel.setProperty("createEnabled", false);
                    dialogModel.setProperty("titleInput", '');
                    dialogModel.setProperty("descriptionInput", '');
                    var incidentModel = new JSONModel({results: []});
                    this.oDialog.setModel(incidentModel, "IncidentModel");
                    var isMock = this.getOwnerComponent().mockData;
                    if (isMock) {
                        var mockModel = new JSONModel(jQuery.sap.getModulePath("ServiceRequests") + "/mock/serviceMockData.json");
                        mockModel.attachRequestCompleted(function () {
                            _self.oDialog.setModel(new JSONModel(this.getData().ServiceRequest), "ServiceRequest");
                            _self.oDialog.open();
                        });
                    } else {
                        var oCreateModel = {};
                        this.oDialog.setModel(new JSONModel(oCreateModel), "ServiceRequest");
                        this._initMetaData(oCreateModel);
                        // this.oDialog.setModel(this.getOwnerComponent().getModel(), "ServiceRequest");
                    }
                    this.oDialog.setModel(dialogModel);
                    this.oDialog.attachAfterClose(function () {
                        //this.initialCreateTicketOpened = false;
                        this.oDialog.destroy();
                        this.oDialog = null;
                    }.bind(this));
                    this.getView().addDependent(this.oDialog);
                    this.oDialog.attachAfterOpen(function () {
                        this.onDialogOpen(context);
                    }.bind(this));
                    if (!isMock) {
                        this.oDialog.open();
                    }
                }
            } else {
                MessageToast.show("You cannot view or create tickets because your email " + sUserEmail + " is not assigned to a contact in the C4C tenant", {Duration: 5000});
            }

        },

        /**
         * Initialize/loading the metadata for drop-down UI plugin
         * @param {object} oServiceRequestModel
         * @private
         */
        _initMetaData: function (oServiceRequestModel) {
            var serviceRequestServicePriorityPromise = this.getServiceRequestServicePriorityCodePromise();
            serviceRequestServicePriorityPromise.then(function (oData) {
                if (oData && oData.error) {
                    UtilityHandler.raiseErrorMessageWrap(oData.error);
                } else {
                    oServiceRequestModel.ServiceRequestServicePriorityCodeCollection = oData;
                    this.oDialog.setModel(new JSONModel(oServiceRequestModel), "ServiceRequest");
                }
            }.bind(this)).catch(function (oError) {
                // Catch exceptions:
                UtilityHandler.onErrorDataReadWrap(oError);
            }.bind(this));

            var serviceCategoryPromise = this.getServiceCategoryPromise();
            serviceCategoryPromise.then(function (oData) {
                if (oData && oData.error) {
                    UtilityHandler.raiseErrorMessageWrap(oData.error);
                } else {
                    oServiceRequestModel.ServiceIssueCategoryCatalogueCategoryCollection = oData;
                    this.oDialog.setModel(new JSONModel(oServiceRequestModel), "ServiceRequest");
                }
            }.bind(this)).catch(function (oError) {
                // Catch exceptions:
                UtilityHandler.onErrorDataReadWrap(oError);
            }.bind(this));

            var productionPromise = this.getProductCollectionPromise();
            productionPromise.then(function (oData) {
                if (oData && oData.error) {
                    UtilityHandler.raiseErrorMessageWrap(oData.error);
                } else {
                    oServiceRequestModel.ProductCollection = oData;
                    this.oDialog.setModel(new JSONModel(oServiceRequestModel), "ServiceRequest");
                }
            }.bind(this)).catch(function (oError) {
                // Catch exceptions:
                UtilityHandler.onErrorDataReadWrap(oError);
            }.bind(this));
        },

        /**
         * Event hanlder when creation dialog is open.
         * @param context
         */
        onDialogOpen: function (context) {
            var serviceCategorySelect = sap.ui.getCore().byId("createServiceCategory"),
                incidentCategorySelect = sap.ui.getCore().byId("createIncidentCategory");
            incidentCategorySelect.setBusy(true);
            for (var select in context) {
                if (select.toLocaleLowerCase() !== "createnewticket") {
                    var selectBox = sap.ui.getCore().byId('create' + select);
                    if (selectBox) {
                        selectBox.setSelectedKey(context[select]);
                    }
                }
            }
            if (this.getOwnerComponent().mockData) {
                this.serviceCategoryLoaded();
            } else {
                //serviceCategorySelect.getBinding("items").attachEvent('change', this.serviceCategoryLoaded.bind(this));
                serviceCategorySelect.attachChange(this.serviceCategoryLoaded.bind(this));
                this.serviceCategoryLoaded();
            }

        },

        /**
         * Handler method when 'Service Category' is loaded
         * @param oEvent
         */
        serviceCategoryLoaded: function (oEvent) {
            var that = this;
            var serviceRequestModel = this.oDialog.getModel("ServiceRequest");
            var incidentModel = this.oDialog.getModel("IncidentModel");
            var createCategoryControl = sap.ui.getCore().byId("createServiceCategory");
            var incidentCategoryControl = sap.ui.getCore().byId("createIncidentCategory");
            if (this.getOwnerComponent().mockData) {

                var mockModelData = this.oDialog.getModel("ServiceRequest").getData(),
                    parentObject = mockModelData.ServiceIssueCategoryCatalogueCategoryCollection[0].ParentObjectID;
                incidentModel = mockModelData.IncidentModel;
                this.initIncidentModel(incidentModel[parentObject], incidentCategoryControl, incidentModel);
            } else {
                var selectedData, ParentObjectID, TypeCode;
                if (oEvent) {
                    selectedData = oEvent.oSource.getSelectedItem().data();
                } else {
                    selectedData = createCategoryControl.getSelectedItem().data();
                }
                ParentObjectID = selectedData.parentObject;
                TypeCode = selectedData.typeCode;

                this.utilityHandler.oModelRead(serviceRequestModel, '/getIncidentCategory', {
                    filters: this.createIncidentCategoryFilters(ParentObjectID, TypeCode),
                    success: function (oData) {
                        this.initIncidentModel(oData, incidentCategoryControl, incidentModel);
                    }.bind(this),
                    error: this.onIncidentFailed.bind(this)
                });
            }
        },

        /**
         * Local Event handler method: when 'Incident Category' is loaded failure.
         * @param jqXHR
         */
        onIncidentFailed: function (jqXHR) {
            var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
            if (errorMessage) {
                MessageBox.error(errorMessage);
            }
            this.getView().byId("createIncidentCategory").setBusy(false);

        },

        /**
         * Event handler method: Confirm on creation UI to create new ticket to back-end
         */
        onDialogAdd: function () {
            this.createTicket();
        },

        /**
         * Event handler when new attachment file is uploaded
         * @param oEvent
         */
        onFileChange: function (oEvent) {
            this.fileToUpload = oEvent.getParameter("files")["0"];
        },

        /**
         * Core logic to insert new created ticket to back-end.
         */
        createTicket: function () {
            var view = this.getView(),
                core = sap.ui.getCore(),
                titleInput = core.byId("createTitle"),
                descriptionInput = core.byId("createDescription");

            titleInput.setValueState(titleInput.getValue() ? "None" : "Error");
            descriptionInput.setValueState(descriptionInput.getValue() ? "None" : "Error");
            if (!titleInput.getValue() || !descriptionInput.getValue()) {
                return;
            }
            var mockData = {
                "RequestAssignmentStatusCode": "2",
                "CompletedOnDate": "\/Date(1465344000000)\/",
                "ObjectID": this.createMockGUID(),
                "ActivityServiceIssueCategoryID": "",
                "ApprovalStatusCode": "1",
                "CauseServiceIssueCategoryID": "",
                "ChangedBy": "Test Agent",
                "CompletionDueDate": "\/Date(1465603200000)\/",
                "ContractID": "",
                "CreatedBy": "Juliane Beyer",
                "CreationDate": new Date(),
                "Customer": "",
                "CustomerID": "",
                "DataOriginTypeCode": "1",
                "ID": "6006",
                "IncidentCategoryName": {
                    "__metadata": {
                        "type": "c4codata.MEDIUM_Name"
                    },
                    "content": ""
                },
                "ActivityCategoryName": {
                    "__metadata": {
                        "type": "c4codata.MEDIUM_Name"
                    },
                    "content": ""
                },
                "CauseCategoryName": {
                    "__metadata": {
                        "type": "c4codata.MEDIUM_Name"
                    },
                    "content": ""
                },
                "IncidentServiceIssueCategoryID": core.byId("createIncidentCategory").getSelectedKey(),
                "InitialReviewDueDate": "\/Date(1465344000000)\/",
                "InstallationPointID": "",
                "InstalledBaseID": "",
                "ItemListServiceRequestExecutionLifeCycleStatusCode": "1",
                "LastChangeDate": "\/Date(1466035200000)\/",
                "LastResponseOnDate": "\/Date(1465344000000)\/",
                "Name": {
                    "__metadata": {
                        "type": "c4codata.EXTENDED_Name"
                    },
                    "languageCode": "E",
                    "content": titleInput.getValue()
                },
                "NextResponseDueDate": null,
                "ObjectCategoryName": {
                    "__metadata": {
                        "type": "c4codata.MEDIUM_Name"
                    },
                    "content": ""
                },
                "ObjectServiceIssueCategoryID": "",
                "Partner": "",
                "PartnerID": "",
                "ProcessingTypeCode": "SRRQ",
                "ProductID": core.byId("createProductCategory").getSelectedKey(),
                "ReferenceDate": null,
                "ReportedForEmail": "",
                "ReportedForPartyID": "",
                "ReporterEmail": "guy.roth@SAP.COM",
                "ReporterPartyID": "1001702",
                "RequestedEnd": "2016-06-11T07:00:00Z",
                "RequestedEndTimeZoneCode": "PST",
                "RequestedStart": "2016-06-10T07:00:00Z",
                "RequestedStartTimeZoneCode": "PST",
                "RoleCode": "8",
                "SalesTerritoryID": "",
                "SerialID": "",
                "ServiceCategoryName": {
                    "__metadata": {
                        "type": "c4codata.MEDIUM_Name"
                    },
                    "content": "Account Support"
                },
                "ServiceIssueCategoryID": core.byId("createServiceCategory").getSelectedKey(),
                "ServiceLevelAgreement": "CLOUDFORSERVICE_STANDARD",
                "ServicePriorityCode": core.byId("createPriority").getSelectedKey(),
                "ServiceRequestClassificationCode": "",
                "ServiceRequestLifeCycleStatusCode": "1",
                "ServiceTechnician": "",
                "ServiceTechnicianTeam": "",
                "WarrantyDescription": "",
                "WarrantyFrom": null,
                "WarrantyTo": null,
                "ServiceAndSupportTeam": "S3110",
                "ServiceRequestUserLifeCycleStatusCode": "4",
                "AssignedTo": "",
                "EscalationStatus": "1",
                "AssignedToName": {
                    "__metadata": {
                        "type": "c4codata.ENCRYPTED_LONG_Name"
                    },
                    "languageCode": "",
                    "content": ""
                },
                "ProductCategoryDescription": "Sweets",
                "InitialResponseDate": "\/Date(1465344000000)\/",
                "Contact": "",
                "ParentServiceRequest": "",
                "ETag": "\/Date(1466098359312)\/",
                "CreationDateTime": new Date(),
                "LastChangeDateTime": "\/Date(1466098359312)\/",
                "RequestAssignmentStatusCodeText": "Requestor Action",
                "ApprovalStatusCodeText": "Not Started",
                "DataOriginTypeCodeText": "Manual data entry",
                "ItemListServiceRequestExecutionLifeCycleStatusCodeText": "Open",
                "ProcessingTypeCodeText": "Service Request",
                "RoleCodeText": "Service Point",
                "ServicePriorityCodeText": core.byId("createPriority").getSelectedItem().getText(),
                "ServiceRequestClassificationCodeText": "",
                "ServiceRequestLifeCycleStatusCodeText": "In Process",
                "ServiceRequestUserLifeCycleStatusCodeText": "Open",
                "EscalationStatusText": "Not Escalated",
                "ServiceRequestItem": {
                    "__deferred": {
                        "uri": "/servicerequests/destinations/c4c/sap/byd/odata/v1/c4codata/ServiceRequestCollection('00163E08A7AF1EE68BB3A36C8C740442')/ServiceRequestItem"
                    }
                },
                "ServiceRequestAttachmentFolder": [],
                "ServiceRequestDescription": []
            };
            var data = {
                ReporterPartyID: this.component.contactID,
                Name: {
                    content: titleInput.getValue()
                },
                ServiceRequestLifeCycleStatusCode: "1",
                ServicePriorityCode: core.byId("createPriority").getSelectedKey(),
                ProductID: core.byId("createProductCategory").getSelectedKey(),
                ServiceIssueCategoryID: core.byId("createServiceCategory").getSelectedKey(),
                IncidentServiceIssueCategoryID: core.byId("createIncidentCategory").getSelectedKey()
            };

            this.oDialog.setBusy(true);
            if (!this.mockData) {
                var model = view.getModel();
                var url = UtilityHandler.getHost() + '/postServiceRequests';
                this.postHttpRequest({
                    url: url,
                    data: data,
                    success: this.setTicketDescription.bind(this),
                    error: function (jqXHR) {
                        var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                        var error = errorMessage ? errorMessage : 'The Ticket could not be created.';
                        MessageBox.error(error);
                        this.oDialog.setBusy(false);
                    }.bind(this)
                });
            } else {
                this.setTicketDescription(mockData);
            }
        },

        createMockGUID: function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1)
                    .toUpperCase();
            }

            return s4() + s4() + s4() + s4() +
                s4() + s4() + s4() + s4();
        },

        /**
         * Core Logic of Post description to back-end server.
         * @param {object} result
         */
        setTicketDescription: function (result) {
            if (!this.mockData) {
                var model = this.getModel(),
                    authorUUID = this.component.contactUUID;
                var baseID = result.ObjectID;
                var url = UtilityHandler.getHost() + "/postServiceRequestDescription",
                    text = sap.ui.getCore().byId("createDescription").getValue();

                this.postHttpRequest({
                    url: url,
                    data: {
                        baseID: baseID,
                        AuthorUUID: authorUUID,
                        Text: text
                    },
                    success: function () {
                        this.uploadAttachment(result);
                    }.bind(this),
                    error: function (jqXHR) {
                        var error = "The service request was created successfully, but a description could not be set";
                        var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                        error = errorMessage ? error + ":" + errorMessage : error;
                        MessageBox.error(error);
                        this.oDialog.setBusy(false);
                    }
                });
            } else {
                var serviceData = result.ServiceRequestDescription;
                var user = sap.ushell.Container.getUser();
                var dataDescription = {
                    TypeCode: "10004",
                    AuthorName: user.getFullName(),
                    Text: sap.ui.getCore().byId("createDescription").getValue(),
                    CreatedOn: new Date()
                };
                serviceData.push(dataDescription);
                this.uploadAttachment(result);
            }
        },


        uploadAttachment: function (result) {
            if (this.fileToUpload) {
                var fileReader = new FileReader();
                fileReader.onload = function (e) {
                    this.uploadFile(e, result);
                }.bind(this);
                fileReader.readAsBinaryString(this.fileToUpload);
            } else {
                this.finishCreateTicket(result);
            }
        },

        /**
         * Core Logic to upload attachment file to back-end server.
         * @param e
         * @param result
         */
        uploadFile: function (e, result) {
            var model = this.getModel();
            if (!this.mockData) {
                var dataMock = {
                    Name: this.fileToUpload.name,
                    Binary: window.btoa(e.target.result),
                    baseID: result.ObjectID
                };
                var url = UtilityHandler.getHost() + '/postServiceRequestAttachment';
                this.postHttpRequest({
                    url: url,
                    data: dataMock,
                    success: this.finishCreateTicket.bind(this),
                    error: function (jqXHR) {
                        var error = 'The service request was created successfully, but the attachment could not be uploaded';
                        var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                        var error = errorMessage ? errorMessage : error;
                        MessageBox.error(error);
                        this.oDialog.setBusy(false);
                    }
                });
            } else {
                var data = {
                    Name: this.fileToUpload.name,
                    fileBlob: new Blob([this.fileToUpload], {type: "any"})
                };

                var attachmentData = result.ServiceRequestAttachmentFolder;
                attachmentData.push(data);
                this.finishCreateTicket(result);
            }
            this.fileToUpload = null;
        },

        /**
         * Common logic on UI: After ticket has finished creation, show success message and close the dialog
         * @param data
         */
        finishCreateTicket: function (data) {
            var model = this.getModel(),
                modelData = model.getData();
            if (data && this.mockData) {
                var arrayToInsert = [data],
                    oldData = modelData.ServiceRequestCollection,
                    newArr = arrayToInsert.concat(oldData);
                model.setData({ServiceRequestCollection: newArr});
            }
            MessageToast.show("The service request was created successfully");
            this.oDialog.setBusy(false);
            this._oList.removeSelections();
            this.oDialog.close();
            this.refreshServiceRequestList();
            if (this.mockData) {
                this.updateMockItemDetails();
            }
        },

        /**
         * Refresh the List panel of all Service requests with retrieving data from back-end.
         */
        refreshServiceRequestList: function () {
            var oListView = this.byId("list");
            oListView.setBusy(true);
            var model = this.getModel();
            this._oList.removeSelections();
            this.getServiceRequestListBackend(this.getOwnerComponent().getModel("listModel"), function () {
                oListView.setBusy(false);
            }.bind(this));
            model.refresh();
        },
        updateMockItemDetails: function () {
            var items = this._oList.getItems();
            this._showDetail(items[0]);
        },
        onDialogCancel: function () {
            this.oDialog.close();
        },
        onTitleChange: function (oEvent) {
            var titleInput = oEvent.getSource();
            if (this.isStringEmpty(titleInput.getValue())) {
                titleInput.setValueState(sap.ui.core.ValueState.Error);
                titleInput.setValueStateText("Please enter a value");
            } else {
                titleInput.setValueState(sap.ui.core.ValueState.None);
                var createBtn = sap.ui.getCore().byId("addDialogCreateButton");
                if (this.isCreateTicketEnabled(titleInput.getValue(), sap.ui.getCore().byId("createDescription").getValue())) {
                    createBtn.setEnabled(true);
                } else {
                    createBtn.setEnabled(false);
                }
            }
        },
        onTextAreaChange: function (oEvent) {
            var textareaInput = oEvent.getSource();
            if (this.isStringEmpty(textareaInput.getValue())) {
                textareaInput.setValueState(sap.ui.core.ValueState.Error);
                textareaInput.setValueStateText("Please enter a value");
            } else {
                textareaInput.setValueState(sap.ui.core.ValueState.None);
                var createBtn = sap.ui.getCore().byId("addDialogCreateButton");
                if (this.isCreateTicketEnabled(sap.ui.getCore().byId("createTitle").getValue(), textareaInput.getValue())) {
                    createBtn.setEnabled(true);
                } else {
                    createBtn.setEnabled(false);
                }
            }
        },
        isCreateTicketEnabled: function (titleInput, descriptionInput) {
            if (titleInput && descriptionInput) {
                return (titleInput.trim().length !== 0 && descriptionInput.trim().length !== 0);
            }
            return false;

        },
        isStringEmpty: function (text) {
            return text.trim().length === 0;
        },

        /**
         * Set filters directly on List plugin
         */
        setListFilters: function () {
            var startupParams = this.component.startupParams;
            // if (!this.mockData) {
            // 	var userEmail = sap.ushell.Container.getUser().getEmail();
            // 	//this._oListFilterState.aFilter.push(new Filter("ReporterEmail", FilterOperator.EQ, userEmail));
            // }
            if (startupParams.pendingResponse) {
                this._oListFilterState.aFilter.push(new Filter("ServiceRequestUserLifeCycleStatusCode", FilterOperator.EQ, "4"));
            } else {
                this._oListFilterState.aFilter.push(new Filter("ServiceRequestUserLifeCycleStatusCodeText", FilterOperator.NE, "Completed"));
                if (startupParams.highPriority) {
                    this._oListFilterState.aFilter.push(new Filter("ServicePriorityCode", FilterOperator.LT, "3"));
                }
            }
            this._oList.getBinding("items").filter(this._oListFilterState.aFilter, "Application");
        },

        /**
         *  Event handler method: downloading the ticket lists to excel
         */
        onDownload: function () {
            var download = new Export({
                exportType: new ExportTypeCSV({
                    separatorChar: ","
                }),

                models: this.getView().getModel(),

                rows: {
                    path: "/ServiceRequestCollection",
                    filters: this._oListFilterState.aFilter
                },

                columns: [{
                    name: "Title",
                    template: {
                        content: "{Name/content}"
                    }
                }, {
                    name: "Priority",
                    template: {
                        content: "{ServicePriorityCodeText}"
                    }
                }, {
                    name: "Status",
                    template: {
                        content: "{ServiceRequestUserLifeCycleStatusCodeText}"
                    }
                }, {
                    name: "Product Category",
                    template: {
                        content: "{ProductCategoryDescription}"
                    }
                }, {
                    name: "Service Issue Category",
                    template: {
                        content: "{ServiceCategoryName/content}"
                    }
                }, {
                    name: "Incident Category ID",
                    template: {
                        content: "{IncidentServiceIssueCategoryID}"
                    }
                }]
            });

            download.saveFile().catch(function (error) {
                MessageBox.error(error);
            }).then(function () {
                download.destroy();
            });
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        priorityFormatter: function (priotityText) {
            if (priotityText === "Normal") {
                return "Success";
            } else if (priotityText === "Urgent") {
                return "Warning";
            } else if (priotityText === "Immediate") {
                return "Error";
            } else {
                return "None";
            }
        },

        /**
         * @private Initialize JSON Model 'Master View Model' to control view display
         * @returns {JSONModel}
         *
         */
        _createViewModel: function () {
            return new JSONModel({
                isFilterBarVisible: false,
                filterBarLabel: "",
                delay: 0,
                title: this.getResourceBundle().getText("masterTitleCount", [0]),
                noDataText: this.getResourceBundle().getText("masterListNoDataText"),
                sortBy: "Name/content",
                groupBy: "None"
            });
        },

        /**
         * If the master route was hit (empty hash) we have to set
         * the hash to to the first item in the list as soon as the
         * listLoading is done and the first item in the list is known
         * @private
         */
        _onMasterMatched: function () {

            var self = this;
            this.getModel().attachRequestCompleted(function (mPara) {
                var oList = mPara.getParameter("list");
                if (!oList || oList.getMode() === "None") {
                    return;
                }
                var oFirstListitem = mPara.getParameter("firstListitem");
                if (oFirstListitem) {
                    var sObjectId = oFirstListitem.getBindingContext().getProperty("ObjectID");
                    this.getRouter().navTo("object", {
                        objectId: sObjectId
                    }, true);
                }
                if (oList.getItems().length === 0) {
                    this.getRouter().getTargets().display("detailNoObjectsAvailable").then(function () {
                        self.openNewTicketParam();
                    });
                    // Nav to error page with 'No data' warning message
                    //this.getRouter().navTo("nodata");
                    //self.openNewTicketParam();
                } else {
                    // Set selected as first item and nav to detail message
                    if (!oList.getSelectedItem() && oList.getItems().length > 0) {
                        oList.setSelectedItem(oList.getItems()[0]);
                        this._showDetail(oList.getItems()[0]);
                    }
                    this.openNewTicketParam();
                }

            }.bind(this));

            this.getModel().attachRequestFailed(function (mParams) {
                if (mParams.error) {
                    return;
                }
                this.getRouter().navTo("nodata");
                // this.getRouter().getTargets().display("detailNoObjectsAvailable");
                this.app.setBusy(false);
            }.bind(this));

        },

        /**
         * Shows the selected item on the detail page
         * On phones a additional history entry is created
         * @param {sap.m.ObjectListItem} oItem selected Item
         * @private
         */
        _showDetail: function (oItem) {
            var bReplace = !Device.system.phone;
            this.getRouter().navTo("object", {
                objectId: oItem.getBindingContext().getProperty("ObjectID")
            }, bReplace);

        },

        /**
         * Sets the item count on the master list header
         * @param {integer} iTotalItems the total number of items in the list
         * @private
         */
        _updateListItemCount: function (iTotalItems) {
            var sTitle;
            // only update the counter if the length is final
            if (this._oList.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
                this.getModel("masterView").setProperty("/title", sTitle);
            }
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @private
         */
        _applyFilterSearch: function () {
            var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
                oViewModel = this.getModel("masterView");
            this._oList.getBinding("items").filter(aFilters, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aFilters.length !== 0) {
                oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
            } else if (this._oListFilterState.aSearch.length > 0) {
                // only reset the no data text to default when no new search was triggered
                oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
            }
        },

        /**
         * Internal helper method to apply both group and sort state together on the list binding
         * @param {sap.ui.model.Sorter[]} aSorters an array of sorters
         * @private
         */
        _applyGroupSort: function (aSorters) {
            this._oList.getBinding("items").sort(aSorters);
        },

        /**
         * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
         * @param {string} sFilterBarText the selected filter value
         * @private
         */
        _updateFilterBar: function (sFilterBarText) {
            var oViewModel = this.getModel("masterView");
            oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
            oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
        }

    });

});