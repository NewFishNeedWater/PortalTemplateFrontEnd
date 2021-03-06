sap.ui.define([
	"ServiceRequests/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"ServiceRequests/model/formatter",
	"sap/m/FeedListItem",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/StandardListItem",
	"sap/m/ListType",
	'sap/ui/model/odata/v2/ODataModel',
	'sap/ui/comp/valuehelpdialog/ValueHelpDialog',
	'sap/ui/table/Table',
	'sap/ui/comp/filterbar/FilterBar',
	"sap/ui/core/routing/History",
    "ServiceRequests/controller/UtilityHandler",
], function(BaseController, JSONModel, formatter, FeedListItem, MessageBox, MessageToast, StandardListItem, ListType, ODataModel, ValueHelpDialog, Table, FilterBar, History, UtilityHandler) {
	"use strict";

	return BaseController.extend("ServiceRequests.controller.Detail", {

		formatter: formatter,
		app: null,
		fileToUpload: null,
		max_fileSize: 2000000, // Max upload file size: 2MB
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function() {

			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});
			this.createNewTicket = false;
			var oView = this.getView();
			var _self = this;
			this.utilityHandler = new UtilityHandler();
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");

            this.app = this.getOwnerComponent().getAggregation("rootControl");
			var isMock = this.getOwnerComponent().mockData;
			if (isMock) {
				this._onMetadataLoaded();
				var mockModel = new JSONModel(jQuery.sap.getModulePath("ServiceRequests") + "/mock/serviceMockData.json");
				mockModel.attachRequestCompleted(function() {
					var mockModelData = this.getData();
					oView.setModel(new JSONModel(mockModelData.ServiceRequest), "ServiceRequest");
					oView.setModel(new JSONModel(mockModelData.LifeCycleModel), "LifeCycleModel");
					oView.setModel(new JSONModel({results: []}), "IncidentModel");
					_self._selectInfoService();
					_self.setSelectsToBusy(false);
					_self.getIncidentCategoryListWrap();
					_self.mockModelLoaded = true;
				});
				this.setModel(mockModel, "MockModel");
			} else {
                this._onMetadataLoaded();
                this._initMetaData();
                this.setModel(this.getOwnerComponent().getModel("listModel"));
			}

			this.app.setBusyIndicatorDelay(0);
			oView.setBusyIndicatorDelay(0);
			if (isMock) {
				var serviceModel = oView.getModel("ServiceRequest");
				if (!serviceModel) {
					this.setSelectsToBusy(true);
				}
			}
		},

        /**
         * @private Initialize or loading the metadata for dropdown UI plugins
         */
		_initMetaData:function(){
            var oView = this.getView();
			var oServiceRequestData = {};
            oView.setModel(new JSONModel({results: []}), "IncidentModel");

            var serviceRequestServicePriorityPromise = this.getServiceRequestServicePriorityCodePromise();
            serviceRequestServicePriorityPromise.then(function(oData){
                if(oData && oData.error){
                    UtilityHandler.raiseErrorMessageWrap(oData.error);
                }else{
                    oServiceRequestData.ServiceRequestServicePriorityCodeCollection = oData;
                    oView.setModel(new JSONModel(oServiceRequestData), "ServiceRequest");
                }
            }.bind(this), UtilityHandler.onErrorDataReadWrap).catch(function(oError){
                // Catch exceptions:
                UtilityHandler.onErrorDataReadWrap(oError);
            }.bind(this));

            var serviceCategoryPromise = this.getServiceCategoryPromise();
            serviceCategoryPromise.then(function(oData){
                if(oData && oData.error){
                    UtilityHandler.raiseErrorMessageWrap(oData.error);
                }else{
                    oServiceRequestData.ServiceIssueCategoryCatalogueCategoryCollection = oData;
                    oView.setModel(new JSONModel(oServiceRequestData), "ServiceRequest");
                    this.getIncidentCategoryListWrap();
                }
            }.bind(this), UtilityHandler.onErrorDataReadWrap).catch(function(oError){
                // Catch exceptions:
                UtilityHandler.onErrorDataReadWrap(oError);
            }.bind(this));

            var productionPromise = this.getProductCollectionPromise();
            productionPromise.then(function(oData){
                if(oData && oData.error){
                    UtilityHandler.raiseErrorMessageWrap(oData.error);
                }else{
                    oServiceRequestData.ProductCollection = oData;
                    oView.setModel(new JSONModel(oServiceRequestData), "ServiceRequest");
                }
            }.bind(this), UtilityHandler.onErrorDataReadWrap).catch(function(oError){
                // Catch exceptions:
                UtilityHandler.onErrorDataReadWrap(oError);
            }.bind(this));
		},

        /**
		 * @private Set selected value of UI drop-down:'infoServiceCategorySelect' from model.
         */
		_selectInfoService: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding(),
				sPath;
			if (oElementBinding) {
				sPath = oElementBinding.getPath();
			} else {
				//if no element was selected, select first on mockItems
				sPath = '/ServiceRequestCollection/0';
			}
			var oModel = this.getModel(),
				selectedKey = oModel.getObject(sPath).ServiceIssueCategoryID;
			oView.byId("infoServiceCategorySelect").setSelectedKey(selectedKey);
		},


        /**
		 * Batch set drop-down plugins busy status, Only for mock data
         * @param val
         */
		setSelectsToBusy: function(val) {
			var oView = this.getView();
			oView.byId("infoPrioritySelect").setBusy(val);
			oView.byId("infoProductCategorySelect").setBusy(val);
			oView.byId("infoServiceCategorySelect").setBusy(val);
			oView.byId("infoIncidentCategorySelect").setBusy(val);
		},

        /**
		 * Handler method when insert new ticket to back-end
         * @param oEvent
         */
		onPost: function(oEvent) {
			var view = this.getView(),
				model = view.getModel(),
				sPath = view.getElementBinding().getPath(),
				authorUUID = this.getOwnerComponent().contactUUID,
				text = oEvent.getSource().getValue();
			if (!this.getOwnerComponent().mockData) {
                var baseID = this.getModel().getObject(sPath).ObjectID;
				var url = UtilityHandler.getHost()+ '/postServiceRequestDescription';
				this.app.setBusy(true);
                var detailView = this.getModel("detailView");
                detailView.setProperty("/busy", true);
                this.postHttpRequest({
                    url: url,
                    data: {
                        TypeCode: "10008",
                        AuthorUUID: authorUUID,
                        Text: text,
                        baseID: baseID
                    },
                    success: function(oData) {
                        if(oData && oData.error){
                            UtilityHandler.raiseErrorMessageWrap(oData.error);
                        }
                        this.loadTicketDetail();
                    }.bind(this),
                    error: function(jqXHR) {
                        var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                        var error = errorMessage?errorMessage:'The ticket could not be saved';
                        MessageBox.error(error);
                    },
                    complete: function() {
                        this.app.setBusy(false);
                    }.bind(this)
				});

			} else {
				var serviceData = model.getData().ServiceRequestCollection[parseInt(view.getElementBinding().getPath().split("/")[2])].ServiceRequestDescription;
				var user = sap.ushell.Container.getUser();
				var dataDescription = {
					TypeCode: "10008",
					AuthorName: user.getFullName(),
					Text: text,
					CreatedOn: new Date()
				};
				serviceData.push(dataDescription);
				model.refresh();
				this._populateDescriptionsList(view.getElementBinding().getPath());
			}
		},

        /**
         * Handler method when clicking and download attachment
         * @param oEvent
         */
		onAttachmentPress: function(oEvent) {
			var item = oEvent.getParameter("listItem");
			var link = document.createElement("a");
			link.target = "_blank";
			if (item.data("uri").fileBlob) {
				link.href = URL.createObjectURL(item.data("uri").fileBlob);
				link.download = item.data("uri").Name;
			} else {
				link.href = item.data("uri");
				link.download = item.getAggregation("cells")[0].getText();
			}
			link.click();
		},

        /**
		 * Handler method when switch to [Edit] mode
         */
		onEdit: function() {
			this._setEditMode(true);
		},

        /**
         * Handler method when switch from [Edit] mode to display mode
         */
		onCancel: function() {
			this._setEditMode(false);
		},

        /**
         * Handler method when saving the edit data to back-end
         */
		onSave: function() {
			var view = this.getView(),
                sPath = view.getElementBinding().getPath(),
				model = view.getModel();


			var patch = {
				ServicePriorityCode: view.byId("infoPrioritySelect").getSelectedKey(),
				ProductID: view.byId("infoProductCategorySelect").getSelectedKey(),
				ServiceIssueCategoryID: view.byId("infoServiceCategorySelect").getSelectedKey(),
				IncidentServiceIssueCategoryID: view.byId("infoIncidentCategorySelect").getSelectedKey(),
                baseID:  this.getModel().getObject(sPath).ObjectID
			};

			var patchMock = {
				ServicePriorityCode: view.byId("infoPrioritySelect").getSelectedKey(),
				ServicePriorityCodeText: view.byId("infoPrioritySelect").getSelectedItem().getProperty("text"),
				ProductID: view.byId("infoProductCategorySelect").getSelectedKey(),
				ServiceIssueCategoryID: view.byId("infoServiceCategorySelect").getSelectedKey()
			};

			if (this.getOwnerComponent().mockData) {
				var sPathMock = view.getElementBinding().getPath(),
					ind = parseInt(sPathMock.split('/')[2]),
					data = model.getData(),
					arr = data.ServiceRequestCollection,
					objToUpdate = arr[ind];
				jQuery.extend(true, objToUpdate, patchMock);
				MessageToast.show("The service request was updated successfully");
				model.setData(data);
				model.refresh(true);
				this._setEditMode(false);
			} else {
				this.app.setBusy(true);
                var detailView = this.getModel("detailView");
                detailView.setProperty("/busy", true);
				// var sPath = view.getElementBinding().getPath(),
				var url = UtilityHandler.getHost()+'/patchServiceRequests';

				this.postHttpRequest({
                    url: url,
                    data: patch,
                    method: "PATCH",
                    success: function(oData) {
                        if(oData && oData.error){
                            UtilityHandler.raiseErrorMessageWrap(oData.error);
                        }else{
                            MessageToast.show("The service request was updated successfully");
                        }
                        this.getModel().refresh();
                    }.bind(this),
                    error: function(jqXHR) {
                        var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                        var error = errorMessage?errorMessage:'Data save failure!';
                        MessageBox.error(errorMessage);
                    },
                    complete: function() {
                        // Refresh the detailed ticket in editor page.
                        this.loadTicketDetail();
                    }.bind(this)
				});

			}
		},

        /**
         * Handler method when setting the ticket life cycle to 'complete'
         */
        onSetToComplete: function(oEvent) {
            // Set request data: ticket life cycle to 'complete' [3]
            var patch = {ServiceRequestLifeCycleStatusCode: "3"},
                oView = this.getView();
            var detailView = this.getModel("detailView");
            detailView.setProperty("/busy", true);
            var sPath = oView.getElementBinding().getPath(),
                url = UtilityHandler.getHost()+'/patchServiceRequests';

            patch.baseID = this.getModel().getObject(sPath).ObjectID;

            this.postHttpRequest({
                url: url,
                data: patch,
                method: "PATCH",
                success: function(oData) {
                    if(oData && oData.error){
                        UtilityHandler.raiseErrorMessageWrap(oData.error);
                    }else{
                        MessageToast.show("The service request was set to completed");
                    }
                    this.getModel().refresh();
                }.bind(this),
                error: function(jqXHR) {
                    var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                    var error = errorMessage?errorMessage:'Data save failure!';
                    MessageBox.error(error);
                },
                complete: function() {
                    this.loadTicketDetail();
                }.bind(this)
            });

        },


        /**
		 * Event handler when new file is uploaded
         * @param oEvent
         */
        onFileChange: function(oEvent) {
            this.fileToUpload = oEvent.getParameter("files")["0"];
        },

        /**
         * Handler method: when click 'Load' to load attachment to UI cache
         * as well as logic to check file size
         */
        onFileUpload: function() {
            if (this.fileToUpload) {
                if(this.fileToUpload.size > this.max_fileSize){
                    MessageBox.show("File Size is greater than " + this.max_fileSize/1000000 + " MB!");
                    this.fileToUpload = null;
                    return;
                }
                this.app.setBusy(true);
                var detailView = this.getModel("detailView");
                detailView.setProperty("/busy", true);
                var fileReader = new FileReader();
                fileReader.onload = this.uploadFile.bind(this);
                fileReader.readAsBinaryString(this.fileToUpload);
            } else {
                MessageBox.show("No file was selected");
            }
        },

        /**
         * Handler method when confirm to upload file to back-end
         * @param e
         */
        uploadFile: function(e) {
            var view = this.getView(),
                model = view.getModel(),
                sPath = view.getElementBinding().getPath();

            if (!this.getOwnerComponent().mockData) {
                // In case NOT mock data
                var url = UtilityHandler.getHost()+'/postServiceRequestAttachment', //model.sServiceUrl + sPath + "/ServiceRequestAttachmentFolder",
                    //token = model.getSecurityToken();
                    baseID = this.getModel().getObject(sPath).ObjectID;
                var dataMock = {
                    Name: this.fileToUpload.name,
                    Binary: window.btoa(e.target.result),
                    baseID: baseID
                };

                this.postHttpRequest({
                    url: url,
                    data: patch,
                    success: function(oData) {
                        view.byId("fileUploader").clear();
                        this.fileToUpload = null;
                        if(oData && oData.error){
                            UtilityHandler.raiseErrorMessageWrap(oData.error);
                        }else{
                            MessageToast.show("The attachment was uploaded successfully");
                        }
                        this.getModel().refresh();
                    }.bind(this),
                    error: function(jqXHR) {
                        var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                        var error = errorMessage ? errorMessage : 'the attachment could not be uploaded';
                        MessageBox.error(error);
                    },
                    complete: function() {
                        // Refresh the detailed ticket editor view
                        this.loadTicketDetail();
                    }.bind(this)
                });
            } else {
                // In case mock data
                var data = {
                    Name: this.fileToUpload.name,
                    fileBlob: new Blob([this.fileToUpload], {type: "any"})
                };
                var attachmentData = model.getData().ServiceRequestCollection[parseInt(view.getElementBinding().getPath().split("/")[2])].ServiceRequestAttachmentFolder;
                attachmentData.push(data);
                model.refresh();
                view.byId("fileUploader").clear();
                this.fileToUpload = null;
                MessageToast.show("The attachment was uploaded successfully");
                this._populateAttachmentsList(view.getElementBinding().getPath());
            }
        },

        /**
		 * Loading detailed ticket information from back-end and refresh the ticket editor page
         */
		loadTicketDetail:function(){
            var view = this.getView(),
                sPath = view.getElementBinding().getPath(),
                model = view.getModel();
            var baseID = this.getModel().getObject(sPath).ObjectID;
            var url = UtilityHandler.getHost()+'/getServiceRequests?&ObjectID=\'' + baseID + '\'&$expand=ServiceRequestDescription,ServiceRequestAttachmentFolder';

            this.getHttpRequest({
                url: url,
                success: function(oData) {
                    if(oData && oData.error){
                        UtilityHandler.raiseErrorMessageWrap(oData.error);
                    }else{
                        // Refresh model of Detailed Editor page.
                        model.setProperty(sPath, oData);
                        model.refresh(true);
                        this._populateDescriptionsList(sPath);
                        this._populateAttachmentsList(sPath);
                    }
                }.bind(this),
                error: function(jqXHR) {
                    // var elm = jqXHR.responseText.getElementsByTagName("message")[0];
                    // var error = elm.innerHTML || elm.textContent;
                    var errorMessage = UtilityHandler.getErrorMessageFromErrorResponse(jqXHR);
                    if(errorMessage){
                        MessageBox.error(errorMessage);
                    }
                },
                complete: function() {
                    var detailView = this.getModel("detailView");
                    detailView.setProperty("/busy", false);
                    // Set to the 'display' mode.
                    this._setEditMode(false);
                }.bind(this)
            });

		},

        /**
		 * @private local utility method: initialize JSON model of 'incident' and binding to UI plugin: "infoIncidentCategorySelect"
         * @param {array} data
         */
		_initIncidentModel: function(data) {
			var oView = this.getView(),
				incidentModel = oView.getModel("IncidentModel");
			incidentModel.setData({results:data});
			incidentModel.refresh();
			oView.byId("infoIncidentCategorySelect").setBusy(false);
		},


        /**
         * Handler method when 'Service Category' is selected as parent object, then 'incident category' will be refreshed with new metadata.
         */
        onServiceCategorySelect: function() {
            this.getIncidentCategoryListWrap();
        },

        getIncidentCategoryListWrap: function(){
            var oView = this.getView(),
                oSelectetedItem = oView.byId("infoServiceCategorySelect").getSelectedItem();
            var serviceRequestMockData = this.getOwnerComponent().mockData ? oView.getModel("MockModel").getData().ServiceRequest : null;
            if(oSelectetedItem){
                this.getIncidentCategoryList({
                    parentObject:oSelectetedItem.data("parentObject"),
                    typeCode: oSelectetedItem.data("typeCode"),
                    incidentCategoryControl: oView.byId("infoIncidentCategorySelect"),
                    serviceRequestMockData:serviceRequestMockData,
                    incidentModel:oView.getModel("IncidentModel"),
                    fnSuccessCallBack: this._selectInfoService.bind(this)
                });
			}
		},


		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */
		_setEditMode: function(isEdit) {
			var view = this.getView();
			view.byId("save").setVisible(isEdit);
			view.byId("cancel").setVisible(isEdit);
			view.byId("edit").setVisible(!isEdit);
			view.byId("infoPrioritySelect").setEnabled(isEdit);
			view.byId("infoProductCategorySelect").setEnabled(isEdit);
			view.byId("infoServiceCategorySelect").setEnabled(isEdit);
			view.byId("infoIncidentCategorySelect").setEnabled(isEdit);
		},

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			if (this.getOwnerComponent().mockData) {
				var collection = this.getModel().getData().ServiceRequestCollection;
				for (var i = 0; i < collection.length; i++) {
					if (collection[i].ObjectID === sObjectId) {
						break;
					}
				}
				this._bindView("/ServiceRequestCollection/" + i);
			} else {
                this.getModel().attachRequestCompleted(function(mPara) {
                    this._bindViewWithObjectId(sObjectId);
				}.bind(this));
                this._bindViewWithObjectId(sObjectId);
			}
		},

        /**
		 * @private Wrappering method to bind the editor view to the selected object
         * @param sObjectId: Selected object Object id
         *
         */
		_bindViewWithObjectId: function(sObjectId){
            var collection = this.getModel().getData().ServiceRequestCollection;
            if(collection){
                for (var i = 0; i < collection.length; i++) {
                    if (collection[i].ObjectID === sObjectId) {
                        break;
                    }
                }
                this._bindView("/ServiceRequestCollection/" + i);
            }
		},

		/**
		 * @private Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 *
		 */
		_bindView: function(sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");
			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);
			this.getView().bindElement({
				path: sObjectPath,
				parameters: {
					expand: "ServiceRequestDescription,ServiceRequestAttachmentFolder"
				},
				events: {
					change: this._onBindingViewChange.bind(this),
					dataRequested: function() {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
						this._populateDescriptionsList(sObjectPath);
						this._populateAttachmentsList(sObjectPath);
					}.bind(this)
				}
			});
		},


        /**
		 * Local Handler event: when detailed view binding changed
         * @private
         */
		_onBindingViewChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();
			var isMock = this.getOwnerComponent().mockData;
			// Clear incident model
            var incidentModel = oView.getModel("IncidentModel");
            // Important, everytime when navigation change, should clear incident model meta data
            incidentModel.setData({results: []});
			if (!isMock || (isMock && this.mockModelLoaded)) {
				this.getIncidentCategoryListWrap();
			}

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
                this.getRouter().navTo("nodata");
				// this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				return;
			}
			var sPath = oElementBinding.getPath();
			this._populateDescriptionsList(sPath);
			this._populateAttachmentsList(sPath);
		},

        /**
		 * Handler method when click to nav-back.
         */
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {shellHash: "#Shell-home"}
				});
			}
		},

        /**
		 * @private Refresh the description list UI Area from model
         * @param {string} sPath
         *
         */
		_populateDescriptionsList: function(sPath) {
			var list = this.getView().byId("descriptionsList");
			var descriptions = this.getModel().getObject(sPath).ServiceRequestDescription;
			var that = this;

			list.removeAllItems();
			if (descriptions.forEach) {
				descriptions.sort(function(a, b) {
					//return a.CreatedOn.getTime() - b.CreatedOn.getTime();
                    return UtilityHandler.getDate(a.CreatedOn).getTime() - UtilityHandler.getDate(b.CreatedOn).getTime()
				});
				var sender, info, typeCode;
				descriptions.forEach(function(description) {
                    description.CreatedOn = UtilityHandler.getDate(description.CreatedOn);
					typeCode = description.TypeCode;
					if (typeCode === "10004") {
						sender = description.AuthorName;
						info = "Description";
					} else if (typeCode === "10008") {
						sender = description.AuthorName;
						info = "Reply from Customer";
					} else if (typeCode === "10007" || typeCode === '10011') {
						sender = "Service Agent";
						info = "Reply to Customer";
					} else if (typeCode === "10008") {
						sender = description.AuthorName;
						info = "Reply from Customer";
					}
					list.addItem(new FeedListItem({
						showIcon: false,
						sender: sender,
						text: description.Text,
						info: info,
						timestamp: description.CreatedOn.toLocaleString()
					}));
				});
			}
		},

        /**
         * @private Refresh the attachment list UI Area from model
         * @param {string} sPath
         *
         */
		_populateAttachmentsList: function(sPath) {
			var oView = this.getView();
			var list = oView.byId("attachmentsList");
			var attachments = this.getModel().getObject(sPath).ServiceRequestAttachmentFolder;
            for (var j = 0; j < attachments.length; j++) {
            	// Data format for [CreatedOn] Date value
            	var createdOn = UtilityHandler.getDate(attachments[j].CreatedOn);
            	if(createdOn && createdOn instanceof Date){
                    attachments[j].CreatedOn = createdOn.toLocaleString();
				}
            }
			var attachmentModel = new JSONModel(attachments);
			oView.setModel(attachmentModel, "AttachmentModel");
			oView.getModel("AttachmentModel").refresh();
			var listItems = list.getItems(),
				mockData = this.getOwnerComponent().mockData;
		    for (var i = 0; i < listItems.length; i++) {
				//listItems[i].data("uri", mockData ? (attachments[i].__metadata ? attachments[i].__metadata.uri + "/Binary/$value" : attachments[i]) : attachments[i].__metadata.uri + "/Binary/$value");
                listItems[i].data("uri", attachments[i].DocumentLink);
			}
			this.app.setBusy(false);
		},

		_onMetadataLoaded: function() {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		}

	});

});