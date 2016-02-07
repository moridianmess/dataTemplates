(function(factory) {
	if (typeof define === "function" && define.amd) {
		define([ "jquery" ], function($) {
			factory($, window, document);
		});
	} else if (typeof module === "object" && module.exports) {
		module.exports = factory(require("jquery"), window, document);
	} else {
		factory(jQuery, window, document);
	}
})(function($, window, document, undefined) {
	"use strict";
	// these vars persist through all instances of the plugin
	var pluginName = "dataTemplates", id = 1, // give each instance it's own id for namespaced event handling
	defaults = {
		element: $(),														/// element plugin being applied to
		ajax: {
			data : '',														/// data returned from search
			extraData: {},													/// data to be sent with list
			url: '',														/// url for search
			type: "GET",													/// method of request
			templateUrl: '',												/// url of row template
			template: '',													/// row template
			optionsUrl: '',													/// url of options (sort list)
			key: 'dataTemplates',											/// ajaxExtend processing key
			text: "Retrieving Search Results",								/// ajaxExtend processing string
			abort: false													/// ajaxExtend show abort for this dataTemplates
		},
		classes: {
			empty: 'dataTemplatesEmptyContent'								/// class to add to empty row
		},
		language:{
			searchText: 'Search',											/// text for search input placeholder
			showingText: 'Showing {0} to {1} of {2}',						/// text for number of records showing text
			empty: 'No Results',											/// text for no results found
			title: '',														/// text for title of grid
			relevance: 'Relevance'											/// text for relevance
		},
		scroll: false,														/// boolean to enable scrolling
		scrollMin: 14,														/// int for minimum rows before enabling scrolling
		scrollY: '400px',													/// scroll height in px
		scrollX: 'auto',													/// scroll width in px
		sorting: true,														/// boolean to enable sorting
		relevance: false,
		searching: true,													/// boolean to enable searching
		header: true,														/// boolean to enable auto header
		headerId: '',														/// selector for header
		beforeSend: function( self ){},										/// function to run before searching
		afterSend: function( data, self, callback ){
			if($.isFunction(callback)){
				callback(data);
			}
		},																	/// function to run after retrieving
		completeCallback: function( self ){},								/// function to run after searching
		rowClickCallback: function(id){},									/// function to run when row clicked
		createdRow: function (row, data, self) {},							/// function to run when row created
		rowCreatedCallback: function(row, data, self){						/// overridable function to run when row created
			var id = row.attr('id');
			var options = self.options;

			if(options.multiSelect){
				row.on('click', {'self': self, 'id': id}, function (e) {
					var self = e.data['self'];
					var id = e.data['id'];
					self.check(id);
				});
				/// stop the row click happening when the checkbox is clicked
				row.find('input[type="checkbox"]').on('click', {'self': self, 'id': id}, function (e) {
					var self = e.data['self'];
					var id = e.data['id'];
					if ($(this).prop('checked') == true) {
						$(this).prop('checked', false);
					} else {
						$(this).prop('checked', true);
					}
					self.check(id);
					e.stopPropagation();
				});
				row.find('label[for="' + options.element.attr('id') + '-' + id + 'Input"]').on('click', {'self': self, 'id': id}, function (e) {
					var self = e.data['self'];
					var id = e.data['id'];
					var input = $('#' + $(this).attr('for'));
					if (input.prop('checked') == true) {
						input.prop('checked', false);
					} else {
						input.prop('checked', true);
					}
					self.check(id);
					e.stopPropagation();
				});
			}else {
				/// Add rowClick event to row
				row.on('click', {'self': self, 'id': id}, function (e) {
					var self = e.data['self'];
					var id = e.data['id'];

					self.rowClick(id);
				});
			}
		},
		building: false,
		multiSelect: false,													/// boolean for whether multi select is on
		data: {},															/// data returned from options
		paging: false,														/// boolean to enable paging
		pageNumbers: true,													/// boolean to show page numbers dropdown
		pageLength: 10,														/// number of records per page
		pageNumber: 1,														/// current page
		pageList: [10,25,50,100],											/// array of page lengths
		sort: [[0, 'asc']],													/// sort order
		selectedItems: [],													/// selected items
		templateConfig: {},
		autoShow: true,
		theme: 'materialize',
		templateDir: "/templates/dataTemplates/"
	};

	function Plugin ( element, options ) {
		this.element = $(element);
		var newObject = $.extend(true, {}, defaults);
		this.options = $.extend(true, newObject, options);
		this.ns = "." + pluginName + id++;
		// Chrome, FF, Safari, IE9+
		this.isGoodBrowser = Boolean(element.setSelectionRange);
		this._name = pluginName;
	}
	Plugin.prototype = {

		_init: function () {

			var self = this;
			var options = this.options;
			options.element = this.element;
			options.building = true;
			options.selectedItems = [];

			/// Add data for validation check
			options.element.data('dataTemplates', true);
			options.element.addClass('dataTemplates');

			/// Check element attributes for settings
			if(options.element.attr('multiple') == 'multiple'){
				options.multiSelect = true;
			}

			if(options.element.attr('title') != null){
				options.language.title = options.element.attr('title');
			}

			if(options.element.data('title') != null){
				options.language.title = options.element.data('title');
			}

			if(options.element.data('ajax-templateurl') != null){
				options.ajax.templateUrl = options.element.data('ajax-templateurl');
			}

			if(options.ajax.templateUrl == ''){
				options.ajax.templateUrl = options.templateDir + options.theme + '/row.html';
			}

			if(options.element.data('ajax-url') != null){
				options.ajax.url = options.element.data('ajax-url');
			}

			if(options.element.data('classes-parent') != null){
				options.classes.parent = options.element.data('classes-parent');
			}

			if(options.element.data('ajax-optionsurl') != null){
				options.ajax.optionsUrl = options.element.data('ajax-optionsurl');
			}

			if(options.element.data('ajax-type') != null){
				options.ajax.type = options.element.data('ajax-type');
			}
			/// End check element attributes for settings

			if( options.ajax.type.toUpperCase() == 'GET' ){
				options.sorting = false;
			}

			var templateConfig = {
				headerId: options.element.attr( 'id' ) + 'Header',
				surroundId: options.element.attr( 'id' ) + 'Surround',
				searchContentId: options.element.attr( 'id' ) + 'SearchContent',
				searchInputId: options.element.attr( 'id' ) + 'SearchInput',
				sortBtnId: options.element.attr( 'id' ) + 'SortButton',
				sortMenuId: options.element.attr( 'id' ) + 'SortMenu',
				itemsBtnId: options.element.attr( 'id' ) + 'ItemsButton',
				itemsMenuId: options.element.attr( 'id' ) + 'ItemsMenu',
				allBtnId: options.element.attr( 'id' ) + 'All',
				headerSurroundId: options.element.attr( 'id' ) + 'HeaderSurround',
				resultsSurroundId: options.element.attr( 'id' ) + 'ResultsSurround',
				resultsContentId: options.element.attr( 'id' ) + 'ResultsContent',
				footerId: options.element.attr( 'id' ) + 'Footer',
				showingId: options.element.attr( 'id' ) + 'Showing',
				resultsPaginateId: options.element.attr( 'id' ) + 'ResultsPaginate',
				pagingBtnId: options.element.attr( 'id' ) + 'PagingBtn',
				pagingMenuId: options.element.attr( 'id' ) + 'PagingMenu',
				pagingTextId: options.element.attr( 'id' ) + 'PagingText'
			};

			options.templateConfig = templateConfig;

			/// Get options and templates
			self.getOptions().then(function() {
				/// Build DataTemplates html structure
				self.buildInterface().then(function () {
					/// Search
					if(!options.autoShow) {
						options.element.hide();
					}else{
						self.search();
					}
					self.element.trigger('_create');
					return self;
					options.building = false;
				});
			});
		},

		addRow: function(data){
			var self = this;
			var options = this.options;

			var found = false;

			if( options.ajax.data['aaData'] === undefined ){
				options.ajax.data['aaData'] = [];
			}
			if(options.ajax.data['iTotalRecords'] === undefined ){
				options.ajax.data['iTotalRecords'] = 0;
				options.ajax.data['iTotalDisplayRecords'] = 0;
			}

			$.each(options.ajax.data['aaData'], function(k,v){
				if(data['DT_RowId'] == v['DT_RowId']){
					found = k;
				}
			});

			if( found === false) {
				options.ajax.data['aaData'].push( data );
				options.ajax.data['iTotalRecords'] = options.ajax.data['iTotalRecords'] + 1;
				options.ajax.data['iTotalDisplayRecords'] = options.ajax.data['iTotalDisplayRecords'] + 1;
			}else{
				options.ajax.data['aaData'][found] = data;
			}
			found = null;

			self.searchResults(options.ajax.data);

			self.element.trigger('addRow');
		},

		clear: function(){
			var self = this;
			var options = this.options;
			options.ajax.data = {};
			self.searchResults( {} );

			self.element.trigger('clear');
		},

		removeRow: function(id){
			var self = this;
			var options = this.options;

			var found = false;
			$.each(options.ajax.data['aaData'], function(k,v){
				if(id == v['DT_RowId']){
					found = k;
				}
			});

			options.ajax.data['aaData'].splice(found, 1);
			options.ajax.data['iTotalRecords'] = parseInt(options.ajax.data['iTotalRecords']) - 1;
			options.ajax.data['iTotalDisplayRecords'] = parseInt(options.ajax.data['iTotalDisplayRecords']) - 1;
			found = null;

			self.searchResults(options.ajax.data);

			self.element.trigger('addRow');
		},

		getOptions: function() {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {
				/// Get options
				ajaxExtend.create().then(function(){
					ajaxExtend.setExecute({
						"url": options.ajax.optionsUrl,
						"type": "GET",
						"data": null,
						"key": 'fields',
						"text": "Retrieving Sort Information",
						"success": function (data) {
							if( data['results'] != undefined) {
								options.data = data['results'];
							}

							/// If template url is supplied with no template
							if((options.ajax.template == '' || options.ajax.template === undefined) &&  options.ajax.templateUrl != '') {
								templateEngine.load(options.ajax.templateUrl, {}).then(function(template){
									options.ajax.template = template;

									self.element.trigger('getOptions');
									defer.resolve();
								});
							}else{
								self.element.trigger('getOptions');
								defer.resolve();
							}
						}
					});
				})
			});

			defer.notify();
			return promise;
		},

		buildInterface: function() {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {

				templateEngine.load(options.templateDir + options.theme + '/inline.html', options.templateConfig, options.element).then(function () {
					/// If title isn't blank, add title bar
					if (options.language.title != '') {
						$('#' + options.element.attr('id') + "Header")
							.html(options.language.title);
					}

					/// Set Search Input options
					$('#' + options.element.attr('id') + 'SearchInput')
						.attr({
							'placeholder': options.language.searchText
						})
						.on('keypress', {'self': self}, function (e) {
							var self = e.data['self'];
							var options = self.options;
							if (e.which == 13) {
								if( options.relevance ) {
									self.sort(options.data.length);
								}else{
									self.search();
								}
								return false;
							}
						});

					templateEngine.load(options.templateDir + options.theme + '/itemsItem.html', {}).then(function (template) {
						$.each(options.pageList, function (key, value) {
							var tmpTemplate = templateEngine.execute(template, {id: value});
							var menuItem = $(tmpTemplate)
								.on('click', {'self': self, 'value': value}, function (e) {
									var self = e.data['self'];
									self.updatePageLength(value);

								});

							if (value == options.pageLength) {
								menuItem.addClass('selected');
							}

							menuItem.appendTo($('#' + options.element.attr('id') + 'ItemsMenu'));
							menuItem = null;
						});
					});

					if (options.multiSelect) {
						$('#' + options.element.attr('id') + 'All')
							.addClass('select')
							.on('click', {'self': self}, function (e) {
								var self = e.data['self'];
								self.selectAll();
							})
							.show();
					}else{
						$('#' + options.element.attr('id') + 'All').hide();
					}
					/// End create html to hold sort and select buttons

					/// Build results content
					if (options.header) {
						var header = options.ajax.template;

						for (var i = 0; i < options.data.length; i++) {
							var item = options.data[i];
							header = header.replace('{' + i + '}', item['html']);
						}

						header = $(header);
						header.find('input[type="checkbox"]').hide();
						header
							.addClass('dataTemplatesHead')
							.appendTo($('#' + options.element.attr('id') + 'HeaderSurround'));
						header = null;
					} else {
						/// If headerId has been supplied move it to correct place
						if (options.headerId != '') {
							$(options.headerId)
								.remove()
								.appendTo($('#' + options.element.attr('id') + 'HeaderSurround'));
						}
					}

					if (options.searching && options.relevance) {
						var menuItem = {
							id: options.data.length,
							name: options.language.relevnace
						};
						templateEngine.load(options.templateDir + options.theme + '/sortItem.html', menuItem).then(function (template) {
							/// Add sort options to options menu
							$(template)
								.on('click', {'self': self, 'value': options.data.length}, function (e) {
									var self = e.data['self'];
									var value = e.data['value'];
									self.sort(value);
								})
								.appendTo($('#' + options.element.attr('id') + 'SortMenu'));
						});
					}

					templateEngine.load(options.templateDir + options.theme + '/sortItem.html', {}).then(function (template) {

						for (var i = 0; i < options.data.length; i++) {

							var item = options.data[i];

							if (item['colId'] !== undefined) {

								var sort = item['sort'];
								if (item['sort'] === undefined) {
									sort = true;
								}

								if (sort) {
									var menuItem = {
										id: item['colId'],
										name: item['html']
									};

									var tmpTemplate = templateEngine.execute(template, menuItem);

									var menuItem = $(tmpTemplate)
										.on('click', {'self': self, 'value': item['colId']}, function (e) {
											var self = e.data['self'];
											var value = e.data['value'];
											self.sort(value);
										});


									if (options.sort[0][0] == item['colId']) {
										if (options.sort[0][1] == 'asc') {
											menuItem.addClass('selected asc');
										} else {
											menuItem.addClass('selected desc')
										}
									}

									menuItem.appendTo($('#' + options.element.attr('id') + 'SortMenu'));
									menuItem = null;
								};
							}
							sort = null;
						}
						item = null;
					});

					/// Hide/Show search box depending on searching boolean
					if (options.searching) {
						$('#' + options.element.attr('id') + "SearchInput").show();
					} else {
						$('#' + options.element.attr('id') + "SearchInput").hide();
					}

					if (options.pageList.length < 2 || !options.sorting || !options.paging || !options.multiSelect) {

						var grouped = $('#' + options.element.attr('id') + 'All').parent();

						if (!options.sorting) {
							$('#' + options.element.attr('id') + "SortButton").hide();
						}

						if (!options.paging) {
							$('#' + options.element.attr('id') + "ItemsButton").hide();
						}

						if (grouped.hasClass('group-third')) {
							grouped.removeClass('group-third')
						}
						grouped = null;

					}
					self.element.trigger('buildInterface', self);
					defer.resolve();
				});
			});

			defer.notify();
			return promise;
		},

		check: function (id) {
			var self = this;
			var options = self.options;

			var checkBox = $('#' + options.element.attr('id') + '-' + id + 'Input');

			if($.isNumeric(id)){
				id = parseInt(id);
			}

			var index = options.selectedItems.indexOf(id);

			if (index > -1) {
				options.selectedItems.splice(index, 1);
			}
			index = null;

			/// Swap checkbox state
			if (checkBox.prop('checked') == true) {
				checkBox.prop('checked', false);
			} else {
				checkBox.prop('checked', true);
				options.selectedItems.push( id );
			}

			$("#" + options.element.attr('id') + "All").removeClass('select deselect');

			/// If all checkboxes are checked check text
			if (options.selectedItems.length == options.ajax.data['allIds'].length) {
				$("#" + options.element.attr('id') + "All").addClass('deselect');
			} else {
				$("#" + options.element.attr('id') + "All").addClass('select');
			}
		},

		/// Deselect all
		deselectAll: function () {
			var self = this;
			var options = this.options;
			options.selectedItems = [];

			$.each(options.ajax.data['allIds'], function(key, value){
				$('#' + options.element.attr('id') + '-' + value + 'Input').prop('checked', false);
			});

			self.element.trigger('deselectAll');
		},

		/// Select all
		selectAll: function () {
			var self = this;
			var options = this.options;

			var selectedLength = options.selectedItems.length;
			options.selectedItems = [];

			$("#" + options.element.attr('id') + "All").removeClass('select deselect');

			if (selectedLength == options.ajax.data['allIds'].length) {
				/// If all checkboxes are checked, uncheck them
				$.each(options.ajax.data['allIds'], function(key, value){
					$('#' + options.element.attr('id') + '-' + value + 'Input').prop('checked', false);
				});
				$("#" + options.element.attr('id') + "All").addClass('select');
			}else{
				/// If all checkboxes are not checked, check them
				$.each(options.ajax.data['allIds'], function(key, value){
					$('#' + options.element.attr('id') + '-' + value + 'Input').prop('checked', true);
					options.selectedItems.push(value);
				});
				$("#" + options.element.attr('id') + "All").addClass('deselect');
			}
			selectedLength = null;

			self.element.trigger('selectAll');
		},

		updatePageLength: function (value) {
			var self = this;
			var options = this.options;

			this.options.pageLength = value;
			$("#" + options.element.attr('id') + "ItemsMenu").find('li').removeClass('selected');

			var element = $("#" + options.element.attr('id') + "ItemsMenu").find('[data-page="' + value + '"]').addClass('selected');

			self.search();

			self.element.trigger('updatePageLength');
		},

		sort: function (value) {
			var self = this;
			var options = this.options;

			var direction = 'asc';

			/// check which direction we are sorting
			for(var i = 0; i < options.sort.length; i++){
				if(options.sort[i][0] == value){
					if(options.sort[i][1] == direction){
						direction = 'desc';
					}
				}
			}

			/// Remove all icons from sort menu
			$("#" + options.element.attr('id') + "SortMenu").find('li').removeClass('selected asc desc');

			var element = $("#" + options.element.attr('id') + "SortMenu").find('[data-col="' + value + '"]').addClass('selected ' + direction);

			options.sort = [[value, direction]];
			direction = null;
			element = null;
			self.search();

			self.element.trigger('sort');
		},

		destroy: function () {
			var self = this;
			var options = this.options;

			options.element.removeData('dataTemplates');
			options.element.html('');
			options.element.off();

			if(options.language.title != '') {
				$('#' + options.element.attr('id') + "Header").remove();
			}

			$.Widget.prototype.destroy.call(this);

			self.element.trigger('destroy');
		},

		setOption: function (key, value) {
			var self = this;
			var options = this.options;

			$.Widget.prototype._setOption.apply(this, arguments);

			self.element.trigger('setOption');
		},

		setOptions: function(newOptions){
			var self = this;
			var options = this.options;

			this.options = $.extend(true, options, newOptions);

			self.element.trigger('setOptions');
		},

		changePage: function(page){

			var self = this;
			var options = this.options;

			if(page == 'first') {
				options.pageNumber = 1;
			} else if(page == 'previous') {
				options.pageNumber = parseInt(options.pageNumber) - 1;
			}else if(page == 'next') {
				options.pageNumber = parseInt(options.pageNumber) + 1;
			} else {
				if(!$.isNumeric(page)){
					page = 1;
				}
				options.pageNumber = page;
			}

			$('#' + options.element.attr('id') + "PagingText").html(options.pageNumber);

			self.element.trigger('changePage');

			self.search();
		},

		execute: function(data){
			var self = this;
			var options = this.options;

			if (data !== undefined && data !== null) {
				options.ajax.extraData = data;
			}

			options.element.show();
			options.pageNumber = 1;

			if (options.building){
				options.element.on('datatemplatesbuildinterface', {'self':self}, function(e){
					var self = e.data['self'];
					self.search();
				});
			}else {
				self.search();
			}

			self.element.trigger('execute');
		},

		search: function () {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {

				if(!options.element.is(':visible')){
					options.element.show();
				}

				var displayLength = options.pageLength;

				if(options.paging === false){
					displayLength = -1;
				}

				/// Gather parameters
				var theData = {
					'requestObject': {
						'iDisplayLength': displayLength,
						'iDisplayStart': ((options.pageNumber - 1) * displayLength),
						'sSearch': $('#' + options.element.attr('id') + 'SearchInput').val(),
						'iSortingCols': options.sort.length
					}
				};
				displayLength = null;

				/// Loop through sort columns setting parameters for use server side
				$.each(options.sort, function(key, value){
					theData['requestObject']['iSortCol_' + key] = value[0];
					theData['requestObject']['sSortDir_' + key] = value[1];
					theData['requestObject']['bSortable_' + value[0]] = true;
				});

				if(!$.isEmptyObject(options.ajax.extraData)){
					$.each(options.ajax.extraData, function(key, value) {
						if(typeof value != 'string') {
							if (value.length) {
								value = value.val();
							}
						}
						theData[key] = value;
					});
				}

				options.beforeSend( self );

				if( options.ajax.url != '' ) {
					if( options.ajax.type.toUpperCase() == 'GET' ){
						$('#' + options.element.attr('id') + 'SearchInput').hide();
					}
					ajaxExtend.setExecute( {
						"url": options.ajax.url,
						"type": options.ajax.type,
						"data": theData,
						"key": options.ajax.key,
						"text": options.ajax.text,
						"abort": options.ajax.abort,
						"success": function ( data ) {
							options.afterSend( data, self, function ( data ) {

								self.options.ajax.data = data;

								self.searchResults( data );

								self.element.trigger('search');
								defer.resolve();
							} );
						}
					} );
					theData = null;
				}else{
					self.element.trigger('search');
					$('#' + options.element.attr('id') + 'SearchInput').hide();
					self.searchResults( options.ajax.data );
					defer.resolve();
				}
			});

			defer.notify();
			return promise;
		},

		searchResults: function( data ){
			var self = this;
			var options = this.options;

			options.element.show();
			/// Hide/Show select all button
			if(options.multiSelect){
				$("#" + options.element.attr('id') + "All").show();
			}else{
				$("#" + options.element.attr('id') + "All").hide();
			}

			/// Clear results
			$('#' + options.element.attr('id') + "ResultsContent").html('');
			$('#' + options.element.attr('id') + 'ResultsContent').removeAttr('style');
			$('#' + options.element.attr('id') + 'HeaderSurround').removeAttr('style');
			$('#' + options.element.attr('id') + 'ResultsSurround').removeAttr('style');

			if(options.paging) {
				var total_records = data['iTotalDisplayRecords'];
				var pages = Math.ceil(total_records / options.pageLength);

				/// Remove previous on click events
				$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.first').off('click');
				$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.previous').off('click');
				$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.next').off('click');
				$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.last').off('click');

				if (options.pageNumber == 1) {
					/// Disable previous and first buttons if on page one
					$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.first').addClass('disabled');
					$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.previous').addClass('disabled');
				} else {
					/// Add click events to previous and first buttons
					$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.first')
						.removeClass('disabled')
						.on('click', {'self': self}, function (e) {
							var self = e.data['self'];
							self.changePage('first');
						});

					$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.previous')
						.removeClass('disabled')
						.on('click', {'self': self}, function (e) {
							var self = e.data['self'];
							self.changePage('previous');
						});
				}

				if (options.pageNumber == pages || pages == 0) {
					/// Disable next and last buttons if on last page
					$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.last').addClass('disabled');
					$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.next').addClass('disabled');
				} else {
					/// Add click events to next and last buttons
					$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.last')
						.removeClass('disabled')
						.on('click', {'self': self, 'pages': pages}, function (e) {
							var self = e.data['self'];
							var pages = e.data['pages'];
							self.changePage(pages);
						});

					$('#' + options.element.attr('id') + "ResultsPaginate").find('.paginate_button.next')
						.removeClass('disabled')
						.on('click', {'self': self}, function (e) {
							var self = e.data['self'];
							self.changePage('next');
						});
				}

				if (options.pageNumbers) {
					/// Remove all options from dropdown
					$('#' + options.element.attr('id') + "PagingMenu").find('li').remove();

					/// Add new options
					templateEngine.load(options.templateDir + options.theme + '/itemsItem.html', {'pages': pages}).then(function (template, data) {
						var pages = data['pages'];
						for (var i = 1; i <= pages; i++) {
							var tmpTemplate = templateEngine.execute(template, {'id': i});
							var menuItem = $(tmpTemplate)
								.on('click', {'self': self, 'value': i}, function (e) {
									var self = e.data['self'];
									var value = e.data['value'];
									self.changePage(value);
								});

							if (i == options.pageNumber) {
								menuItem.addClass('selected');
							}

							menuItem.appendTo($('#' + options.element.attr('id') + 'PagingMenu'));
							menuItem = null;
						}
					});

					$('#' + options.element.attr('id') + "PagingText").html(options.pageNumber);
					$('#' + options.element.attr('id') + "PagingBtn").show();
				}else{
					$('#' + options.element.attr('id') + "PagingBtn").hide();
				}

				$('#' + options.element.attr('id') + 'ResultsPaginate').show();
				pages = null;
				total_records = null;

			}else{
				$('#' + options.element.attr('id') + 'ResultsPaginate').hide();
			}

			if( data['aaData'] !== undefined ) {
				/// Build showing text
				var showing = options.language.showingText;
				var startRecord = "1";
				var endRecord = data['aaData'].length;
				var totalRecords = data['iTotalRecords'];
				var JSONData = false;

				if( options.paging ) {
					if (options.pageNumber > 1) {
						startRecord = (totalRecords * (options.pageNumber - 1)).toString();
					}

					endRecord = (totalRecords * options.pageNumber).toString();


					if (data['aaData'].length > options.pageLength) {
						var a = totalRecords - (options.pageLength * (options.pageNumber - 1));
						if (a < options.pageLength) {
							totalRecords = a;
						} else {
							totalRecords = options.pageLength;
						}

						startRecord = ((options.pageLength * (options.pageNumber - 1)) + 1).toString();
						if (data['aaData'].length < options.pageLength * options.pageNumber) {
							endRecord = (parseInt(startRecord) + (totalRecords) - 1).toString();
						} else {
							endRecord = (options.pageLength * options.pageNumber).toString();
						}

						JSONData = true;
					}
				}

				showing = showing.replace( '{0}', startRecord );
				showing = showing.replace( '{1}', endRecord );
				showing = showing.replace( '{2}', data['iTotalDisplayRecords'] );

				$( '#' + options.element.attr( 'id' ) + "Showing" ).html( showing );
				showing = null;

				data = self.objectToDate( data );

				/// Loop through results adding row based on template
				if ( data['aaData'].length > 0 ) {

					if ( options.paging ) {
						$( '#' + options.element.attr( 'id' ) + "ResultsPaging" ).show();
					}

					var start = 0;
					var end = data['aaData'].length;

					if ( JSONData ) {
						start = parseInt( startRecord ) - 1;
						end = parseInt( endRecord );
					}

					for ( var i = start; i < end; i++ ) {
						var value = data['aaData'][i];

						var template = options.ajax.template;
						value['dtId'] = options.element.attr('id');

						template = templateEngine.execute(template, value);

						var row = $( template );

						if(!options.multiSelect) {
							row.find('input[type="checkbox"]').hide();
						}
						template = null;

						$( '#' + options.element.attr( 'id' ) + "ResultsContent" ).append( row );

						options.createdRow( row, value, self );
						options.rowCreatedCallback( row, value, self );
						row = null;
					}
					start = null;
					end = null;
				} else {
					$( document.createElement( 'div' ) )
						.html( options.language.empty )
						.addClass( options.classes.empty )
						.appendTo( $( '#' + options.element.attr( 'id' ) + "ResultsContent" ) );

					$( '#' + options.element.attr( 'id' ) + 'ResultsPaginate' ).hide();
				}
				startRecord = null;
				endRecord = null;

				if ( options.scroll ) {

					if ( options.header ) {
						var header = $( '.' + options.classes.head );
					} else {
						var header = $( options.headerId );
					}

					var theWidth = 0;
					header.children().each( function () {
						theWidth += $( this ).outerWidth( true );
					} );

					$( '#' + options.element.attr( 'id' ) + 'ResultsSurround' ).css( 'width', theWidth );
					$( '#' + options.element.attr( 'id' ) + 'HeaderSurround' ).css( 'width', theWidth );
					$( '#' + options.element.attr( 'id' ) + 'ResultsSurround' ).off( 'scroll' );
					$( '#' + options.element.attr( 'id' ) + 'ResultsSurround' ).on( 'scroll', function () {
						var scrollLeft = $( '#' + options.element.attr( 'id' ) + 'ResultsSurround' ).scrollLeft();
						$( '#' + options.element.attr( 'id' ) + 'HeaderSurround' ).scrollLeft( scrollLeft );
						scrollLeft = null;
					} );

					if ( options.scrollX == 'auto' ) {
						if ( options.header ) {
							options.scrollX = $( '.' + options.classes.head ).outerWidth( true ) + 2;
						} else {
							options.scrollX = $( options.headerId ).outerWidth( true ) + 2
						}
					}

					$( '#' + options.element.attr( 'id' ) + 'ResultsContent' ).css( 'width', options.scrollX );
					header.css( 'width', options.scrollX );
					header = null;

					var count = self.options.ajax.data['aaData'].length;

					if ( count < options.scrollMin ) {
						var css_var = {
							'overflow': 'hidden',
							'height': 'auto',
							'overflow-x': 'scroll',
							'width': '100%'
						};
					} else {
						if ( (options.scrollX - self.getScrollBarWidth()) <= options.element.innerWidth() ) {
							var css_var = {
								'overflow': 'hidden',
								'overflow-y': 'scroll',
								'height': options.scrollY,
								'width': '100%'
							};
						} else {
							var css_var = {
								'overflow': 'scroll',
								'height': options.scrollY,
								'width': '100%'
							};
						}
					}
					count = null;

					$( '#' + options.element.attr( 'id' ) + 'ResultsSurround' ).css( css_var );
					$( '#' + options.element.attr( 'id' ) + 'HeaderSurround' ).css( {
						'overflow': 'hidden',
						'width': '100%'
					} );
				}
			}

			options.completeCallback( self );

			self.element.trigger('searchResults');
		},

		objectToDate: function(data) {
			$.each(data['aaData'], function(k, v) {
				$.each(v, function (index, value) {
					if ( typeof value === 'object' && value != null ) {
						var valueArray = value['date'].split('.');
						var dateString = valueArray[0];
						valueArray = null;
						var match = dateString.match(/^(\d+)-(\d+)-(\d+) (\d+)\:(\d+)\:(\d+)$/);
						var date = new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6]);
						dateString = null;
						match = null;

						var dd = date.getDate();
						var mm = date.getMonth() + 1; //January is 0!
						var yyyy = date.getFullYear();
						var h = date.getHours();
						var i = date.getMinutes();
						date = null;

						if (dd < 10) {
							dd = '0' + dd
						}
						if (mm < 10) {
							mm = '0' + mm
						}
						if (h < 10) {
							h = '0' + h
						}
						if (i < 10) {
							i = '0' + i
						}

						value = dd + '/' + mm + '/' + yyyy;
						var valueTime = h + ':' + i;

						data['aaData'][k][index] = value;
						dd = null;
						mm = null;
						yyyy = null;
					}else if(typeof value === 'string') {
						if ( value.match( /(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2})/ ) !== null ) {
							var date = new Date( value );
							dateString = null;
							match = null;

							var dd = date.getDate();
							var mm = date.getMonth() + 1; //January is 0!
							var yyyy = date.getFullYear();
							var h = date.getHours();
							var i = date.getMinutes();
							date = null;

							if ( dd < 10 ) {
								dd = '0' + dd
							}
							if ( mm < 10 ) {
								mm = '0' + mm
							}
							if ( h < 10 ) {
								h = '0' + h
							}
							if ( i < 10 ) {
								i = '0' + i
							}

							value = dd + '/' + mm + '/' + yyyy;
							var valueTime = h + ':' + i;

							data['aaData'][k][index] = value;
							dd = null;
							mm = null;
							yyyy = null;
						}
					}
					if( value == null ){
						data['aaData'][k][index] = '';
					}
				});
			});
			return data;
		},

		getScrollBarWidth: function () {

			$(document.createElement("div"))
				.attr('id', 'testScrollBarElement')
				.css({
					'visibility': "hidden",
					'width': "100px"
				})
				.appendTo($('body'));

			var widthNoScroll = $('#testScrollBarElement').outerWidth(true);
			// force scroll bars
			$('#testScrollBarElement').css('overflow', "scroll");

			// add inner div
			$(document.createElement("div"))
				.css('width', "100%")
				.appendTo($('#testScrollBarElement'));

			var widthWithScroll = $('#testScrollBarElement').find('div').outerWidth(true);

			// remove divs
			$('#testScrollBarElement').remove();

			var scrollWidth = widthNoScroll - widthWithScroll;
			widthWithScroll = null;
			widthNoScroll = null;

			return scrollWidth;
			scrollWidth = null;
		},

		getSelected: function() {
			var self = this;
			var options = this.options;

			return options.selectedItems;
		},

		rowClick: function (id) {
			var self = this;
			var options = this.options;

			options.rowClickCallback(id);

			self.element.trigger('rowClick');
		},

		getTotalRecords: function() {
			var self = this;
			var options = this.options;

			if(options.ajax.data['iTotalRecords'] !== undefined){
				return options.ajax.data['iTotalRecords'];
			} else {
				return 0;
			}

		}
	};

	// using https://github.com/jquery-boilerplate/jquery-boilerplate/wiki/Extending-jQuery-Boilerplate
	// (adapted to allow public functions)
	$.fn[pluginName] = function(options) {
		var args = arguments;
		// Is the first parameter an object (options), or was omitted,
		// instantiate a new instance of the plugin.
		if (options === undefined || typeof options === "object") {
			var deferreds = [];
			this.each(function() {
				if (!$.data(this, "plugin_" + pluginName)) {
					var instance = new Plugin(this, options);
					instance._init();
					$.data(this, "plugin_" + pluginName, instance);
				}
			});
			// return the promise from the "master" deferred object that tracks all the others
			return $.when.apply(null, deferreds);
		} else if (typeof options === "string" && options[0] !== "_") {
			// If the first parameter is a string and it doesn't start
			// with an underscore or "contains" the `init`-function,
			// treat this as a call to a public method.
			// Cache the method call to make it possible to return a value
			var returns;
			this.each(function() {
				var instance = $.data(this, "plugin_" + pluginName);
				// Tests that there's already a plugin-instance
				// and checks that the requested public method exists
				if (instance instanceof Plugin && typeof instance[options] === "function") {
					// Call the method of our plugin instance,
					// and pass it the supplied arguments.
					returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
				}
				// Allow instances to be destroyed via the 'destroy' method
				if (options === "destroy") {
					$.data(this, "plugin_" + pluginName, null);
				}
			});
			// If the earlier cached method gives a value back return the value,
			// otherwise return this to preserve chainability.
			return returns !== undefined ? returns : this;
		}
	};

	$.fn[pluginName].version = "0.7.2";
	$.fn[pluginName].author = "Marc Evans (moridiweb)";

});