'use strict';

var _ = require('lodash');

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
// Also handle the special case of "now", which translates to current server
// time.
util.tryParseTimestamp = function tryParseTimestamp(t) {
  if (t && t.toLowerCase && t.toLowerCase() === 'now') {
    return new Date();
  }

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

util.validTimeRangeLength = function validTimeRangeLength(options, maxLength) {
  var start = (options.from || options.after).getTime() / 1000;
  var end = (options.before || options.until).getTime() / 1000;
  var count = Math.floor((end - start) / options.resolution);
  if (options.after) {
    count -= 1;
  }
  if (options.until) {
    count += 1;
  }
  return count <= maxLength;
};

util.resolveQuery = function resolveQuery(req, params) {
  var base = req.protocol + '://' + req.get('Host') + req.path;
  if (!params) {
    return base;
  }
  return encodeURI(base + '?' + _(params).defaults(req.query).map(function (value, key) {
    if (value) {
      return key + '=' + value;
    }
    return undefined;
  }).compact().join('&'));
};

util.warnDeprecated = function warnDeprecated(req, res, next) {
  logfmt.log({
    level: 'warning',
    issue: 'no_api_version'
  });
  next();
};
