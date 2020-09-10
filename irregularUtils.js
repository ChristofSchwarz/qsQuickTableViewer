define([], function () {

    function edgesFromList(arr) {
        var res = [],
            l = arr.length;
        for (var i = 0; i < l; ++i)
            for (var j = i + 1; j < l; ++j)
                res.push([arr[i], arr[j]]);
        return res;
    }

    function edgeListToAdjList(edgelist) {
        var adjlist = {};
        var i, len, pair, u, v;
        for (i = 0, len = edgelist.length; i < len; i += 1) {
            pair = edgelist[i];
            u = pair[0];
            v = pair[1];
            if (adjlist[u]) {
                adjlist[u].push(v);
            } else {
                adjlist[u] = [v];
            }
            if (adjlist[v]) {
                adjlist[v].push(u);
            } else {
                adjlist[v] = [u];
            }
        }
        return adjlist;
    };

    // Breadth First Search using adjacency list
    function bfs(v, adjlist, visited) {
        var q = [];
        var current_group = [];
        var i, len, adjV, nextVertex;
        q.push(v);
        visited[v] = true;
        while (q.length > 0) {
            v = q.shift();
            current_group.push(v);
            adjV = adjlist[v];
            for (i = 0, len = adjV.length; i < len; i += 1) {
                nextVertex = adjV[i];
                if (!visited[nextVertex]) {
                    q.push(nextVertex);
                    visited[nextVertex] = true;
                }
            }
        }
        return current_group;
    };

    function checkTableAssiciatons(qlik, app, selectedTables) {
        var objId = "", edgeList = [], adjList = {};

        if (selectedTables.length > 1) {
            // check if multiple tables are connected
            // create a hypercube with all fields which links to at least 2 tables (result contains no data islands)
            return app.model.enigmaModel.createSessionObject({
                "qInfo": { "qType": "HyperCube" },
                "qHyperCubeDef": {
                    "qDimensions": [{ "qDef": { "qFieldDefs": ["$Field"] } }],
                    "qMeasures": [{ "qDef": { "qDef": "=Concat({<$Field={\"=Count(distinct $Table)>1\"}>} distinct $Table, ',')" } }],
                    "qInitialDataFetch": [{ "qWidth": 2, "qHeight": 5000 }]
                }
            })
                .then(function (obj) {
                    objId = obj.id;
                    return obj.getLayout();
                })
                .then(function (layout) {
                    app.model.enigmaModel.destroySessionObject(objId);
                    if (layout.qHyperCube.qDataPages.length > 0) {
                        layout.qHyperCube.qDataPages[0].qMatrix.map(function (row) {
                            edgeList = edgeList.concat(edgesFromList(row[1].qText.split(",")));
                        });
                        adjList = edgeListToAdjList(edgeList);
                        var groups = [], visited = {}, v;
                        // find groups (components) of the graph
                        for (v in adjList) {
                            if (adjList.hasOwnProperty(v) && !visited[v]) {
                                groups.push(bfs(v, adjList, visited));
                            }
                        }
                        // check if selectedTables are all in same group 
                        var inGroup = 0, l = selectedTables.length;
                        for (var i = 0; i < groups.length; ++i) {
                            if (groups[i].length >= l) {
                                inGroup = 0;
                                for (var j = 0; j < l; ++j) {
                                    if (groups[i].indexOf(selectedTables[j]) > -1) {
                                        inGroup++;
                                    }
                                    if (inGroup >= l) {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                    return false;
                });
        } else {
            return qlik.Promise.resolve(true);
        }
    }

    function convertToTable(qlik, layout) {
        if (layout.selectedTable.length == 0) return;

        var selectedTables = layout.selectedTable.split(",");

        var app = qlik.currApp(this);
        var ownId = layout.qInfo.qId;
        var fieldList;
        var thisObj;
        var newTable;
        console.log('Selected table:', layout.selectedTable);
        console.log('Remove prefix:', layout.boolRemovePrefix);
        console.log('Fields used:', layout.fieldPattern);
        console.log('Fields filtered:', layout.ignoreFieldPattern);

        checkTableAssiciatons(qlik, app, selectedTables)
            .then(function (res) {
                if (res) {
                    var selectedTablesStr = selectedTables.map(function (e) { return '"' + e + '"' }).join(",");

                    var setModifier = '{<$Table={' + selectedTablesStr + '},'
                        + '$Field={"(' + layout.fieldPattern + ')"}-{"(' + layout.ignoreFieldPattern + ')"}>}';
                    // Use engine-formula to get a field list ... Concat($Field,',')
                    var fieldQFormula = "=Concat(" + setModifier + " '{qDef:{qFieldDefs:[\"' & $Field & '\"],qFieldLabels:[\"' & "
                        + (layout.boolRemovePrefix ? "If(Index($Field,'.'),Mid($Field,Index($Field,'.')+1),$Field)" : "$Field")
                        + "&'\"]}}', ',', $FieldNo)";
                    app.model.enigmaModel.evaluate(fieldQFormula)
                        .then(function (ret) {
                            fieldList = eval('[' + ret + ']');
                            if (layout.limitFields > 0 && fieldList.length > layout.limitFields) {
                                fieldList = fieldList.slice(0, layout.limitFields)
                            }
                            console.log('Field list: ', fieldList);
                            return app.model.enigmaModel.getObject(ownId);
                        }).then(function (obj) {
                            thisObj = obj;
                            // Use visualization API to create a new table
                            return app.visualization.create('table', fieldList, { title: selectedTables.join(",") });
                        }).then(function (obj) {
                            newTable = obj;
                            // get properties of new table object
                            return newTable.model.getProperties();
                        }).then(function (prop) {
                            console.log('newTable properties', prop);
                            // manipulate the id to match the current extension object's id and
                            // overwrite current extension object with the new table properties
                            prop.qInfo.qId = ownId;
                            return thisObj.setProperties(prop);
                        }).then(function (ret) {
                            newTable.close();
                            // change the object type to "table" also in the sheet properties 
                            var currSheet = qlik.navigation.getCurrentSheetId();
                            return app.model.enigmaModel.getObject(currSheet.sheetId);
                        }).then(function (sheetObj) {
                            sheetObj.properties.cells.forEach(function (cell) {
                                if (cell.name == ownId) cell.type = 'table';
                            });
                            return sheetObj.setProperties(sheetObj.properties);
                        }).then(function (ret) {
                            console.log('Good bye. Object is now a table.');
                        }).catch(function (err) {
                            console.error(err);
                        });
                } else {
                    alert(
                        "QuickViewer Error:\n\nTables don't associate (are islands)! Table Object cannot be created."
                    );
                }
            });
    };

    return {
        convertToTable: convertToTable
    };

});
