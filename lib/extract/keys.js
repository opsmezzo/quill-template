/*
 * keys.js: Common utility functions for extracting keys from system.json packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var template = require('../template'),
    matchers = template.matchers,
    render = template.render;

//
// ### function keys (template, data) 
// #### @template {string} Template string to extract keys from.
// #### @config {Object} **Optional** Config data to use for key references
// Returns the set of keys in the specified `template` using optional
// `data` to lookup key references. e.g. {{ foo.{{ ref }} }}
//
module.exports = function keys(template, config) {
  return template.split('\n')
    .reduce(function (all, text, line) {
      text.replace(matchers.key, function (match, key) {
        key = key.trim();

        all.push({
          line: (line + 1),
          text: text,
          key: config
            ? render(key, config)
            : key
        });
      });
      
      return all;
    }, []);
};

