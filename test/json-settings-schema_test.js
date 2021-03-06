'use strict';

var s = require('./../json-settings-schema');

exports.settingsSchema = {
    setUp: function (done) {
        done();
    },
    testSuccess: function (test) {
        test.expect(1);

        var schema = require('./harness/basic-settings-schema.json');
        var settingsOverrides = require('./harness/override-session-ttl-and-auth-state.json');

        s.buildSettings(settingsOverrides, schema, function (err, settings) {
            if (err) {
                console.log(err);
                throw err;
            }
            test.deepEqual(settings, {
                "auth": {
                    "sessionTtl": 0, // changed by example/settings.json
                    "productDataAuthStateRequired": "AuthenticatedVerified",
                    "stateLevels": {
                        "Unauthenticated": 0,
                        "Identified": 1,
                        "IdentifiedVerified": 2,
                        "Authenticated": 3,
                        "AuthenticatedVerified": 4
                    },
                    "authSessionEvents": {
                        "end": {
                            "authState": "differentEndAuthState", // changed by example/settings.json
                            "uiState": "login"
                        },
                        "timeout": {
                            "authState": "Identified",
                            "uiState": "main.dda"
                        }
                    }
                },
                "other": {
                    "otherOne": "other one",
                    "otherTwo": {
                        "otherChild": {
                            "otherGrandchild": "grand child"
                        }
                    }
                }
            }, 'parses schema as expected');

            test.done();
        });
    },
    testInvalidSchema: function (test) {

        var ref = '#/definitions/authSettings',
            schema = require('./harness/invalid-schema.json'),
            settingsOverrides = require('./../example/settings.json');

        test.expect(1);
        test.throws(new ReferenceError('no schema found for ref ' + ref + ' in schema ' + JSON.stringify(schema)));

        s.buildSettings(settingsOverrides, schema, function (err, settings) {
            if (err) {
                throw err;
            }
            // test.ok(err instanceof ReferenceError);
        });

        test.done();
    },
    testSchemaWithArrays: function (test) {
        test.expect(1);

        var schema = require('./harness/schema-with-arrays.json');

        s.buildSettings({}, schema, function (err, settings) {
            if (err) {
                console.log(err);
                throw err;
            }
            test.deepEqual(settings, {
                datePicker: {
                    maxSearchDays: 0,
                    minDays: 0,
                    maxDays: 30,
                    blackOutDays: [0,6],
                    blackOutDates: []
                }
            }, 'parses schema as expected');

            test.done();
        });
    }

};
