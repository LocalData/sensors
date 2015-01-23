'use strict';

var logfmt = require('logfmt');

var sequelize = require('../sequelize');

// Return the number of seconds represented by str
function parseResolution(str) {
  if (str === undefined || str === null) {
    return str;
  }
  var tmp;

  var len = str.length;
  if (len > 1) {
    if (str[len - 1] === 'm') {
      // Minutes
      tmp = parseInt(str.substring(0, len - 1), 10);
      if (isNaN(tmp)) {
        return null;
      }
      return tmp * 60;
    } else if (str[len - 1] === 'h') {
      // Hours
      tmp = parseInt(str.substring(0, len - 1), 10);
      if (isNaN(tmp)) {
        return null;
      }
      return tmp * 60 * 60;
    } else if (str[len - 1] === 's') {
      // Seconds
      tmp = parseInt(str.substring(0, len - 1), 10);
      if (isNaN(tmp)) {
        return null;
      }
      return tmp;
    }
  }
  return null;
}

// op=mean
// sources=foo,bar,baz
// field=temperature
// from, before
// resolution
exports.get = function get(req, res) {
  //var op = req.query.op;
  var resolution = parseResolution(req.query.resolution);
  var from = new Date(req.query.from);
  var before = new Date(req.query.before);
  var sources = req.query.sources.split(',');
  var fields = req.query.fields;

  if (!fields) {
    // TODO: send an error message.
    res.sendStatus(400);
  }
  fields = fields.split(',');

  var fieldAggregators = [];
  var subs = {
  'resolution': resolution,
  'sources': sources,
  'from': from,
  'before': before
  };

  fields.forEach(function (name, i) {
    // Don't use the actual field names in the template, so we avoid SQL
    // injection opportunities.
    fieldAggregators.push('avg((data->>:field' + i + ')::NUMERIC) AS "' + i + '"');
    subs['field' + i] = name;
  });

  sequelize.query('SELECT ' +
    'source, ' +
    'to_timestamp(trunc(EXTRACT(EPOCH FROM entries.ts) / (:resolution)) * :resolution) AS timestamp, ' +
    fieldAggregators.join(', ') +
    ' FROM entries ' +
    'WHERE source = ANY (:sources) ' +
    'AND entries.ts >= :from::timestamp with time zone ' +
    'AND entries.ts < :before::timestamp with time zone ' +
    'GROUP BY "timestamp", "source" ORDER BY "source", "timestamp"', null, {
      raw: true
  }, subs).then(function (results) {
    results.forEach(function (item) {
      fields.forEach(function (name, i) {
        item[name] = item[i];
        item[i] = undefined;
      });
    });
    res.status(200).send(results);
  }).catch(function (error) {
    logfmt.error(error);
    res.sendStatus(500);
  });
};