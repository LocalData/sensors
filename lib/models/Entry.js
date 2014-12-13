'use strict';

var _ = require('lodash');

var postgres = require('../postgres');

var Entry = module.exports;


Entry.find = function find(options) {
  var queryConfig;
  
  if ((options.after !== undefined && options.until === undefined) ||
      (options.until !== undefined && options.after === undefined)) {
    throw new Error('after and until are both required');
  }
  if (options.after !== undefined &&
      options.until !== undefined &&
      options.startIndex === undefined &&
      options.count === undefined) {
    // Time-bounded query without limit/offset
    // TODO: Implement timespan queries.
    queryConfig = {
      text: '',
      values: '',
      name: ''
    };
  } else if (options.after !== undefined &&
             options.until !== undefined &&
             options.startIndex === undefined &&
             options.count !== undefined) {
    // Time-bounded with limit
    // TODO: Implement timespan+count queries.
    queryConfig = {
      text: '',
      values: '',
      name: ''
    };
  } else if (options.startIndex !== undefined && options.count !== undefined) {
    // Limit/offset
    queryConfig = {
      text: 'SELECT source, ts, data FROM entries ORDER BY ts ASC LIMIT $1 OFFSET $2',
      values: [options.count, options.startIndex],
      name: 'getChunk'
    };
  } else {
    throw new Error('Unsupported query setup: ' + JSON.stringify(options));
  }
  
  // TODO: Use the streaming interface.
  return postgres.query(queryConfig)
  .then(function (result) {
    return _.map(result.rows, function (row) {
      return {
        source: row.source,
        timestamp: row.ts,
        data: row.data
      };
    });
  });
};

Entry.save = function save(doc) {
  if (_.isString(doc.timestamp)) {
    doc.timestamp = parseInt(doc.timestamp, 10);
  }

  var queryConfig = {
    text: 'INSERT INTO entries SELECT $1, to_timestamp($2), $3',
    values: [doc.source, doc.timestamp / 1000, JSON.stringify(doc.data)],
    name: 'insertEntry'
  };
  return postgres.query(queryConfig);
};