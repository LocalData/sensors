'use strict';

var cuid = require('cuid');
var Sequelize = require('sequelize');
var uuid = require('node-uuid');

var sequelize = require('../sequelize');


module.exports = sequelize.define('source', {
  id: {
    type: Sequelize.CHAR(25),
    primaryKey: true,
    defaultValue: cuid,
    field: 'source'
  },
  token: {
    type: Sequelize.TEXT,
    defaultValue: function () { return uuid.v4(); },
    unique: true
  },
  email: {
    type: Sequelize.TEXT,
  },
  data: {
    type: Sequelize.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'sources',
  timestamps: false
});
