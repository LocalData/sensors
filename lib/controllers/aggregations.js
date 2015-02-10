'use strict';

var _ = require('lodash');
var csvWriter = require('csv-write-stream');
var logfmt = require('logfmt');

var sequelize = require('../sequelize');
var util = require('../util');

var MAX_RESPONSE_COUNT = 1000;

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

var selectorTemplate = _.template('rollup."${i}" AS "${i}"');
var aggregatorTemplate = _.template('${op}((r.data#>>:dataIndex${i})::float8) AS "${i}"');
var dataIndexTemplate = _.template('{${name},${opindex}}');
var eachSourceTemplate = _.template('SELECT sourcelist.source, rollup.t AS "timestamp", ' +
  '${fieldSelectors} FROM (SELECT unnest::CHARACTER(25) AS source from unnest(:sources)) AS sourcelist, ' +
  'LATERAL (SELECT to_timestamp(trunc(EXTRACT(EPOCH FROM r.ts) / :resolution) * :resolution) AS t, ' +
  '${fieldAggregators} FROM rollup_5min r WHERE r.source = sourcelist.source ' +
  'AND r.ts >= :from AND r.ts < :before GROUP BY t ORDER BY t) AS rollup');
var overCityTemplate = _.template('SELECT rollup.city AS city, rollup.t AS "timestamp", ' +
  '${fieldSelectors} FROM (SELECT :city AS city, to_timestamp(trunc(EXTRACT(EPOCH FROM r.ts) / :resolution) * :resolution) AS t, ' +
  '${fieldAggregators} FROM rollup_5min r, sources s WHERE r.source = s.source AND s.data->>\'city\' = :city ' +
  'AND r.ts >= :from AND r.ts < :before GROUP BY t) AS rollup ORDER BY "timestamp"');

// Supported query parameters:
// op: {mean|max|min}
// each.sources: comma-separated source IDs
// over.city: aggregate over all sources with matching source.data.city
// fields: comma-separated fields to include
// from, before: (required)
// resolution: ex. 1h or 20m
exports.get = function get(req, res) {
  var format = req.params.format || req.query.format || 'json';

  var op = req.query.op || 'mean';
  var resolution = parseResolution(req.query.resolution);
  var from = util.tryParseTimestamp(req.query.from);
  var before = util.tryParseTimestamp(req.query.before);
  // TODO: Support aggregation over a set of sources, not just for each source.
  var sources = req.query['each.sources'];
  var city = req.query['over.city'];
  var fields = req.query.fields;

  // Validate the query parameters

  if (sources) {
    sources = sources.split(',');
  }

  if (!sources && !city) {
    res.status(400).send({
      name: 'SyntaxError',
      message: 'Must specify each.sources or over.city'
    });
    return;
  }

  if (!fields) {
    res.status(400).send({
      name: 'SyntaxError',
      message: 'Must specify fields parameter'
    });
    return;
  }
  fields = fields.split(',');

  if (!resolution) {
    res.status(400).send({
      name: 'SyntaxError',
      message: 'Must specify resolution parameter'
    });
    return;
  }

  if (!before || !from) {
    res.status(400).send({
      name: 'SyntaxError',
      message: 'Must specify values for before/from'
    });
  }

  if (!util.validTimeRangeLength({
    from: from,
    before: before,
    resolution: resolution
  }, MAX_RESPONSE_COUNT)) {
    res.status(400).send({
      name: 'RangeError',
      message: 'Time range represents more than the maximum ' + MAX_RESPONSE_COUNT + ' possible results per query'
    });
    return;
  }

  var opNames = {
    count: 'count',
    mean: 'avg',
    max: 'max',
    min: 'min',
    sumsq: 'sum'
  };

  var opIndexes = {
    count: 0,
    mean: 1,
    max: 2,
    min: 3,
    sumsq: 4
  };

  var fieldSelectors = [];
  var fieldAggregators = [];
  var fieldMap = [];
  var subs = {
    resolution: resolution,
    from: from,
    before: before
  };

  fields.forEach(function (name, i) {
    // Don't use the actual field names in the query template, so we avoid SQL
    // injection opportunities.
    subs['field' + i] = name;
    subs['dataIndex' + i] = dataIndexTemplate({
      name: name,
      opindex: opIndexes[op]
    });
    fieldMap[i] = name;
    fieldSelectors.push(selectorTemplate({ i: i }));
    fieldAggregators.push(aggregatorTemplate({
      op: opNames[op],
      i: i
    }));
  });

  var query;
  if (sources) {
    subs.sources = sources;
    query = sequelize.query(eachSourceTemplate({
      fieldSelectors: fieldSelectors.join(', '),
      fieldAggregators: fieldAggregators.join(', ')
    }), null, {
        raw: true
    }, subs);
  } else if (city) {
    subs.city = city;
    query = sequelize.query(overCityTemplate({
      fieldSelectors: fieldSelectors.join(', '),
      fieldAggregators: fieldAggregators.join(', ')
    }), null, {
        raw: true
    }, subs);
  } else {
    // No sources were specified, neither directly nor indirectly.
    // We have already validated the query parameters, so we should never get
    // here.
    res.sendStatus(500);
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

    // Set cache headers based on the specifics of the query.
    if ((Date.now() - before) > Math.max(resolution, 300) * 1000) {
      // If the data is from sufficiently in the past, we can let proxies serve
      // it from the cache without revalidation.
      res.set('Cache-Control', 's-maxage=3600');
    } else if (resolution > 1800) {
      // For recent queries with coarse resolution, we can let proxies serve
      // from cache for a little bit.
      res.set('Cache-Control', 's-maxage=300');
    }

    if (format === 'csv') {
      // CSV
      res.type('text/csv');
      if (sources) {
        res.set('Content-Disposition', 'attachment; filename=' + sources.join('-') + '.csv');
      } else if (city) {
        res.set('Content-Disposition', 'attachment; filename=' + _.kebabCase(city) + '.csv');
      }
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
      // JSON
      var out = {
        links: {
          prev: util.resolveQuery(req, {
            from: (new Date(2*from.getTime() - before.getTime())).toISOString(),
            before: from.toISOString()
          }),
          next: util.resolveQuery(req, {
            from: before.toISOString(),
            before: (new Date(2*before.getTime() - from.getTime())).toISOString()
          })
        },
        data: chained.value()
      };
      res.status(200).send(out);
    }
  }).catch(function (error) {
    logfmt.error(error);
    res.sendStatus(500);
  });
};
