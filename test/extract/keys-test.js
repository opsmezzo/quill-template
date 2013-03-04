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
// Test macro for asserting that the keys extracted from
// the `text` match the `expected` values.
//
function shouldHaveKeys(text, expected) {
  return function () {
    var keys = extract.keys(text.join('\n'));

    assert.isTrue(!!keys.length);
    keys.forEach(function (key, i) {
      assert.isString(key.text);
      assert.equal(key.key, expected[i].key);
      assert.equal(key.line, expected[i].line);
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
        { line: 1, key: 'foo' },
        { line: 2, key: 'bar.0' },
        { line: 4, key: 'baz.nested.x' },
        { line: 5, key: 'foo.bar' },
        { line: 6, key: 'foo.bar_baz' },
        { line: 7, key: 'foo.bar-baz' },
        { line: 8, key: 'foo.{{ bar }}' },
        { line: 9, key: '{{ bar }}' },
        { line: 10, key: 'foo' },
        { line: 10, key: 'bar' }
      ]
    ),
    "the file() method": {
      topic: function () {
        extract.keys.file(path.join(templatesDir, 'conf-file.conf'), this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        assert.isArray(values);
        assert.deepEqual(values, [
          { line: 1, text: 'foo: {{ foo }}', key: 'foo' },
          { line: 2, text: 'bar: {{ bar.0 }}', key: 'bar.0' }
        ]);
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
          assert.isArray(values[file]);
        });
      }
    },
    "the list() method": {
      topic: function () {
        extract.keys.list(templatesDir, this.callback);
      },
      "should extract the correct values": function (err, values) {
        assert.isNull(err);
        assert.isArray(values);
        assert.deepEqual(values, [
          'foo',
          'bar.0',
          'nest',
          '.',
          '.',
          'baz.nested.x',
          'foo.bar',
          'foo.bar_baz',
          'foo.bar-baz',
          'foo.{{ bar }}',
          '{{ bar }}',
          'bar'
        ]);
      }
    }
  }
}).export(module);
