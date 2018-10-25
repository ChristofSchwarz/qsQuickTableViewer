var config = {
	host: window.location.hostname,
	prefix: "/",
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};
define(["qlik", "jquery"],
function (qlik, $) {

	function newGUID(){
		return( 
			Math.random().toString(16).replace('.','').repeat(3).substr(1,8) 
			+ '-' + Math.random().toString(16).replace('.','').repeat(2).substr(1,4)
			+ '-' + Math.random().toString(16).replace('.','').repeat(2).substr(1,4)
			+ '-' + Math.random().toString(16).replace('.','').repeat(2).substr(1,4)
			+ '-' + Math.random().toString(16).replace('.','').repeat(4).substr(1,12)
		);
	};	


	function convertToTable (layout){
		var app = qlik.currApp(this); 
		
		var ownId = layout.qInfo.qId;
		console.log('Selected table:' + layout.selectedTable, 'Field filter: ' +  layout.ignoreFieldPattern);
		if (layout.selectedTable.length == 0) return; 
		
		var fieldList;
		var thisObj;

		app.model.enigmaModel.evaluate('=Concat({<$Table={"' + layout.selectedTable + '"},'
			+ '$Field={"(' + layout.fieldPattern + ')"}-{"(' + layout.ignoreFieldPattern + ')"}>} \'`\' & $Field & \'`\', \',\', $FieldNo)')
		.then(function(ret) {
			fieldList = eval('[' + ret + ']');
			console.log('Field list: ', fieldList);
			return(app.model.enigmaModel.getObject(ownId));
		}).then(function(obj) {
			thisObj = obj;
			return(thisObj.getProperties());
		}).then(function(prop) {
			
			// remove property entries of this extension 
			delete prop.extensionMeta;
			delete prop.version;
			delete prop.selectedTable;
			delete prop.ignoreFieldPattern;

			// Manipulate the properties to become a table object
			prop.qInfo.qType = "table";
			prop.visualization = "table";

			function getDimDef(newDim) {
				return(
				{
					qLibraryId: "",
					qDef: {
						cId: newGUID(),
						qGrouping: "N",
						qFieldDefs: [newDim],	
						qFieldLabels: [""],
						qSortCriterias: [{
							qSortByState: 0,
							qSortByFrequency: 0,
							qSortByNumeric: 1,
							qSortByAscii: 1,
							qSortByLoadOrder: 1,
							qSortByExpression: 0,
							qExpression: { qv: '' },
							qSortByGreyness: 0
						}],
						qNumberPresentations: [],
						autoSort: true,
						qReverseSort: false,
						qActiveField: 0,
						qLabelExpression: "",
						othersLabel: "Others",
						textAlign: {auto: true, align: "left"},
						representation: {type: "text", urlLabel: ""}
					},
					qNullSuppression: false,
					qIncludeElemValue: false,
					qShowTotal: false,
					qShowAll: false,

				});
			};


			prop.qHyperCubeDef = {
				qStateName: "",
				qDimensions: [],    
				qMeasures: [],
				qInterColumnSortOrder: [],
				qColumnOrder: [],
				columnOrder: [],
				columnWidths: [],								
				qSuppressZero: false,
				qSuppressMissing: true,
				qInitialDataFetch: [],
				qReductionMode: "N",
				qMode: "S",
				qPseudoDimPos: -1,
				qNoOfLeftDims: -1,
				qAlwaysFullyExpanded: false,
				qMaxStackedCells: 5000,
				qPopulateMissing: false,
				qShowTotalsAbove: false,
				qIndentMode: false,
				qSortbyYValue: 0,
				qTitle: {"qv": ""},								
				//"qCalcCond": {"qv": ""},
				//"qCalcCondition": {"qCond": {"qv": ""},"qMsg": {"qv": ""}},
			};					
			prop.multiline = { "wrapTextInHeaders": false, "wrapTextInCells": false };
			prop.title = layout.selectedTable;
			prop.totals = {};

			// iterate through array and add to the arrays of the qHyperCubeDef

			fieldList.forEach(function(fieldName, i){
				prop.qHyperCubeDef.qDimensions.push(getDimDef(fieldName));
				prop.qHyperCubeDef.qInterColumnSortOrder.push(i);
				prop.qHyperCubeDef.qColumnOrder.push(i);
				prop.qHyperCubeDef.columnOrder.push(i);
				prop.qHyperCubeDef.columnWidths.push(-1);
			});

			return(thisObj.setProperties(prop));

		}).then(function(ret) {
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
			$element.html(`
			<table height="100%" style="background-color:#eee;"><tr><td style="text-align:center;">
			<p>This is a placeholder for your table.</p>
			<p>After making your selections in the accordion menu on the right</p>
			<p>this will become a standard Qlik Sense table (QlikTableViewer not needed then).</p>
			<a class="lui-button" style="margin-top:5px;" href="${helpUrl}" target="_new">More info</a>
			<td></tr></table>`);
		
			//needed for export
			return qlik.Promise.resolve();
		}
	};
});
