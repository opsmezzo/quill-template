/*
 * template.js: Common utility functions for templating files in system.json packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    rget = require('rget'),
    async = require('utile').async;

//
// ### @matchers {Object}
// Regular Expression for matching config values (e.g. {{ foo }} )
// and environment variables (e.g. $q_foo).
//
var matchers = exports.matchers = {
  key: /\{\{\s{0,1}([\s(?!\{{2})\{\}a-zA-Z0-9\.\-\_]+)\s{0,1}\}\}/g,
  envvar: /\$(?:q|quill)_([\_\-\.a-zA-Z0-9]+)/g
};

//
// ### function render (template, data)
// Renders the specified `data` into the `template` string
// using a simple mustache replacement.
//
var render = exports.render = function render(template, data) {
  return template.replace(matchers.key, function (match, name) {
    name = name.trim();
    name = render(name, data);
    var value = rget(data, name);

    if (value === undefined) {
      throw new Error('Missing configuration value: ' + name);
    }
    else if (typeof value === 'object') {
      value = JSON.stringify(value, null, 2);
    }
    return value;
  });
};

//
// ### function file (options, callback)
// #### @options {Object} Options for templating this file
// ####   @options.file   {string}  Path of the file to template.
// ####   @options.config {Object}  Object to template onto the file.
// ####   @options.force  {Boolean} Value indicating if we should force templating.
// #### @callback {function} Continuation to respond to.
// Reads the specified `file`, templates it, and replaces
// it on disk in the same location
//
exports.file = function (options, callback) {
  var config = options.config,
      file = options.file;

  fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
      return callback(err);
    }

    var msg;

    try {
      data = render(data, config)
    }
    catch (ex) {
      if (!options.force) {
        return callback(new Error(ex.message + ' in ' + file));
      }
    }

    fs.writeFile(file, data, callback);
  });
};

//
// ### function dir (dir, config, callback)
// #### @options {Object} Options for templating this dir
// ####   @options.dir    {string}  Path of the directory to template.
// ####   @options.config {Object}  Object to template onto the file.
// ####   @options.force  {Boolean} Value indicating if we should force templating.
// #### @callback {function} Continuation to respond to.
// Reads all files and directories in the specified `dir`,
// templates them, and replaces them on disk in the same location.
//
exports.dir = function (options, callback) {
  var config = options.config,
      dir = options.dir;
  
  fs.readdir(dir, function (err, files) {
    if (err) {
      //
      // Directory doesn't exist, there's nothing to template. Not a big deal.
      //
      return err.code !== 'ENOENT'
        ? callback(err)
        : callback();
    }

    async.forEach(
      files,
      function (file, next) {
        file = path.join(dir, file);
        fs.stat(file, function (err, stat) {
          if (err) {
            return next(err);
          }
          
          if (stat.isDirectory()) {
            return exports.directory({
              dir:    file,
              config: config,
              force:  options.force
            }, next);
          }
          
          exports.file({
            file:   file,
            config: config,
            force:  options.force
          }, next);
        });
      },
      callback
    );
  });
};
