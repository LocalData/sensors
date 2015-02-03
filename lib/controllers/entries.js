'use strict';

var _ = require('lodash');
var csvWriter = require('csv-write-stream');

var util = require('../util');

var Entry = require('../models/Entry');


/*
 * Assumes entries has at least 1 element.
 */
function makeCsvStream(entries) {
  var first = entries[0];

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

  process.nextTick(function () {
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
  });

  return writer;
}


// POST /api/sources/:source/entries
// {
//   timestamp: 1418452398629
//   foo: 1.23,
//   bar: 77.3,
//   baz: 0.2,
//   loc: [-44, 77]
// }
exports.post = function post(req, res) {
  if (!req.body.timestamp) {
    res.status(400).send({
      name: 'SyntaxError',
      message: 'timestamp field required'
    });
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
  var count = util.tryParseInt(req.query.count);
  var sort = req.query.sort || 'asc';
  var from = util.tryParseTimestamp(req.query.from);
  var before = util.tryParseTimestamp(req.query.before);
  var after = util.tryParseTimestamp(req.query.after);
  var until = util.tryParseTimestamp(req.query.until);

  var where = {
    source: req.params.source
  };

  if (count === undefined) {
    count = 100;
  }

  if (count > 1000) {
    res.status(400).send({
      name: 'RangeError',
      message: 'count must be less than or equal to 1000'
    });
    return;
  }

  sort = sort.toLowerCase();
  if (sort !== 'asc' && sort !== 'desc') {
    res.status(400).send({
      name: 'SyntaxError',
      message: 'sort must be "asc" or "desc"'
    });
    return;
  }

  if (!(from || before || after || until)) {
    if (sort === 'desc') {
      until = new Date();
    } else {
      from = new Date(0);
    }
  }

  where.ts = {};

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

  var order  = 'ts ASC';

  if (sort === 'desc') {
    order = 'ts DESC';
  }

  Entry.findAll({
    where: where,
    order: order,
    limit: count
  }, {
    raw: true
  }).then(function (entries) {
    if (format === 'csv') {
      // Send CSV data
      res.type('text/csv');
      res.status(200);
      if (entries.length === 0) {
        res.end();
      } else {
        makeCsvStream(entries).pipe(res);
      }
    } else {
      // Send JSON data

      // Create prev/next links, so clients can easily page through results.
      var prev;
      var next;
      if (entries.length === 0) {
        // TODO: handle the case of no results. We construct the next/prev links
        // from the relevant time boundary inputs rather than from the (empty)
        // data.
      } else if (sort === 'asc') {
        // The next page follows the current one chronologically.
        // Regardless of how the time boundaries were specified, we want to get
        // the entries after the last one we sent without including it, so we
        // use `after`.
        next = util.resolveQuery(req, {
          after: entries[entries.length - 1].timestamp.toISOString(),
          count: count,
          before: null,
          until: null,
          from: null
        });
        prev = util.resolveQuery(req, {
          before: entries[0].timestamp.toISOString(),
          count: count,
          after: null,
          until: null,
          from: null
        });
      } else {
        // Sort is descending, so the first entry is the newest.
        // the "next" page should be one chunk earlier chronologically
        next = util.resolveQuery(req, {
          before: entries[entries.length - 1].timestamp.toISOString(),
          count: count,
          after: null,
          until: null,
          from: null
        });
        prev = util.resolveQuery(req, {
          after: entries[0].timestamp.toISOString(),
          count: count,
          before: null,
          until: null,
          from: null
        });
      }
      var out = {
        links: {
          prev: prev,
          next: next
        },
        data: entries
      };
      res.status(200).send(out);
    }
  }).catch(function (error) {
    console.log(error);
    console.log(error.stack);
    res.sendStatus(500);
  });
};
