/*
 * config-test.js: Tests for the `config` module.
 *
 * (C) 2011, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    nock = require('nock'),
    vows = require('vows'),
    conservatory = require('conservatory-api'),
    config = require('../lib').config;

vows.describe('quill-template/config').addBatch({
  'When using `quill.composer.config`': {
    'the `getEnv()` method': {
      topic: function () {
        var that = this;

        nock('http://api.testquill.com')
          .get('/config/first')
          .reply(200, {
            config: {
              resource: 'Config',
              name: 'first',
              settings: {
                foo: 'bar',
                nested: {
                  boo: 'faz'
                }
              }
            }
          });
        
        config.getEnv({
          client: conservatory.createClient('composer', {
            host: 'api.testquill.com',
            port: 80,
            auth: {
              username: 'test',
              password: 'supersecretz'
            }
          }),
          remotes: ['first', 'foo=baz'],
          after: {
            bar: 'lol'
          }
        }, this.callback)
          .on('fetch', function (remote) {
            that.remotes = that.remotes || [];
            that.remotes.push(remote);
          });
      },
      'should return correct config': function (err, config) {
        assert(!err);
        assert.isArray(this.remotes);
        assert.lengthOf(this.remotes, 1);
        assert.include(this.remotes, 'first');

        var expected = {
          quill_foo: 'baz',
          quill_bar: 'lol',
          quill_nested_boo: 'faz'
        };

        Object.keys(expected).forEach(function (key) {
          assert.isString(expected[key], config[key]);
          assert.equal(expected[key], config[key]);
        });
      }
    }
  }
}).export(module);
