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
      var count = 15;
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

    it('should default to count=10', function () {
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries'
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(10);
      });
    });

    it('should respect from and before as ISO strings', function () {
      var from = new Date(entries[1].timestamp);
      var before = new Date(entries[3].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.toISOString(),
          before: before.toISOString()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(2);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.within(from.getTime(), before.getTime());
          Date.parse(ret.timestamp).should.be.below(before.getTime());
        });
      });
    });

    it('should respect from and before as milliseconds since epoch', function () {
      var from = new Date(entries[1].timestamp);
      var before = new Date(entries[3].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.getTime(),
          before: before.getTime()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(2);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.within(from.getTime(), before.getTime());
          Date.parse(ret.timestamp).should.be.below(before.getTime());
        });
      });
    });

    it('should respect after and until as ISO strings', function () {
      var after = new Date(entries[1].timestamp);
      var until = new Date(entries[3].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          after: after.toISOString(),
          until: until.toISOString()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(2);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.within(after.getTime(), until.getTime());
          Date.parse(ret.timestamp).should.be.above(after.getTime());
        });
      });
    });

    it('should respect after and until as milliseconds since epoch', function () {
      var after = new Date(entries[1].timestamp);
      var until = new Date(entries[3].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          after: after.getTime(),
          until: until.getTime()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(2);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.within(after.getTime(), until.getTime());
          Date.parse(ret.timestamp).should.be.above(after.getTime());
        });
      });
    });

    it('should not set default count with time queries', function () {
      var count = 15;
      var from = new Date(entries[0].timestamp);
      var before = new Date(entries[count].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.toISOString(),
          before: before.toISOString()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(count);
      });
    });

    it('should respect startIndex and count with time queries', function () {
      var offset = 1;
      var from = new Date(entries[offset].timestamp);
      var until = new Date(entries[19].timestamp);
      var start = 5;
      var count = 5;
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.getTime(),
          until: until.getTime(),
          startIndex: start,
          count: count
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body);
        data.length.should.equal(count);
        data.forEach(function (ret, i) {
          var ts = Date.parse(ret.timestamp);
          ts.should.be.within(from.getTime(), until.getTime());
          ts.should.equal(entries[start + i + offset].timestamp);
        });
      });
    });

  });

  describe('list large', function () {
    var source;
    var entries;
    before(function () {
      this.timeout(10000);
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

    it('should limit to 1000 results with time queries', function () {
      var MAX = 1000;
      // Set time parameters that will include all of the entries we created.
      var from = new Date(entries[0].timestamp);
      var until = new Date(entries[entries.length - 1].timestamp + 60000);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.toISOString(),
          until: until.toISOString()
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
