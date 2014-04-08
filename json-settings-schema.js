'use strict';

var tv4 = require('tv4');
var extend = require('extend');
var fs = require('fs');
var Q = require('Q');
var util = require('util');

/**
 * Searches for a sub-schema identified by the reference within
 *
 * @param {Object} schema - A JSON Schema object
 * @param {String} ref - The schema ref path to look up
 * @returns {Object} - The schema identified by the provided ref
 */
var getSchemaFromRef = function (schema, ref) {

    var trimmedRef = ref.replace('#/', ''),
        paths = trimmedRef.split('/'),
        value = schema,
        propertyName;

    while (paths.length) {
        propertyName = paths.shift();
        value = value[propertyName];
    }

    if (!value) {
        throw new ReferenceError('no schema found for ref ' + ref + ' in schema ' + JSON.stringify(schema));
    }

    return value;
};

/**
 * Recursively builds the defaults for the given schema, if they exist
 * If schemaLeaf is provided, only defaults for that leaf are returned
 * This is useful for when a schema leaf may reference the definitions within another schema
 *
 * @param {Object} schema - A JSON Schema object
 * @param {Object} [schemaLeaf] - A leaf within the overall schema tree
 * @returns {Object|Number|null} - The defaults from the schema leaf
 */
var buildDefaults = function (schema, schemaLeaf) {

    schemaLeaf = schemaLeaf || schema;

    var newNode,
        propertyName,
        property,
        i,
        oneOf,
        oneOfSchema,
        defaults;

    if ('undefined' !== typeof(schemaLeaf.default)) {
        newNode = schemaLeaf.default;
    }

    if (schemaLeaf.oneOf) {
        for (i = 0; i < schemaLeaf.oneOf.length; i++) {

            oneOf = schemaLeaf.oneOf[i];
            if (!oneOf.$ref) {
                continue;
            }

            oneOfSchema = getSchemaFromRef(schema, oneOf.$ref);
            defaults = buildDefaults(schema, oneOfSchema);
            // be careful not to confuse Array with Object (since Objects ARE also Arrays)
            if ('object' === typeof defaults && !util.isArray(defaults)) {
                newNode = extend(newNode, defaults);
            } else {
                newNode = defaults;
            }
        }
    }

    if ('object' === typeof schemaLeaf.properties) {
        // node must be an object to have sub properties
        if ('undefined' === typeof newNode) {
            newNode = {};
        }
        for (propertyName in schemaLeaf.properties) {
            if (!schemaLeaf.properties.hasOwnProperty(propertyName)) {
                continue;
            }
            property = schemaLeaf.properties[propertyName];
            defaults = buildDefaults(schema, property);
            // be careful not to confuse Array with Object (since Objects ARE also Arrays)
            if ('object' === typeof defaults && !util.isArray(defaults)) {
                newNode[propertyName] = extend(true, newNode[propertyName], defaults);
            } else {
                newNode[propertyName] = defaults;
            }
        }
    }

    return newNode;
};

/**
 * Validate the data against the schema
 *
 * @param {Object} settings - An object containing settings to be validated against the schema
 * @param {Object} schema - A schema object
 * @param {Function} callback - The callback to be invoked upon validation
 */
var validate = function (settings, schema, callback) {
    var defaults, effectiveSettings;

    try {
        defaults = buildDefaults(schema);
    } catch (err) {
        callback(err);
    }

    effectiveSettings = extend(true, defaults, settings);

    if (!tv4.validate(effectiveSettings, schema)) {
        callback(tv4.error);
        return;
    }
    callback(null, effectiveSettings);
};

/**
 * Validate the data against the schema
 *
 * @param {Object|String} settings - An object or path to a file containing settings to be validated against the schema
 * @param {Object|String} schema - An object or path to a file containing a schema
 * @param {Function} callback - The callback to be invoked upon validation
 */
var buildSettings = function (settings, schema, callback) {
    var params = {
            schema: schema,
            settings: settings
        },
        useDataOrReadFs = function(source, paramName) {
            var deferred = Q.defer();
            if ('object' === typeof source) {
                deferred.resolve(source);
                return deferred.promise;
            }
            fs.readFile(source, function (err, data) {
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
            return deferred.promise;
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
    buildSettings: buildSettings,
    getSchemaFromRef: getSchemaFromRef,
    validate: validate
};