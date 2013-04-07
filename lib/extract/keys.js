/*
 * keys.js: Common utility functions for extracting keys from system.json packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var template = require('../template'),
    mustache = require('mustache-ref'),
    rget = require('rget'),
    matchers = template.matchers;

//
// ### @accepted {Array}
// Set of accepted mustache tokens for key rendering.
//
var required = ['name', 'name-ref', '&', '#', '^'];

//
// ### function keys (template, config)
// #### @template {string} Template string to extract keys from.
// #### @config {Object} **Optional** Config data to use for key references
// Returns the set of keys in the specified `template` using optional
// `data` to lookup key references. e.g. {{ foo.{{ ref }} }}
//
module.exports = function keys(template, config) {
  var tokens  = mustache.parse(template),
      allKeys = { required: {}, optional: {}, fatal: {}, warn: {} },
      keys;

  //
  // Helper function for adding missing keys
  // to the specified `result`.
  //
  function checkMissing(token, type) {
    var value, err;
    try { value = rget(config, token[1]) }
    catch (ex) { err = ex }
    if (err || value === undefined) {
      addKey(token[1], type);
    }
  }

  //
  // Adds the token key to the set of `all` tokens
  // unless it already exists
  //
  function addKey(key, type) {
    if (!allKeys[type][key]) {
      allKeys[type][key] = true;
    }
  }

  //
  // Calculate what keys are required and throw if they
  // are missing.
  //
  keys = tokens.reduce(function (all, token) {
    if (~required.indexOf(token[0])) {
      all[token[0]].push(token.slice());
    }

    return all;
  }, { name: [], 'name-ref': [], '&': [], '#': [], '^': [] });

  //
  // Resolve references and throw on missing references.
  //
  keys['name-ref'] = keys['name-ref'].map(function (token) {
    var ref   = matchers.ref.exec(token[1]),
        value,
        err;

    try { value = rget(config, ref[1]) }
    catch (ex) { err = ex }

    addKey(ref[1], 'required');
    if (err || value === undefined) {
      allKeys.fatal[ref[1]] = true;
      return token;
    }

    token[1] = token[1].replace(matchers.ref, value);
    return token;
  });

  //
  // Iterate over any required keys and add missing
  // values to `results.fatal`.
  //
  ['name', 'name-ref', '&'].forEach(function (type) {
    keys[type].forEach(function (token) {
      addKey(token[1], 'required');
      checkMissing(token, 'fatal');
    });
  });

  ['#', '^'].forEach(function (type) {
    keys[type].forEach(function (token) {
      addKey(token[1], 'optional');
      checkMissing(token, 'warn');
    });
  });

  return Object.keys(allKeys).reduce(function (all, type) {
    all[type] = Object.keys(allKeys[type]);
    return all;
  }, {});
};

