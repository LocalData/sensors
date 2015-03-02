/*globals describe, it, before, after */
'use strict';

var Promise = require('bluebird');
var request = require('request');

var config = require('../lib/config');
var server = require('../lib/server');

var fixtures = require('./lib/fixtures');

Promise.promisifyAll(request);

var baseUrl = 'http://localhost:' + config.port + '/api/v1';

describe('aggregations', function () {
  before(function (done) {
    server.start(done);
  });

  after(function () {
    server.stop();
  });

  describe('across sources', function () {
    this.timeout(5000);
    var source;
    var entries;
    before(function () {
      return fixtures.createSource({})
      .then(function (data) {
        source = data;
        return fixtures.createEntries(source.id, source.token, 120)
        .then(function (data) {
          entries = data;
        });
      });
    });

    it('should respect resolutions in minutes', function () {
      var now = Date.now();
      return request.getAsync({
        url: baseUrl + '/aggregations',
        qs: {
          'each.sources': source.id,
          op: 'mean',
          from: (new Date(now - 2 * 24 * 60 * 60 * 1000)).toISOString(),
          before: (new Date(now)).toISOString(),
          fields: 'temperature',
          resolution: '30m'
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);
      });
    });

    it('should respect resolutions in hours', function () {
      var now = Date.now();
      return request.getAsync({
        url: baseUrl + '/aggregations',
        qs: {
          'each.sources': source.id,
          op: 'mean',
          from: (new Date(now - 2 * 24 * 60 * 60 * 1000)).toISOString(),
          before: (new Date(now)).toISOString(),
          fields: 'temperature',
          resolution: '1h'
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);
      });
    });

    it('should deny requests for resolutions coarser than 24h', function () {
      var now = Date.now();
      return request.getAsync({
        url: baseUrl + '/aggregations',
        qs: {
          'each.sources': source.id,
          op: 'mean',
          from: (new Date(now - 2 * 24 * 60 * 60 * 1000)).toISOString(),
          before: (new Date(now)).toISOString(),
          fields: 'temperature',
          resolution: '25h'
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(400);
      });
    });
  });
});
