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

// Attempt to parse a date/time string (2015-01-23T19:46:59.343Z) or a string
// indicating the number of milliseconds since the epoch (JavaScript time).
util.tryParseTimestamp = function tryParseTimestamp(t) {
  var d = new Date(t);
  if (!isNaN(d.getTime())) {
    return d;
  }

  d = new Date(util.tryParseInt(t));
  if (!isNaN(d.getTime())) {
    return d;
  }

  return undefined;
};

util.warnDeprecated = function warnDeprecated(req, res, next) {
  logfmt.log({
    level: 'warning',
    issue: 'no_api_version'
  });
  next();
};
