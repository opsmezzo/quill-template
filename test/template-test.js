/*
 * template-test.js: Tests for the `template` module.
 *
 * (C) 2011, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    async = require('utile').async,
    vows = require('vows'),
    template = require('../lib').template;

var config = {
  foo: 'lvalue',
  bar: 'rvalue',
  arrs: [
    'first',
    'second',
    'third'
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

//
// Test macro asserting that the `text`
// is rendered to the `expected` value
//
function shouldRender(text, expected) {
  return function () {
    assert.equal(
      template.render(text, config),
      expected
    );
  }
}

//
// Test macro asserting that an error
// for `missing` is throw when the `text`
// is rendered.
//
function shouldThrow(text, missing) {
  return function () {
    var err;

    try { template.render(text, config) }
    catch (ex) { err = ex }

    assert.isObject(err);
    assert.include(err.message, missing);
  }
}

vows.describe('quill-template/template').addBatch({
  "With valid config": [
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
    ['{{foo }}{{ bar}}', 'lvaluervalue'],
    ['{{#missing}}{{.}}{{/missing}} {{foo}}', ' lvalue'],
    ['{{^missing}}MISSING!{{/missing}} {{foo}}', 'MISSING! lvalue']
  ].reduce(function (tests, args) {
    tests[args[0]] = shouldRender.apply(null, args);
    return tests;
  }, {}),
  "With missing references": [
    ['{{ nest.{{ bad-ref }} }}', 'bad-ref'],
    ['{{ nest.{{ bad-ref }}.foo }}', 'bad-ref'],
    ['{{ {{ bad-ref }}.foo }}', 'bad-ref'],
    ['{{ {{ bad-ref }}.foo.bar }}', 'bad-ref']
  ].reduce(function (tests, args) {
    tests[args[0] + " should throw"] = shouldThrow.apply(null, args);
    return tests;
  }, {}),
  "With missing values": [
    ['{{ nest.{{ key }} }}', 'nest.ref-value'],
    ['{{ nest.{{ key }}.foo }}', 'nest.ref-value.foo'],
    ['{{ {{ key }}.foo.bar }}', 'ref-value.foo.bar']
  ].reduce(function (tests, args) {
    tests[args[0] + " should throw"] = shouldThrow.apply(null, args);
    return tests;
  }, {}),
  "the file method()": {
    topic: function () {
      var file = this.file = path.join(__dirname, 'fixtures', 'templates', 'config.json'),
          that = this;

      async.waterfall([
        function readTemplate(next) {
          fs.readFile(file, 'utf8', function (err, templ) {
            if (err) {
              return next(err);
            }

            that.templ = templ;
            next();
          });
        },
        async.apply(template.file, {
          file: file,
          config: config
        }),
        async.apply(fs.readFile, file, 'utf8')
      ], this.callback);
    },
    "should properly stringify Objects": function (err, rendered) {
      fs.writeFileSync(this.file, this.templ, 'utf8');
      assert.isNull(err);

      try { rendered = JSON.parse(rendered) }
      catch (ex) { assert.isNull(ex) }

      assert.deepEqual(rendered.nested, config.nest);
      assert.equal(rendered.list, config.arrs.join(' ') + ' ');
      assert.equal(rendered.missing, 'MISSING!');
    }
  }
}).export(module);