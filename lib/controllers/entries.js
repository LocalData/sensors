'use strict';

var _ = require('lodash');
var csvWriter = require('csv-write-stream');

var util = require('../util');

var Entry = require('../models/Entry');

// POST /api/sources/:source/entries
// {
//   timestamp: 1418452398629
//   foo: 1.23,
//   bar: 77.3,
//   baz: 0.2,
//   loc: [-44, 77]
// }
exports.post = function post(req, res) {
  // TODO: Provide useful error messages to the client.
  if (!req.body.timestamp) {
    res.status(400).json({});
    return;
  }

  var timestamp = req.body.timestamp;
  req.body.timestamp = undefined;

  Entry.create({
    source: req.params.source,
    timestamp: timestamp,
    data: req.body
  }).then(function () {
    res.sendStatus(201);
  }).catch(function (error) {
    console.log(error);
    console.log(error.stack);
    res.sendStatus(500);
  });
};

exports.list = function list(req, res) {
  var format = req.params.format || 'json';
  var startIndex = util.tryParseInt(req.query.startIndex) || 0;
  var count = util.tryParseInt(req.query.count);
  var sort = req.query.sort;
  var from = util.tryParseTimestamp(req.query.from);
  var before = util.tryParseTimestamp(req.query.before);
  var after = util.tryParseTimestamp(req.query.after);
  var until = util.tryParseTimestamp(req.query.until);

  var where = {
    source: req.params.source
  };

  if (from || before || after || until) {
    where.ts = {};
    if (count === undefined) {
      count = 1000;
    }
  } else {
    if (count === undefined) {
      count = 10;
    }
  }

  if (from) {
    where.ts.gte = from;
  }

  if (before) {
    where.ts.lt = before;
  }

  if (after) {
    where.ts.gt = after;
  }

  if (until) {
    where.ts.lte = until;
  }

  if (count > 1000) {
    count = 1000;
  }

  var order  = 'ts ASC';

  if (sort === 'desc') {
    order = 'ts DESC';
  }

  Entry.findAll({
    where: where,
    order: order,
    offset: startIndex,
    limit: count
  }, {
    raw: true
  }).then(function (entries) {
    if (format === 'csv') {
      // Send CSV data
      res.type('text/csv');
      res.status(200);
      var first = entries[0];
      if (!first) {
        res.end();
        return;
      }

      var splitLocation = _.isArray(first.data.location);

      // Make sure timestamp is the first header.
      var headers = _(first)
      .keys()
      .difference(['timestamp','data'])
      .unshift('timestamp');

      if (splitLocation) {
        headers = headers.push('longitude').push('latitude');
      }

      headers = headers.concat(Object.keys(first.data));

      if (splitLocation) {
        headers = headers.difference(['location']);
      }

      var writer = csvWriter({
        headers: headers.value()
      });
      writer.pipe(res);

      _(entries).map(function (item) {
        // Bring the data subfields up one level.
        // Use ISOString timestamp format.
        var tmp = _.assign({
          timestamp: item.timestamp.toISOString(),
          source: item.source
        }, item.data);
        if (splitLocation) {
          tmp.longitude = tmp.location[0];
          tmp.latitude = tmp.location[1];
          tmp.location = undefined;
        }
        return tmp;
      }).forEach(function (item) {
        writer.write(item);
      }).value();

      writer.end();
    } else {
      // Send JSON data
      res.status(200).json(entries);
    }
  }).catch(function (error) {
    console.log(error);
    console.log(error.stack);
    res.sendStatus(500);
  });
};
