'use strict';

var tv4 = require('tv4');
var extend = require('extend');
var fs = require('fs');
var Q = require('Q');

var getSchemaFromRef = function (schema, ref) {

    ref = ref.replace('#/', '');

    var paths = ref.split('/'),
        value = schema,
        propertyName;

    while (paths.length) {
        propertyName = paths.shift();
        value = value[propertyName];
    }

    return value;
};

var buildDefaults = function (schema, schemaLeaf) {

    schemaLeaf = schemaLeaf || schema;

    var newTree = {}, propertyName, property, i;

    if (schemaLeaf.properties) {
        for (propertyName in schemaLeaf.properties) {
            if (!schemaLeaf.properties.hasOwnProperty(propertyName)) {
                continue;
            }

            property = schemaLeaf.properties[propertyName];
            if ('undefined' !== typeof property['default']) {
                newTree[propertyName] = property['default'];
                // ignore other info if this is a primitive
                if ('object' !== property.type) {
                    continue;
                }
            }

            if (property.oneOf) {
                for (i = 0; i < property.oneOf.length; i++) {
                    var additionalDefaults = buildDefaults(schema, property.oneOf[i]);
                    if ('object' === typeof additionalDefaults) {
                        newTree[propertyName] = extend(true, newTree[propertyName] || {}, additionalDefaults);
                        continue;
                    }
                    newTree[propertyName] = additionalDefaults;
                }
            }
        }
    }

    if (schemaLeaf.$ref) {
        newTree = extend(true, newTree, buildDefaults(schema, getSchemaFromRef(schema, schemaLeaf.$ref)));
    }

    return newTree;
};

var buildSettings = function (settings, schema, callback) {
    var validate = function (_settings, _schema, _callback) {
            var defaults = buildDefaults(_schema),
                effectiveSettings = extend(true, defaults, _settings);
            if (!tv4.validate(effectiveSettings, _schema)) {
                return _callback(tv4.error);
            }
            return _callback(null, effectiveSettings);
        },
        params = {
            schema: schema,
            settings: settings
        },
        useDataOrReadFs = function(source, paramName) {
            var deferred = Q.defer();
            if ('object' === typeof source) {
                return deferred.resolve(source);
            }
            return fs.readFile(source, function (err, data) {
                var result,
                    onError = function (err) {
                        deferred.reject(err);
                        callback(err);
                    };
                if (err) {
                    return onError(err);
                }
                try {
                    result = JSON.parse(data);
                } catch(err) {
                    return onError(err);
                }
                params[paramName] = result;
                return deferred.resolve(result);
            });
        };

    Q.when([
        useDataOrReadFs(schema, 'schema'),
        useDataOrReadFs(settings, 'settings')
    ], function() {
        validate(params.settings, params.schema, callback);
    });
};

module.exports = {
    buildDefaults: buildDefaults,
    getSchemaFromRef: getSchemaFromRef,
    buildSettings: buildSettings
};



