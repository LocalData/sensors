'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var request = require('request');

var config = require('../../lib/config');

Promise.promisifyAll(request);

require('http').globalAgent.maxSockets = 100;

var baseUrl = 'http://localhost:' + config.port + '/api/v1';

exports.createSource = function (data) {
  return request.postAsync({
    url: baseUrl + '/sources',
    json: { data: data }
  }).spread(function (response, data) {
    if (response.statusCode !== 201) {
      throw new Error('Got status code ' + response.statusCode);
    }
    return data;
  });
};

exports.createEntries = function (source, token, count) {
  var bearer = (new Buffer(':' + token)).toString('base64');
  // Create entries sequentially, so we have a deterministic order.
  return Promise.reduce(_.range(count), function (memo, i) {
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
      if (response.statusCode !== 201) {
        throw new Error('Got status code ' + response.statusCode);
      }
      memo.push(entry);
      return memo;
    });
  }, []);
};

exports.createEntriesParallel = function (source, token, count) {
  var bearer = (new Buffer(':' + token)).toString('base64');
  return Promise.map(_.range(count), function (i) {
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
      if (response.statusCode !== 201) {
        throw new Error('Got status code ' + response.statusCode);
      }
      return entry;
    });
  }, { concurrency: 50 });
};
