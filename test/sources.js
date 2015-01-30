/*globals describe, it, before, after */
'use strict';

var Promise = require('bluebird');
var request = require('request');

var config = require('../lib/config');
var server = require('../lib/server');

var fixtures = require('./lib/fixtures');

Promise.promisifyAll(request);

var baseUrl = 'http://localhost:' + config.port + '/api/v1';

describe('sources', function () {
  before(function (done) {
    server.start(done);
  });

  after(function () {
    server.stop();
  });

  describe('get', function () {
    var source;
    before(function () {
      return fixtures.createSource({
        foo: 'bar',
        email: 'foo@bar.com'
      }).then(function (s) {
        source = s;
      });
    });

    it('should return source details but not the token nor email', function () {
      return request.getAsync({
        url: baseUrl + '/sources/' + source.id
      }).spread(function (response, body) {
        response.statusCode.should.equal(200);
        response.should.be.json;

        var ret = JSON.parse(body);
        ret.should.have.property('id');
        ret.id.should.equal(source.id);
        ret.should.have.property('data');
        ret.data.foo.should.equal(source.data.foo);
        ret.should.not.have.property('token');
        ret.should.not.have.property('email');
        ret.data.should.not.have.property('email');
      });
    });
  });

  describe('create', function () {
    it('should create without an error', function () {
      return request.postAsync({
        url: baseUrl + '/sources',
        json: {
          data: {
            foo: 'bar',
            email: 'foo@bar.com'
          }
        }
      }).spread(function (response, source) {
        response.statusCode.should.equal(201);
        response.should.be.json;
        source.should.have.property('id');
        source.should.have.property('token');
        source.should.have.property('data');
        source.data.foo.should.equal('bar');
        source.should.have.property('email');
        source.email.should.equal('foo@bar.com');
      });
    });
  });
});
