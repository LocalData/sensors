'use strict';

var util = require('./util');

var config = module.exports;

config.postgres = process.env.DATABASE_URL;

config.port = process.env.PORT;

config.pgMaxConnections = util.tryParseInt(process.env.PG_MAX_CONNECTIONS) || 10;
