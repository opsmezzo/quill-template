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
// Test macro for asserting that the keys extracted from
// the `text` match the `expected` values.
//
function shouldHaveKeys(text, expected) {
  return function () {
    var keys = extract.envvars(text.join('\n'));

    assert.isTrue(!!keys.length);
    keys.forEach(function (key, i) {
      assert.isString(key.text);
      assert.equal(key.key, expected[i].key);
      assert.equal(key.line, expected[i].line);
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
        { line: 1, key: 'foo' },
        { line: 2, key: 'bar.0' },
        { line: 4, key: 'baz.nested.x' },
        { line: 5, key: 'foo.bar' },
        { line: 6, key: 'foo.bar-baz' },
        { line: 7, key: 'foo' },
        { line: 7, key: 'bar' }
      ]
    ),
    "the file() method": {
      topic: function () {
        extract.envvars.file(path.join(scriptsDir, 'configure.sh'), this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        assert.isArray(values);
        assert.deepEqual(values, [
          { line: 1, text: '$quill_foo', key: 'foo' },
          { line: 2, text: '$q_bar', key: 'bar' },
          { line: 3, text: '$q_baz', key: 'baz' }
        ]);
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
          assert.isArray(values[file]);
        });        
      }
    },
    "the list() method": {
      topic: function () {
        extract.envvars.list(scriptsDir, this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        assert.isArray(values);
        assert.deepEqual(values, [ 
          'foo',
          'bar',
          'baz',
          'http.port',
          'http.host',
          'npm.username',
          'npm.password'
        ]);
      }
    }
  }
}).export(module);
