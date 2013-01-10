/*
 * template-test.js: Tests for the `template` module.
 *
 * (C) 2011, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    nock = require('nock'),
    vows = require('vows'),
    template = require('../lib').template;

//
// Test macro for asserting that the keys extracted from
// the `template` match the `expected` values.
//
function shouldHaveKeys(text, expected) {
  return function () {
    var keys = template.keys(text.join('\n'));

    keys.forEach(function (key, i) {
      assert.isString(key.text);
      assert.equal(key.key, expected[i].key);
      assert.equal(key.line, expected[i].line);
    });
  }
}

vows.describe('quill-template/template').addBatch({
  "When using `require('quill-template').template`": {
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
    )
  }
}).export(module);
