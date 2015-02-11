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

    function getEntries(qs) {
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: qs
      }).spread(function (response, body) {
        return JSON.parse(body);
      });
    }

    it('should default to first entries sorted chronologically', function () {
      var count = 15;
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          count: count
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var result = JSON.parse(body);
        result.should.have.property('links');
        result.links.should.have.property('next');
        result.links.should.have.property('prev');
        result.should.have.property('data');

        var data = result.data;
        data.length.should.equal(count);
        data.forEach(function (ret, i) {
          ret.should.have.property('source');
          ret.should.have.property('timestamp');
          ret.should.have.property('data');
          Date.parse(ret.timestamp).should.equal(entries[i].timestamp);
        });

        data.reduce(function (prevTimestamp, item) {
          var ts = Date.parse(item.timestamp);
          ts.should.be.above(prevTimestamp);
          return ts;
        }, Number.NEGATIVE_INFINITY);
      });
    });

    it('should default to last entries in reverse chronological order with sort=desc', function () {
      var count = 10;
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          count: count,
          sort: 'desc'
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
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

    it('should default to count=100', function () {
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries'
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
      });
    });

    it('should respect from as an ISO string', function () {
      var from = new Date(entries[1].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.toISOString()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.within(from.getTime(), Date.now());
        });
      });
    });

    it('should respect from as milliseconds since epoch', function () {
      var from = new Date(entries[1].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.getTime()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.within(from.getTime(), Date.now());
        });
      });
    });

    it('should respect before as an ISO string', function () {
      var before = new Date(entries[entries.length - 2].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          before: before.toISOString()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.below(before.getTime());
        });
      });
    });

    it('should respect before as milliseconds since epoch', function () {
      var before = new Date(entries[entries.length - 2].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          before: before.getTime()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.below(before.getTime());
        });
      });
    });

    it('should respect after as an ISO string', function () {
      var after = new Date(entries[1].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          after: after.toISOString()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.above(after.getTime());
        });
      });
    });

    it('should respect after as milliseconds since epoch', function () {
      var after = new Date(entries[1].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          after: after.getTime()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.above(after.getTime());
        });
      });
    });

    it('should respect until as an ISO string', function () {
      var until = new Date(entries[entries.length - 2].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          until: until.toISOString()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.within(0, until.getTime());
        });
      });
    });

    it('should respect until as milliseconds since epoch', function () {
      var until = new Date(entries[entries.length - 2].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          until: until.getTime()
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.within(0, until.getTime());
        });
      });
    });

    it('should interpret "now" properly as a timestamp', function () {
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          until: 'now',
          sort: 'desc',
          count: 1
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(1);
        data.forEach(function (ret, i) {
          Date.parse(ret.timestamp).should.be.below(Date.now());
        });
        return getEntries({
          after: 'now',
          count: 10
        }).then(function (body) {
          body.data.length.should.equal(0);
        });
      });
    });

    it('should return fewer than count entries if dictated by the time boundaries', function () {
      var trueCount = 10;
      var from = new Date(entries[0].timestamp);
      var before = new Date(entries[trueCount].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.toISOString(),
          before: before.toISOString(),
          count: trueCount + 5
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(trueCount);
      });
    });

    it('should return no more than count entries regardless time boundaries', function () {
      var count = 10;
      var from = new Date(entries[0].timestamp);
      var before = new Date(entries[count + 5].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.toISOString(),
          before: before.toISOString(),
          count: count
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(count);
      });
    });

    it('should default to count=100 even with time boundaries', function () {
      var count = 105;
      var from = new Date(entries[0].timestamp);
      var before = new Date(entries[count].timestamp);
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          from: from.toISOString(),
          before: before.toISOString(),
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);

        var data = JSON.parse(body).data;
        data.length.should.equal(100);
      });
    });

    it('should deny requests for more than 1000 results', function () {
      var count = 2000;
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id + '/entries',
        qs: {
          count: count
        }
      }).spread(function (response, body) {
        response.statusCode.should.equal(400);
      });
    });

    it('should order prev, current, next results chronologically for sort=asc', function () {
      var count = 15;
      var results;
      return getEntries({
        sort: 'asc',
        after: entries[50].timestamp,
        count: count
      }).then(function (body) {
        results = body.data;
        return [
          request.getAsync({ url: body.links.prev }).get(1).then(JSON.parse),
          request.getAsync({ url: body.links.next }).get(1).then(JSON.parse)
        ];
      }).all().spread(function (prev, next) {
        prev.data.length.should.equal(count);
        next.data.length.should.equal(count);
        results = prev.data.concat(results).concat(next.data);
        results.length.should.equal(3 * count);

        // Check strict chronological sort order, which assures there are no
        // duplicated timestamps.
        results.reduce(function (prevTimestamp, item) {
          var ts = Date.parse(item.timestamp);
          ts.should.be.above(prevTimestamp);
          return ts;
        }, Number.NEGATIVE_INFINITY);
      });
    });

    it('should order prev, current, next results reverse-chronologically for sort=desc', function () {
      var count = 15;
      var results;
      return getEntries({
        sort: 'desc',
        after: entries[40].timestamp,
        before: entries[60].timestamp,
        count: count
      }).then(function (body) {
        results = body.data;
        return [
          request.getAsync({ url: body.links.prev }).get(1).then(JSON.parse),
          request.getAsync({ url: body.links.next }).get(1).then(JSON.parse)
        ];
      }).all().spread(function (prev, next) {
        prev.data.length.should.equal(count);
        next.data.length.should.equal(count);
        results = prev.data.concat(results).concat(next.data);
        results.length.should.equal(3 * count);

        // Check strict chronological sort order, which assures there are no
        // duplicated timestamps.
        results.reduce(function (prevTimestamp, item) {
          var ts = Date.parse(item.timestamp);
          ts.should.be.below(prevTimestamp);
          return ts;
        }, Number.POSITIVE_INFINITY);
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

    it('should deny malformed authentications', function () {
      // No colon
      var bearer = (new Buffer('foobar')).toString('base64');
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
