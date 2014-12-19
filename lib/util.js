'use strict';

var util = require('util');

var logfmt = require('logfmt');

module.exports = util;

util.tryParseInt = function tryParseInt(s) {
  var x = parseInt(s, 10);
  if (isNaN(x)) {
    return undefined;
  }
  return x;
};

util.warnDeprecated = function warnDeprecated(req, res, next) {
  logfmt.log({
    level: 'warning',
    issue: 'no_api_version'
  });
  next();
};