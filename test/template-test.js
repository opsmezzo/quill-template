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

var config = {
  foo: 'lvalue',
  bar: 'rvalue',
  arrs: [
    'first',
    'second'
  ],
  nest: {
    key: 'nest.key',
    nest: {
      key: 'nest.nest.key'
    },
    'u_score': 'nest.u_score',
    'da-sh': 'nest.da-sh'
  },
  key: 'ref-value',
  ref: 'key'
}

function shouldRender(text, expected) {
  return function () {
    assert.equal(
      template.render(text, config),
      expected
    );
  }
}

vows.describe('quill-template/template').addBatch(
  [
   ['{{ foo }}', 'lvalue'],
   ['{{ arrs.0 }}', 'first'],
   ['{{ nest.key }}', 'nest.key'],
   ['{{ nest.nest.key }}', 'nest.nest.key'],
   ['{{ nest.u_score }}', 'nest.u_score'],
   ['{{ nest.da-sh }}', 'nest.da-sh'],
   ['{{ nest.{{ ref }} }}', 'nest.key'],
   ['{{ {{ ref }} }}', 'ref-value'],
   ['{{ foo }} {{ bar }}', 'lvalue rvalue'],
   ['{{ foo }} = {{ bar }}', 'lvalue = rvalue'],
   ['{{ nest.key }} = {{ arrs.0 }}', 'nest.key = first'],
   ['{{ nest.key }} *&AJH@# {{ arrs.0 }}', 'nest.key *&AJH@# first'],
   ['{{ foo }}{{ bar}}', 'lvaluervalue'],
   ['{{foo}}{{bar}}', 'lvaluervalue'],
   ['{{ foo}}{{bar}}', 'lvaluervalue'],
   ['{{foo }}{{bar}}', 'lvaluervalue'],
   ['{{foo }}{{ bar}}', 'lvaluervalue']
  ].reduce(function (tests, args) {
    tests[args[0]] = shouldRender.apply(null, args);
    return tests;
  }, {})
).export(module);