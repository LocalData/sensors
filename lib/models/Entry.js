'use strict';

var Sequelize = require('sequelize');

var sequelize = require('../sequelize');

var Entry = module.exports = sequelize.define('entry', {
  source: Sequelize.CHAR(25),
  timestamp: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
    field: 'ts'
  },
  data: {
    type: Sequelize.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'entries',
  timestamps: false,
  indexes: [ {
    fields: 'ts',
    name: 'entries_ts_idx'
  }, {
    fields: 'source',
    name: 'entries_source_idx'
  } ]
});

Entry.removeAttribute('id');
