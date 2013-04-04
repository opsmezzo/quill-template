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
      results = { fatal: [], warn: [] },
      allKeys = {},
      keys;

  //
  // Helper function for adding missing keys
  // to the specified `result`.
  //
  function checkMissing(token, result) {
    var value, err;
    try { value = rget(config, token[1]) }
    catch (ex) { err = ex }
    if (err || value === undefined
      && !~results[result].indexOf(token[1])) {
      results[result].push(token[1]);
    }
  }

  //
  // Adds the token key to the set of `all` tokens
  // unless it already exists
  //
  function addKey(key) {
    if (!allKeys[key]) {
      allKeys[key] = true;
    }
  }

  //
  // Calculate what keys are required and throw if they
  // are missing.
  //
  var keys = tokens.reduce(function (all, token) {
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

    try { vale = rget(config, ref[1]) }
    catch (ex) { err = ex }

    addKey(ref[1]);
    if (err || value === undefined) {
      results.fatal.push(ref[1]);
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
      checkMissing(token, 'fatal');
    });
  });

  //
  // Compute the set of all keys from the parsed
  // and process tokens. Set any missing keys
  // that are `fatal` or should `warn`.
  //
  required.forEach(function (type) {
    keys[type].forEach(function (token) {
      addKey(token[1]);
    });
  });

  allKeys = Object.keys(allKeys);
  if (results.fatal.length || results.warn.length) {
    allKeys.fatal = results.fatal;
    allKeys.warn = results.warn;
  }

  return allKeys;
};

