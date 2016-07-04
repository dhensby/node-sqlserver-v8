//---------------------------------------------------------------------------------------------------------------------------------
// File: query.js
// Contents: test suite for queries
//
// Copyright Microsoft Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//
// You may obtain a copy of the License at:
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//---------------------------------------------------------------------------------------------------------------------------------

var sql = require('../'),
    assert = require('assert'),
    async = require('async'),
    config = require('./test-config'),
    fs = require('fs'),
    boiler = require('./boilerplate');

function empSelectSQL() {

    var s =
        `SELECT [BusinessEntityID]
     ,[NationalIDNumber]
     ,[LoginID]
     ,[OrganizationNode]
     ,[OrganizationLevel]
     ,[JobTitle]
     ,[BirthDate]
     ,[MaritalStatus]
     ,[Gender]
     ,[HireDate]
     ,[SalariedFlag]
     ,[VacationHours]
     ,[SickLeaveHours]
     ,[CurrentFlag]
     ,[rowguid]
     ,[ModifiedDate]
     FROM [scratch].[dbo].[Employee]
     WHERE BusinessEntityID = ?`;

    return s;
}

function empDeleteSQL() {

    var s =
        `DELETE FROM [scratch].[dbo].[Employee]
        WHERE BusinessEntityID = ?`;

    return s;
}

suite('prepared', function () {

    var conn_str = config.conn_str;
    var helper = boiler.TestHelper(sql, conn_str);
    var parsedJSON = helper.getJSON();
    var c;
    this.timeout(20000);

    var table_name = "Employee";
    var prepared = {

    };
    function insert(test_done) {
        var tm = c.tableMgr();
        tm.bind(table_name, function(bulkMgr) {
            bulkMgr.insertRows(parsedJSON, function() {
                test_done();
            });
        });
    }

    var actions = [

        // open a connection.
        function (async_done) {
            sql.open(conn_str, function (err, new_conn) {
                assert.ifError(err);
                c = new_conn;
                async_done();
            });
        },

        // drop / create an Employee table.
        function (async_done) {
            helper.testBoilerPlate({
                name: table_name
            }, function () {
                async_done();
            });
        },

        // insert test set using bulk insert
        function (async_done) {
            var tm = c.tableMgr();
            tm.bind(table_name, function(bulkMgr) {
                bulkMgr.insertRows(parsedJSON, function() {
                    async_done();
                });
            });
        },

        // prepare a select statement.
        function(async_done) {
            employeePrepare(empSelectSQL(), function (ps) {
                prepared.select = ps;
                async_done();
            })
        },

        // prepare a delete statement.
        function(async_done) {
            employeePrepare(empSelectSQL(), function (ps) {
                prepared.delete = ps;
                async_done();
            })
        }
    ];

    setup(function (test_done) {
        async.series(actions,
            function () {
                test_done();
            });
    });

    teardown(function (done) {
        prepared.select.free(function() {
            prepared.delete.free(close);
        });

        function close() {
            c.close(function (err) {
                assert.ifError(err);
                done();
            });
        }
    });

    function employeePrepare(query, done) {
        c.prepare(query, function (err, ps) {
            assert.ifError(err);
            done(ps);
        });
    }

    test( 'SQL prepared with 2 selects with different params.', function( done ) {

        var select = prepared.select;
        var meta = select.getMeta();
        var id1 = 2;
        var id2 = 3;
        assert(meta.length > 0);
        select.preparedQuery([id1], function (err, res1) {
            assert.ifError(err);
            select.preparedQuery([id2], function (err, res2) {
                assert.ifError(err);
                var o1 = parsedJSON[id1 - 1];
                assert.deepEqual(o1, res1[0], "results didn't match");

                var o2 = parsedJSON[id2 - 1];
                assert.deepEqual(o2, res2[0], "results didn't match");
                done();
            })
        });
    });

    test( 'stress test SQL prepared with 500 invocations', function( test_done ) {

        var select = prepared.select;
        var meta = select.getMeta();
        assert(meta.length > 0);
        var businessId = 1;
        var iteration = 0;
        var totalIterations = 500;
        var max = parsedJSON[parsedJSON.length - 1].BusinessEntityID;
        next(businessId, iterate);

        function iterate() {
            businessId++;
            if (businessId > max) businessId = 1;
            ++iteration;
            if (iteration < totalIterations) {
                next(businessId, iterate);
            } else {
                test_done();
            }
        }

        function next(businessId, done) {
            select.preparedQuery([businessId], function (err, res1) {
                assert.ifError(err);
                assert(res1[0].BusinessEntityID == businessId);
                done();
            });
        }
    });
});