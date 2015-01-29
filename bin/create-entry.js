#!/usr/local/bin/node
'use strict';

var logfmt = require('logfmt');
var Promise = require('bluebird');
var request = require('request');

Promise.promisifyAll(request);

var host = process.argv[2];
var source = process.argv[3];
var token = process.argv[4];

function rand(min, max, round) {
  var r = (Math.random() * (max - min)) + min;
  if (round) { return Math.round(r); }
  return r;
}

var data = {
  timestamp: Date.now(),
  location: [-122.430467, 37.767358],
  airquality: 'Fresh',
  airquality_raw: 24 + rand(-4, 4, true),
  dust: 374.71 + rand(-1000, 1000, true)/100,
  humidity: 43.6 + rand(-50, 50, true)/10,
  light: 4223 + rand(-1000, 1000, true),
  sound: 1728 + rand(-1000, 1000, true),
  temperature: 25.7 + rand(-50, 50, true)/10,
  uv: 277.48 + rand(-100, 100, true)/10
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
