'use strict';

var Promise = require('bluebird');

var postgres = require('./postgres');

var config = module.exports;

config.starters = [];
config.start = function () {
  return Promise.all(config.starters.map(function (func) {
    return func();
  }));
};

config.postgres = process.env.DATABASE_URL;

config.starters.push(postgres.connect);

config.port = process.env.PORT;
