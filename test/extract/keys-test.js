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
    templatesDir = path.join(fixturesDir, 'templates');

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
    var keys = extract.keys(text.join('\n'));

    isValidKeys(keys);
    expected.forEach(function (key) {
      assert.include(keys.required, key);
      assert.include(keys.fatal, key);
    });
  }
}

vows.describe('quill-template/extract/keys').addBatch({
  "When using `require('quill-template').extract`": {
    "the keys() method": shouldHaveKeys(
      [
        '{{ foo }}',
        '{{ bar.0 }}',
        '',
        '{{ baz.nested.x }}',
        '{{ foo.bar }}',
        '{{ foo.bar_baz }}',
        '{{ foo.bar-baz }}',
        '{{ foo.{{ bar }} }}',
        '{{ {{ bar }} }}',
        '{{ foo }} = {{ bar }}'
      ],
      [
        'bar',
        'foo',
        'bar.0',
        'baz.nested.x',
        'foo.bar',
        'foo.bar_baz',
        'foo.bar-baz',
        'foo.{{ bar }}',
        '{{ bar }}'
      ]
    ),
    "the file() method": {
      topic: function () {
        extract.keys.file(path.join(templatesDir, 'conf-file.conf'), this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        isValidKeys(values);

        ['foo', 'bar.0'].forEach(function (key) {
          assert.include(values.required, key);
          assert.include(values.fatal, key);
        });
      }
    },
    "the dir() method": {
      topic: function () {
        extract.keys.dir(templatesDir, this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        assert.isObject(values);

        fs.readdirSync(templatesDir).forEach(function (file) {
          isValidKeys(values[file]);
        });
      }
    },
    "the list() method": {
      topic: function () {
        extract.keys.list(templatesDir, this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        isValidKeys(values);

        var expected = {
          optional: ['arrs', 'missing'],
          required: [
            'foo',
            'bar.0',
            'nest',
            'bar',
            'baz.nested.x',
            'foo.bar',
            'foo.bar_baz',
            'foo.bar-baz',
            'foo.{{ bar }}',
            '{{ bar }}'
          ]
        };

        assert.deepEqual(values.required, expected.required);
        assert.deepEqual(values.fatal, expected.required);
        assert.deepEqual(values.optional, expected.optional);
        assert.deepEqual(values.warn, expected.optional);
      }
    }
  }
}).export(module);
