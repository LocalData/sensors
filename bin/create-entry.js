#!/usr/local/bin/node
'use strict';

var logfmt = require('logfmt');
var Promise = require('bluebird');
var request = require('request');

Promise.promisifyAll(request);

var host = process.argv[2];
var source = process.argv[3];
var token = process.argv[4];

var data = {
  timestamp: Date.now(),
  location: [-122.430467, 37.767358],
  airquality: 'Fresh',
  airquality_raw: 24,
  dust: 374.71,
  humidity: 43.6,
  light: 4223,
  sound: 1728,
  temperature: 25.7,
  uv: 277.48
};

request.postAsync({
  url: 'http://' + host + '/api/v1/sources/' + source + '/entries',
  auth: {
    bearer: (new Buffer(':' + token)).toString('base64')
  },
  json: data
}).spread(function (response, body) {
  logfmt.log({
    status: response.statusCode,
    body: JSON.stringify(body)
  });
}).catch(function (error) {
  logfmt.error(error);
});
