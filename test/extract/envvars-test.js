/*
 * template-test.js: Tests for the `template` module.
 *
 * (C) 2011, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    nock = require('nock'),
    vows = require('vows'),
    extract = require('../../lib').extract;

var fixturesDir = path.join(__dirname, '..', 'fixtures'),
    scriptsDir = path.join(fixturesDir, 'scripts');

//
// Test assertion for responses from extract.envvars()
//
function isValidKeys(actual) {
  var types = Object.keys(actual);

  assert.lengthOf(types, 4);
  types.forEach(function (type) {
    assert.isArray(actual[type]);
  });
}

//
// Test macro for asserting that the keys extracted from
// the `text` match the `expected` values.
//
function shouldHaveKeys(text, expected) {
  return function () {
    var keys = extract.envvars(text.join('\n'));

    isValidKeys(keys);
    assert.isTrue(!!keys.required.length);
    assert.isTrue(!!keys.fatal.length);
    expected.forEach(function (key) {
      assert.include(keys.required, key);
      assert.include(keys.fatal, key);
    });
  }
}

vows.describe('quill-template/extract/envvars').addBatch({
  "When using `require('quill-template').extract`": {
    "the envvars() method": shouldHaveKeys(
      [
        '$q_foo',
        '$quill_bar_0',
        '',
        '$q_baz_nested_x',
        '$quill_foo_bar',
        '$q_foo_bar-baz',
        '$q_foo = $quill_bar'
      ],
      [
        'foo',
        'bar.0',
        'baz.nested.x',
        'foo.bar',
        'foo.bar-baz',
        'bar',
      ]
    ),
    "the file() method": {
      topic: function () {
        extract.envvars.file(path.join(scriptsDir, 'configure.sh'), this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        isValidKeys(values)
        assert.deepEqual(values.required, ['foo', 'bar', 'baz']);
        assert.deepEqual(values.fatal, ['foo', 'bar', 'baz']);
      }
    },
    "the dir() method": {
      topic: function () {
        extract.envvars.dir(scriptsDir, this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        assert.isObject(values);

        fs.readdirSync(scriptsDir).forEach(function (file) {
          isValidKeys(values[file]);
        });
      }
    },
    "the list() method": {
      topic: function () {
        extract.envvars.list(scriptsDir, this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        isValidKeys(values);

        var expected = [
          'foo',
          'bar',
          'baz',
          'http.port',
          'http.host',
          'npm.username',
          'npm.password'
        ];

        assert.deepEqual(values.required, expected);
        assert.deepEqual(values.fatal, expected);
      }
    }
  }
}).export(module);
