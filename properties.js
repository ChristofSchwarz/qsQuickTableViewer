define(["qlik",
    "./irregularUtils"],
    function (qlik, utils) {
        'use strict';

		var settings = { 
			// property panel definition
            mysection: {
                label: "Extension Settings",
                type: "items",		
                items: [
                    {
                        "ref": "selectedTable",
                        "type": "string",
                        component: {
                            template: 
                                '<div class="pp-component pp-dropdown-component" >\
                                    <div class="label" >Choose table(s) to show</div>\
                                    <div class="value"  style="height: 380px;">\
                                        <select multiple class="lui-input lui-list ng-pristine" style="height: 380px;overflow-x: auto;" ng-model="table" ng-change="selectedTable(table)" >\
                                            <option class="lui-list__item" style="padding: 6px 0px 0px 2px;font-size: 14px;" ng-repeat="option in options" value="{{option.value}}" >{{option.label}}</option>\
                                        </select>\
                                    </div>\
                                </div>',
                            controller: ["$scope", "$element", "$timeout", function (scope, element, timeout) {
                                scope.tableBackup = [];
                                scope.table = [];
                                scope.data.selectedTable = "";

                                // a dummy option to start with
                                scope.options = [
                                    { 
                                        value: "-",
                                        label: "please wait..."
                                    }
                                ];

                                scope.selectedTable = function(table) {
                                    // simulate multiple since ctrl-click seems to be blocked in panel
                                    var t = "";
                                    if (table.length > 0) {
                                        if (table.length === 1) {
                                            t = table[0];
                                            var i = scope.tableBackup.indexOf(t);
                                            if (i === -1) {
                                                scope.tableBackup.push(t);
                                            } else {
                                                scope.tableBackup.splice(i, 1);
                                            }
                                        } else {
                                            table.forEach(function(t) {
                                                if (scope.tableBackup.indexOf(t) === -1) {
                                                    scope.tableBackup.push(t);
                                                }
                                            });
                                        }
                                        scope.data.selectedTable = scope.tableBackup.join(",");
                                    } else {
                                        scope.data.selectedTable = [];
                                    }
                                    timeout(function() {
                                        scope.table = scope.tableBackup;
                                    });
                                }

                                // now initialize options (will update scope.options later)
                                qlik.currApp(this).model.enigmaModel.evaluate("Concat(DISTINCT $Table,CHR(10))")
                                .then(function(res){
                                    scope.options = res.split(String.fromCharCode(10))
                                        .map(function (e) { return { value: e, label: e} });
                                })
                                .catch(function(err) {
                                    console.error(err);
                                });

                            }]
                        }	
                    },					
                    {	
                        label: "Limit Fields"
                        ,type: "integer"
                        ,defaultValue: 50
                        ,ref: "limitFields"
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
                        action: function(context) { utils.convertToTable(qlik, context); }
                    },{	
                        label: "by Christof Schwarz & Ralf Becher"
                        ,component: "text"
                    }					
                ]
            }	
 		};				


        return {
            type: "items",
            component: "accordion",
            items: settings
        };
    }
);        
