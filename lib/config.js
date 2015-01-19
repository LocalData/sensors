'use strict';

var Promise = require('bluebird');

var config = module.exports;

config.postgres = process.env.DATABASE_URL;

config.port = process.env.PORT;
