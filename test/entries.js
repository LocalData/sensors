/*globals describe, it, before, after */
'use strict';

var Promise = require('bluebird');
var request = require('request');

var config = require('../lib/config');
var server = require('../lib/server');

var fixtures = require('./lib/fixtures');

Promise.promisifyAll(request);

var baseUrl = 'http://localhost:' + config.port + '/api/v1';

describe('entries', function () {
  before(function (done) {
    server.start(done);
  });

  after(function () {
    server.stop();
  });

  describe('list', function () {
    var source;
    var entries;
    before(function () {
      return fixtures.createSource({})
      .then(function (data) {
        source = data;
        return fixtures.createEntries(source.id, source.token, 20)
        .then(function (data) {
          entries = data;
        });
      });
    });

    it('should respect startIndex and count', function () {
      var start = 5;
      var count = 10;
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          startIndex: start,
          count: count
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(count);
        data.forEach(function (ret, i) {
          ret.should.have.property('source');
          ret.should.have.property('timestamp');
          ret.should.have.property('data');
          Date.parse(ret.timestamp).should.equal(entries[start + i].timestamp);
        });

        data.reduce(function (prevTimestamp, item) {
          var ts = Date.parse(item.timestamp);
          ts.should.be.above(prevTimestamp);
          return ts;
        }, -1);
      });
    });

    it('should respect sort=desc', function () {
      var start = 0;
      var count = 10;
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          startIndex: start,
          count: count,
          sort: 'desc'
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(count);
        data.forEach(function (ret, i) {
          ret.should.have.property('source');
          ret.should.have.property('timestamp');
          ret.should.have.property('data');
          Date.parse(ret.timestamp).should.equal(entries[entries.length - i - 1].timestamp);
        });

        data.reduce(function (prevTimestamp, item) {
          var ts = Date.parse(item.timestamp);
          ts.should.be.below(prevTimestamp);
          return ts;
        }, Number.POSITIVE_INFINITY);
      });
    });

    it('should default to startIndex=0', function () {
      var count = 10;
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          count: count
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(count);
        data.forEach(function (ret, i) {
          ret.should.have.property('source');
          ret.should.have.property('timestamp');
          ret.should.have.property('data');
          Date.parse(ret.timestamp).should.equal(entries[i].timestamp);
        });

      });
    });

  });

  describe('list large', function () {
    var source;
    var entries;
    before(function () {
      this.timeout(8000);
      return fixtures.createSource({})
      .then(function (data) {
        source = data;
        return fixtures.createEntriesParallel(source.id, source.token, 1010)
        .then(function (data) {
          entries = data;
        });
      });
    });
    it('should limit number of results to 1000', function () {
      var count = 2000;
      var MAX = 1000;
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          count: count
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(MAX);
      });
    });
  });

  describe('create', function () {
    var source;
    var other;
    before(function () {
      return fixtures.createSource({})
      .then(function (data) {
        source = data;
        return fixtures.createSource({});
      }).then(function (data) {
        other = data;
      });
    });

    it('should support entry creation', function () {
      var bearer = (new Buffer(':' + source.token)).toString('base64');
      var entry = {
        timestamp: Date.now(),
        foo: 1.23,
        bar: 100*Math.random()
      };

      return request.postAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        json: entry,
        auth: { bearer: bearer }
      }).spread(function (response, data) {
        response.statusCode.should.equal(201);
      });
    });

    it('should deny unauthenticated requests', function () {
      var entry = {
        timestamp: Date.now(),
        foo: 1.23,
        bar: 100*Math.random()
      };

      return request.postAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        json: entry
      }).spread(function (response, data) {
        response.statusCode.should.equal(401);
      });
    });

    it('should deny misauthenticated requests', function () {
      var bearer = (new Buffer(':' + 'foobar')).toString('base64');
      var entry = {
        timestamp: Date.now(),
        foo: 1.23,
        bar: 100*Math.random()
      };

      return request.postAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        json: entry,
        auth: { bearer: bearer }
      }).spread(function (response, data) {
        response.statusCode.should.equal(403);
      });
    });

    it('should verify that the token and source match', function () {
      var bearer = (new Buffer(':' + other.token)).toString('base64');
      var entry = {
        timestamp: Date.now(),
        foo: 1.23,
        bar: 100*Math.random()
      };

      return request.postAsync({
        url: baseUrl + '/sources/' + source + '/entries',
        json: entry,
        auth: { bearer: bearer }
      }).spread(function (response, data) {
        response.statusCode.should.equal(403);
      });
    });
  });
});
