/*
 * config.js: Common utility functions for loading and rendering system configuration.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var os = require('os'),
    async = require('utile').async;

//
// ### @private function fetch (client, configs, callback)
// Fetches all of the `configs` names from the remote
// composer.
//
function fetch(client, configs, callback) {
  var target = client.remote || client.config;
  
  async.map(configs, target.get.bind(target), function (err, data) {
    if (err) {
      return callback(err);
    }

    callback(null, data.map(function (d) {
      return d.settings;
    }));
  });
}

//
// ### @private function merge (configs, target)
// Merges all of the `configs` objects onto the
// specified `target`.
//
function merge(configs, target) {
  //
  // Not the fastest algorithm ever.
  //
  target = target || {};
  configs.reverse();

  configs.forEach(function (config) {
    Object.keys(config).forEach(function (key) {
      var value = config[key];

      if (typeof value === 'object' && !Array.isArray(value)) {
        target[key] = {};
        merge(configs.map(function (config) {
          return config[key];
        }).filter(Boolean).reverse(), target[key]);
      }
      else {
        target[key] = value;
      }
    });
  });

  return target;
}

//
//
// ### function getConfig (options, callback)
// #### @options {Object} Options for getting configs.
// ####   @options.before  {Array} Ordered, renderd configs to add before any fetched configs.
// ####   @options.remotes {Array} Ordered, named configs to fetch for the environment config.
// ####   @options.after   {Array} Ordered, renderd configs to add after any fetched configs.
// ####   @options.client  {Client} Composer client to fetch configs with.
// #### @callback {function} Continuation to respond to
// Responds with the fully-merged object for all configuration
// associated with the `options`, contacting the remote composer.
//
exports.getConfig = function (options, callback) {
  if (!options || !options.client) {
    return callback(new Error('Cannot fetch configs without composer client.'));
  }
  
  var remotes = options.remotes,
      pairs = {},
      sets = [];

  remotes = Array.isArray(remotes)
    ? remotes
    : [remotes]

  remotes.filter(Boolean).forEach(function (config) {
    var equals = config.indexOf('=');

    if (equals !== -1) {
      pairs[config.substr(0, equals)] = config.substr(equals + 1);
      return;
    }

    sets.push(config);
  });

  fetch(options.client, sets, function (err, configs) {
    if (err) {
      return callback(null);
    }

    if (options.before) {
      configs = options.before.concat(configs);
    }

    configs.unshift(pairs);
    
    if (options.after) {
      configs = configs.concat(options.after);
    }
    
    callback(null, merge(configs));
  });
};

//
// ### function toEnvironment (obj, recursed)
// #### @obj {Object} Configuration object to convert to env vars.
// #### @recursed {Boolean} Value indicating if we should add `quill_` to the result.
// Returns an environment representation of the specified `obj`. e.g.
//
//    {
//      "foo": 1
//    }
//
// returns
//
//    {
//      "quill_foo": 1
//    }
//
exports.toEnvironment = function (obj, recursed) {
  var result = {};

  Object.keys(obj).forEach(function (key) {
    var r;
    if (typeof obj[key] === 'object') {
      r = exports.toEnvironment(obj[key], true);
      Object.keys(r).forEach(function (rKey) {
        result[key + '_' + rKey] = r[rKey];
      });
    }
    else {
      result[key] = obj[key];
    }
  });

  if (!recursed) {
    Object.keys(result).forEach(function (key) {
      result['quill_' + key] = result['q_' + key] = result[key];
      delete result[key];
    });
  }

  return result;
}

//
// ### function getEnv (options, callback)
// #### @options {Object} Options for getting environment variables.
// ####   @options.before  {Array} Ordered, renderd configs to add before any fetched configs.
// ####   @options.remotes {Array} Ordered, named configs to fetch for the environment config.
// ####   @options.after   {Array} Ordered, renderd configs to add after any fetched configs.
// ####   @options.client  {Client} Composer client to fetch configs with.
// #### @callback {function} Continuation to respond to
// Responds with the fully-rendered env vars for all configuration
// options, contacting the remote composer responding with:
//
// exports.toEnvironment(
//  options.before
//    .concat(fetch(options.remote)
//    .concat(options.after)
// )
//
exports.getEnv = function (options, callback) {
  exports.getConfig(options, function (err, config) {
    return err
      ? callback(err)
      : callback(null, exports.toEnvironment(config));
  });
};
