define(["qlik", "jquery"],
function (qlik, $) {

	function convertToTable (layout){

		if (layout.selectedTable.length == 0) return; 

		var app = qlik.currApp(this);
		var ownId = layout.qInfo.qId;		
		var fieldList;
		var thisObj;
		var newTable;
		console.log('Selected table:', layout.selectedTable);
		console.log('Fields used:', layout.fieldPattern);
		console.log('Fields filtered:', layout.ignoreFieldPattern);	

		var setModifier = '{<$Table={"' + layout.selectedTable + '"},'
			+ '$Field={"(' + layout.fieldPattern + ')"}-{"(' + layout.ignoreFieldPattern + ')"}>}';
		// Use engine-formula to get a field list ... Concat($Field,',')
		app.model.enigmaModel.evaluate("=Concat(" + setModifier + " '\"' & $Field & '\"', ',', $FieldNo)")
		.then(function(ret) {
			fieldList = eval('[' + ret + ']');
			console.log('Field list: ', fieldList);
			return(app.model.enigmaModel.getObject(ownId));
		}).then(function(obj) {
			thisObj = obj;
			// Use visualization API to create a new table
			return(app.visualization.create('table',fieldList, {title: layout.selectedTable}));
		}).then(function(obj) {
			newTable = obj;
			// get properties of new table object
			return(newTable.model.getProperties());
		}).then(prop=>{
			console.log('newTable properties',prop);
			// manipulate the id to match the current extension object's id and
			// overwrite current extension object with the new table properties
			prop.qInfo.qId = ownId;
			return(thisObj.setProperties(prop));
		}).then(ret=>{
			newTable.close();
			// change the object type to "table" also in the sheet properties 
			var currSheet = qlik.navigation.getCurrentSheetId();
			return(app.model.enigmaModel.getObject(currSheet.sheetId));
		}).then(sheetObj=>{
			sheetObj.properties.cells.forEach(cell=>{
				if (cell.name == ownId) cell.type = 'table';
			});
			return(sheetObj.setProperties(sheetObj.properties));
		}).then(ret=>{
			console.log('Good bye. Object is now a table.');
		}).catch(function(err) { 
			console.error(err);	
		});								

	};

	
	return {
		support : {
			snapshot: false,
			export: false,
			exportData : false
		},
		definition: { 
			// property panel definition
			component: 'accordion',
			items: {	
				mysection: {
					label: "Extension Settings",
					type: "items",		
					items: [
						{
							"ref": "selectedTable",
							"type": "string",
							component: {
								template: `
									<div class="pp-component pp-dropdown-component" >
										<div class="label" >Choose table to show</div>
										<div class="value" >
											<select class="lui-select ng-pristine" ng-model="table" ng-options="option.value as option.label for option in options" ng-change="selectedTable()" >
											</select>
										</div>
									</div>
								`,
								controller: ["$scope", "$element", "$timeout", function (scope, element, timeout) {
									scope.table = "";

									// a dummy option to start with
									scope.options = [
										{ 
										  value: "-",
										  label: "<please wait..>"
										}
									];
		
									scope.selectedTable = function() {
										scope.data.selectedTable = scope.table;
									}

									// now initialize options (will update scope.options later)
									qlik.currApp(this).model.enigmaModel.evaluate("Concat(DISTINCT $Table,CHR(10))")
									.then(function(res){
										scope.options = res.split(String.fromCharCode(10))
											.map(function (e) { return { value: e, label: e} });
										if (scope.options.length > 0) {
											scope.table = scope.options[0].value;
											scope.data.selectedTable = scope.table;
										}
									})
									.catch(function(err) {
										console.error(err);
									});

								}]
							}	
						},					
						{	
							label: "Include columns (wildcard pattern)"
							,type: "string"
							,defaultValue: "*"
							,ref: "fieldPattern"
						},					
						{	
							label: "Ignore columns (wildcard pattern)"
							,type: "string"
							,defaultValue: "%*"
							,ref: "ignoreFieldPattern"
						},{	
							label: "use '|' as separator"
							,component: "text"
						},{
							label: "Get my table!",
							component: "button",
							action: function(context) { convertToTable(context); }
						},{	
							label: "by Christof Schwarz & Ralf Becher"
							,component: "text"
						}					
					]
				}
			}
		},				


		paint: function ($element, layout) {
		
			var helpUrl = 'https://github.com/ChristofSchwarz/qsQuickTableViewer/blob/master/README.md';
			$element.html(
			'<table height="100%" style="background-color:#eee;"><tr><td style="text-align:center;">'
			+'<p>This is a placeholder for your table.</p>'
			+'<p>After making your selections in the accordion menu on the right</p>'
			+'<p>this will become a standard Qlik Sense table (QlikTableViewer not needed then).</p>'
			+'<a class="lui-button" style="margin-top:5px;" href="' + helpUrl+ '" target="_new">More info</a>'
			+'<td></tr></table>');
			//needed for export
			return qlik.Promise.resolve();
		}
	};
});
