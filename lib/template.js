/*
 * template.js: Common utility functions for templating files in system.json packages.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var events = require('events'),
    fs = require('fs'),
    path = require('path'),
    mustache = require('mustache-ref'),
    rget = require('rget'),
    async = require('utile').async;

//
// ### @matchers {Object}
// Regular Expression for matching config values (e.g. {{ foo }} )
// and environment variables (e.g. $q_foo).
//
var matchers = exports.matchers = {
  key: /\{\{\s{0,1}([\s(?!\{{2})\{\}a-zA-Z0-9\.\-\_]+)\s{0,1}\}\}/g,
  envvar: /\$(q|quill)_([\_\-\.a-zA-Z0-9]+)/g,
  ref: /\{\{\s*([a-zA-Z0-9\.\-\_]+)\s*\}\}/
};

//
// ### @required {Array}
// Set of required mustache tokens for key rendering.
//
var required = ['name', 'name-ref', '&'];

//
// Configure mustache.escape to properly stringify
// JSON object literals.
//
// Remark: This could be configured for simple
// rendering of partials based on filetype.
//
mustache.escape = function (value) {
  if (typeof value === 'object') {
    value = JSON.stringify(value, null, 2);
  }

  return value;
};

//
// ### function verify (tokens, data)
// Verifies the required keys are present in the the specified `data`
// for the `template` string mustache `tokens`.
//
var verify = exports.verify = function (tokens, data) {
  //
  // Calculate what keys are required and throw if they
  // are missing.
  //
  var keys = tokens.reduce(function (all, token) {
    if (~required.indexOf(token[0])) {
      all[token[0]].push(token.slice());
    }

    return all;
  }, { name: [], 'name-ref': [], '&': [] });

  //
  // Resolve references and throw on missing references.
  //
  keys['name-ref'] = keys['name-ref'].map(function (token) {
    var ref   = matchers.ref.exec(token[1]),
        value = rget(data, ref[1]);

    if (value === undefined) {
      throw new Error('Missing configuration value: ' + ref[1]);
    }

    token[1] = token[1].replace(matchers.ref, value);
    return token;
  });

  //
  // Throw on any missing keys or resolved keys.
  //
  Object.keys(keys).forEach(function (type) {
    keys[type].forEach(function (token) {
      var value, err;
      try { value = rget(data, token[1]) }
      catch (ex) { err = ex }
      if (err || value === undefined) {
        throw new Error('Missing configuration value: ' + token[1]);
      }
    });
  });
};

//
// ### function render (template, data)
// Renders the specified `data` into the `template` string
// using a simple mustache replacement.
//
var render = exports.render = function render(template, data) {
  var tokens = mustache.parse(template),
      compiled;

  exports.verify(tokens, data);
  compiled = mustache.compileTokens(tokens, template);
  return compiled(data);
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
      data = render(data, config);
      if (path.extname(file) === '.json') {
        data = JSON.stringify(JSON.parse(data), null, 2);
      }
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
  var emitter = new events.EventEmitter(),
      config = options.config,
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
        var fullpath = path.join(dir, file);
        fs.stat(fullpath, function (err, stat) {
          if (err) {
            return next(err);
          }

          if (stat.isDirectory()) {
            emitter.emit('dir', file);
            return exports.directory({
              dir:    fullpath,
              config: config,
              force:  options.force
            }, next)
              .on('dir', function (file) {
                emitter.emit('dir', file);
              })
              .on('file', function (file) {
                emitter.emit('file', file);
              });
          }

          emitter.emit('file', file);
          exports.file({
            file:   fullpath,
            config: config,
            force:  options.force
          }, next);
        });
      },
      callback
    );
  });

  return emitter;
};
