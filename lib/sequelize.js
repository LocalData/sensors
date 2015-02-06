'use strict';

var Sequelize = require('sequelize');

var config = require('./config');

module.exports = new Sequelize(config.postgres, {
  logging: false,
  ssl: true,
  native: true,
  pool: {
    max: config.pgMaxConnections,
    min: 0
  }
});
