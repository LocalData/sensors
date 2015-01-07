'use strict';

var cuid = require('cuid');
var uuid = require('node-uuid');

var postgres = require('../postgres');

var Source = module.exports;

Source.find = function find(options) {
  var queryConfig;

  if (options.token) {
    queryConfig = {
      text: 'SELECT source FROM sources WHERE token = $1',
      values: [options.token],
      name: 'getSourceByToken'
    };
  } else if (options.id) {
    queryConfig = {
      text: 'SELECT source, data FROM sources WHERE source = $1',
      values: [options.id],
      name: 'getSourceById'
    };
  } else {
    return null;
  }
  
  return postgres.query(queryConfig)
  .then(function (result) {
    if (result.rows.length > 0) {
      return {
        id: result.rows[0].source,
        data: result.rows[0].data
      };
    } else {
      return null;
    }
  });
};

Source.create = function create(options) {
  var id = cuid();
  var token = uuid.v4();
  var data = options.data || {};

  var queryConfig = {
    text: 'INSERT INTO sources SELECT $1, $2, $3::json',
    values: [id, token, JSON.stringify(data)],
    name: 'createSource'
  };
  
  return postgres.query(queryConfig)
  .then(function (result) {
    return {
      id: id,
      token: token
    };
  });
};