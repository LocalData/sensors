'use strict';

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
  
  Entry.save({
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
  var startIndex = util.tryParseInt(req.query.startIndex);
  var count = util.tryParseInt(req.query.count);
  var after = util.tryParseInt(req.query.after);
  var until = util.tryParseInt(req.query.until);
  var sort = req.query.sort;
  
  var query = {
    source: req.params.source
  };
  
  query.startIndex = startIndex;
  query.count = count;
  query.after = after;
  query.until = until;
  query.sort = 'asc';

  if (sort === 'desc') {
    query.sort = sort;
  }

  Entry.find(query)
  .then(function (entries) {
    res.status(200).json(entries);
  }).catch(function (error) {
    console.log(error);
    console.log(error.stack);
    res.sendStatus(500);
  });
};