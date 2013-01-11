/*
 * envvars.js: Common utility functions for extracting envars from system.json packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var template = require('../template'),
    matchers = template.matchers;

//
// ### function envvars (template, data) 
// #### @template {string} Template string to extract envvars from.
// Returns the set of keys in the specified `template` using optional
// `data` to lookup key references. e.g. {{ foo.{{ ref }} }}
//
module.exports = function envvars(template) {
  return template.split('\n')
    .reduce(function (all, text, line) {
      text.replace(matchers.envvar, function (match, key, name) {
        key = key.trim();

        all.push({
          line: (line + 1),
          text: text,
          key: name.replace(/_/g, '.'),
          raw: key + '_' + name
        });
      });
      
      return all;
    }, []);
};
