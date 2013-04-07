/*
 * envvars.js: Common utility functions for extracting envars from system.json packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var rget = require('rget'),
    template = require('../template'),
    matchers = template.matchers;

//
// ### function envvars (template, config)
// #### @template {string} Template string to extract envvars from.
// Returns the set of envvars in the specified `script` using optional
// `config` to validate if config is present.
//
module.exports = function envvars(template, config) {
  var allKeys = { required: {}, fatal: {} };

  template.split('\n')
    .forEach(function (text, line) {
      text.replace(matchers.envvar, function (match, key, name) {
        var objKey = name.replace(/_/g, '.'),
            record,
            value,
            err;

        key    = key.trim();
        record = {
          line: (line + 1),
          text: text,
          key: objKey,
          raw: key + '_' + name
        };

        if (!allKeys.required[objKey]) {
          allKeys.required[objKey] = record;
        }

        try { value = rget(config, objKey) }
        catch (ex) { err = ex }

        if (err || value === undefined && !allKeys.fatal[objKey]) {
          allKeys.fatal[objKey] = record;
        }
      });
    });

  //
  // TODO: When we can get line numbers from mustache-ref
  // return all information
  //
  return {
    required: Object.keys(allKeys.required),
    fatal: Object.keys(allKeys.fatal),
    optional: [],
    warn: []
  };
};
