var s = require('../json-settings-schema.js');
var schema = require('./settings-schema.json');
var settingsOverrides = require('./settings.json');
var util = require('util');

s.build

s.validate(settingsOverrides, schema, function (err, settings) {
    if(err) {
        console.log(util.inspect(err, {
            depth: null // infinite
        }));
        throw err;
    }

    console.log('Settings are:');
    console.log(JSON.stringify(settings, null, 4));
});