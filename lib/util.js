'use strict';

var util = require('util');

module.exports = util;

util.tryParseInt = function tryParseInt(s) {
  var x = parseInt(s, 10);
  if (isNaN(x)) {
    return undefined;
  }
  return x;
};