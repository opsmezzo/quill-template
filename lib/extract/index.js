/*
 * index.js: Common utility functions for extracting keys and envars from system.json packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    async = require('utile').async;

//
// ### @private types {Array}
// Set of known key or envvar types
//
var types = ['required', 'optional', 'fatal', 'warn'];

//
// ### @private function file (type, file, config, callback)
// #### @type {keys|envvars} Type of extraction to do on the file
// #### @file {string} Full path to the file to extract from.
// #### @config {Object} **Optional** config values to use to lookup key refs.
// #### @callback {function} Continuation to respond to when complete
// Extracts quill-style keys or envvars from the specified file.
//
function file(type, file, config, callback) {
  if (!callback && typeof config === 'function') {
    callback = config;
    config = null;
  }
  else if (type !== 'keys' && type !== 'envvars') {
    return callback(new Error('Type must be `keys` or `envvars`'));
  }

  fs.readFile(file, 'utf8', function (err, text) {
    if (err) {
      return callback(err);
    }

    var results;
    try { results = exports[type](text, config) }
    catch (ex) { return callback(ex) }
    callback(null, results);
  });
};

//
// ### @private function dir (file, config, callback)
// #### @file {string} Full path to the dir to extract from.
// #### @config {Object} **Optional** config values to use to lookup key refs.
// #### @callback {function} Continuation to respond to when complete
// Extracts quill-style keys or envvars from the specified dir.
//
function dir(dir, config, callback) {
  if (!callback && typeof config === 'function') {
    callback = config;
    config = null
  }

  var that = this;

  fs.readdir(dir, function (err, files) {
    if (err) {
      //
      // Directory doesn't exist, there's nothing to template. Not a big deal.
      //
      return err.code !== 'ENOENT'
        ? callback(err)
        : callback();
    }

    async.reduce(
      files,
      {},
      function (all, file, next) {
        var fullpath = path.join(dir, file);
        fs.stat(fullpath, function (err, stat) {
          if (err) {
            return next(err);
          }

          function onValues(err, values) {
            if (err) {
              return next(err);
            }

            all[file] = values;
            next(null, all);
          }

          return stat.isDirectory()
            ? that.dir(fullpath, config, onValues)
            : that.file(fullpath, config, onValues);
        });
      },
      callback
    );
  });
};

//
// ### @private function list (type, fullpath, config, callback)
// #### @type {keys|envvars} Type of extraction to do on the dir or file.
// #### @fullpath {string} Full path to the dir or file to extract from.
// #### @config {Object} **Optional** config values to use to lookup key refs.
// #### @callback {function} Continuation to respond to when complete
// Extracts quill-style keys or envvars from the specified file or directory
// and flattens them into a single array.
//
function list(fullpath, config, callback) {
  if (!callback && typeof config === 'function') {
    callback = config;
    config = null;
  }

  var that = this;

  fs.stat(fullpath, function (err, stats) {
    if (err) {
      //
      // File or dir doesn't exist, there's nothing to extract.
      // Not a big deal.
      //
      return err.code !== 'ENOENT'
        ? callback(err)
        : callback();
    }
    else if (stats.isFile()) {
      return that.file(fullpath, config, callback);
    }

    that.dir(fullpath, config, function (err, results) {
      if (err) {
        return callback(err);
      }

      //
      // Merge all unique values in `obj` into
      // `values` recursively.
      //
      function addValues(obj, values) {
        Object.keys(obj).forEach(function (name) {
          var file = obj[name];

          if (file.required || file.fatal) {
            types.forEach(function (type) {
              if (!Array.isArray(file[type])) { return }

              values[type] = file[type].reduce(function (all, key) {
                return !~all.indexOf(key)
                  ? all.concat(key)
                  : all;
              }, values[type]);
            });
          }
          else if (typeof obj[file] === 'object') {
            addValues(obj[file], values);
          }
        });

        return values;
      }

      callback(null, addValues(results || {}, {
        required: [],
        optional: [],
        fatal: [],
        warn: []
      }));
    });
  });
};

//
// Load the required extract modules for `keys`
// and `envvars`.
//
exports.keys    = require('./keys');
exports.envvars = require('./envvars');

//
// Setup a generic `.file()` and `.dir()` method
// on each of the exports using the generic method.
//
['keys', 'envvars'].forEach(function (type) {
  exports[type].file = file.bind(exports[type], type);
  exports[type].list = list.bind(exports[type]);
  exports[type].dir  = dir.bind(exports[type]);
});