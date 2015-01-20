#!/usr/local/bin/node
'use strict';

var logfmt = require('logfmt');
var Promise = require('bluebird');
var request = require('request');

Promise.promisifyAll(request);

var host = process.argv[2];
var name = process.argv[3];
var email = process.argv[4];

var data = {
  name: name,
  email: email
};

request.postAsync({
  url: 'http://' + host + '/api/v1/sources',
  json: {
    data: data
  },
}).spread(function (response, body) {
  if (response.statusCode === 201) {
    logfmt.log({ status: response.statusCode });
    logfmt.log({
      id: body.id,
      token: body.token,
      bearer: (new Buffer(':' + body.token)).toString('base64')
    });
  } else {
    logfmt.log({
      status: response.statusCode,
      body: JSON.stringify(body)
    });
  }
}).catch(function (error) {
  logfmt.error(error);
});
