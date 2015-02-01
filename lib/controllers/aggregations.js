'use strict';

var _ = require('lodash');
var csvWriter = require('csv-write-stream');
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
// TODO: specify a group of aggregations with sources=x,y,z and a groupwise
// aggregation with over=x,y,z or over[city]=San Francisco
exports.get = function get(req, res) {
  var format = req.params.format || 'json';

  // TODO: Support different aggregate operations
  //var op = req.query.op || 'mean';
  var op = 'mean';
  var resolution = parseResolution(req.query.resolution);
  var from = new Date(req.query.from);
  var before = new Date(req.query.before);
  var sources = req.query.sources;
  var city = req.query.city;
  var fields = req.query.fields;

  if (sources) {
    sources = sources.split(',');
  }

  if (!fields) {
    // TODO: send an error message.
    res.sendStatus(400);
  }
  fields = fields.split(',');

  var fieldNames = [];
  var fieldAggregators = [];
  var fieldMap = [];
  var subs = {
    resolution: resolution,
    from: from,
    before: before
  };

  fields.forEach(function (name, i) {
    // Don't use the actual field names in the template, so we avoid SQL
    // injection opportunities.
    fieldNames.push('"' + i + '"');
    // TODO: Use different templates based on the different values for `op`
    fieldAggregators.push('avg((r.mean->>:field' + i + ')::DOUBLE PRECISION) AS "' + i + '"');
    subs['field' + i] = name;
    fieldMap[i] = name;
  });

  var query;
  if (sources) {
    subs.sources = sources;
    query = sequelize.query('SELECT ' +
      'sourcelist.source, ' +
      'rollup.timestamp, ' +
      fieldNames.join(', ') +
      ' FROM (SELECT unnest::CHARACTER(25) AS source FROM unnest(:sources)) AS sourcelist, ' +
      'LATERAL (SELECT to_timestamp(trunc(EXTRACT(EPOCH FROM r.ts) / :resolution) * :resolution) AS "timestamp", ' +
      fieldAggregators.join(', ') +
      ' FROM rollup_5min AS r ' +
      'WHERE r.source = sourcelist.source ' +
      'AND r.ts >= :from::TIMESTAMPTZ ' +
      'AND r.ts < :before::TIMESTAMPTZ ' +
      'GROUP BY "timestamp" ORDER BY "timestamp") AS rollup', null, {
        raw: true
    }, subs);
  } else if (city) {
    subs.city = city;
    query = sequelize.query('SELECT ' +
      ':city AS city, ' +
      'to_timestamp(trunc(EXTRACT(EPOCH FROM r.ts) / (:resolution)) * :resolution) AS "timestamp", ' +
      fieldAggregators.join(', ') +
      ' FROM rollup_5min r, sources s ' +
      'WHERE r.source = s.source AND json_extract_path_text(s."data", \'city\') = :city ' +
      'AND r.ts >= :from::timestamp with time zone ' +
      'AND r.ts < :before::timestamp with time zone ' +
      'GROUP BY "timestamp" ORDER BY "timestamp"', null, {
        raw: true
      }, subs);
  } else {
    // No sources were specified, neither directly nor indirectly.
    // TODO: send an error message.
    res.sendStatus(400);
  }

  if (!query) {
    return;
  }

  query.then(function (results) {
    var chained = _(results).map(function (item) {
      var out = {};
      _.keys(item).forEach(function (key) {
        var newKey = fieldMap[key];
        if (newKey) {
          out[newKey] = item[key];
        } else {
          out[key] = item[key];
        }
      });
      return out;
    });

    if (format === 'csv') {
      res.type('text/csv');
      res.status(200);
      var keys = Object.keys(chained.first() || {});

      // Make sure the timestamp field is first, since it is the x-axis.
      // Make sure the data fields are in the order specified by the query
      // parameter.
      var headers = _(keys)
      .difference(['timestamp'])
      .difference(fields)
      .unshift('timestamp')
      .concat(fields).value();

      var writer = csvWriter({
        // Preserve specified ordering of the fields
        headers: headers
      });

      writer.pipe(res);
      chained.forEach(function (item) {
        item.timestamp = item.timestamp.toISOString();
        writer.write(item);
      }).value();
      writer.end();
    } else {
      res.status(200).send(chained.value());
    }
  }).catch(function (error) {
    logfmt.error(error);
    res.sendStatus(500);
  });
};
