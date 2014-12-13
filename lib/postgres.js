'use strict';

var pg = require('pg');

var Promise = require('bluebird');

var config = require('./config');

Promise.promisifyAll(pg);

// Connect to postgres and then hand the client back to the pool.
// Helps make sure we're properly connected to postgres at startup, rather
// than waiting for client activity.
exports.connect = function connect() {
  return pg.connectAsync(config.postgres)
  .bind({})
  .spread(function (client, done) {
    this.done = done;
  }).finally(function () {
    if (this.done) {
      this.done();
    }
  }).catch(function (error) {
    console.log('Error connecting to postgresql database: ' + error.message);
    console.log(error.stack);
    throw error;
  });
};

exports.getClient = function getClient() {
  var close;
  return pg.connectAsync(config.postgres)
  .spread(function (client, done) {
    close = done;
    return client;
  }).disposer(function (client) {
    try {
      if (close) {
        close();
      }
    } catch (error) {
      console.log(error);
      console.log(error.stack);
    }
  });
};

exports.query = function query(config) {
  return Promise.using(exports.getClient(), function (client) {
    return client.queryAsync(config);
  });
};

exports.end = function () {
  return Promise.try(function () {
    pg.end();
  });
};