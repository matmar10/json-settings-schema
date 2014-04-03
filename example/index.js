var s = require('../json-settings-schema.js');
var schema = require('./settings-schema.json');
var settingsOverrides = require('./settings.json');

s.buildSettings(settingsOverrides, schema, function (err, settings) {
    if(err) {
        throw err;
    }

    console.log('Settings are:');
    console.log(JSON.stringify(settings, null, 4));
});