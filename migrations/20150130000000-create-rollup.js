'use strict';

var fs = require('fs');
var path = require('path');

var sqlPrefix;
var upRaw;
var downRaw;

if (path.extname(__filename) === '.js') {
  sqlPrefix = __filename.slice(0,-3);
  upRaw = path.join(sqlPrefix, 'up.sql');
  downRaw = path.join(sqlPrefix, 'down.sql');
}

if (!upRaw || !downRaw) {
  throw new Error('Could not construct paths to raw up/down migration scripts');
}

module.exports = {
  up: function(migration, DataTypes, done) {
    // Create a 5-minute rollup table.
    return migration.createTable('rollup_5min', {
      source: DataTypes.CHAR(25),
      ts: DataTypes.DATE,
      mean: DataTypes.JSON,
      // We need to keep separate counts for each data field, because the same
      // source could add/remove fields in its lifetime.
      count: DataTypes.JSON,
      max: DataTypes.JSON,
      min: DataTypes.JSON,
      sumsq: DataTypes.JSON,
      // The creation timestamp helps us build/rebuild this table by identifying
      // entries that have not been added.
      createdAt: DataTypes.DATE,
      // The update timestamp helps us track and sanity check changes within a
      // rollup time slot.
      updatedAt: DataTypes.DATE
    }).then(function () {
      // Compound index on (source, ts)
      return migration.addIndex('rollup_5min', ['source', 'ts'], {
        indexName: 'rollup_5min_source_ts_idx',
        indicesType: 'UNIQUE'
      }).catch(function (error) {
        // XXX
        console.log('\n\nAHA\n\n');
        console.log(error);
        throw error;
      });
    }).then(function () {
      // Perform some work in raw SQL rather than cramming function definitions
      // into gross concatenated js strings.
      return migration.sequelize.query(fs.readFileSync(upRaw, 'utf8'), null, {
        raw: true
      });
    }).catch(function (error) {
      console.log(error);
      throw error;
    }).done(done);
  },

  down: function(migration, DataTypes, done) {
    // Drop the source index.
    migration.removeIndex('rollup_5min', 'rollup_5min_source_idx')
    .then(function () {
      // Drop the ts index.
      return migration.removeIndex('rollup_5min', 'rollup_5min_ts_idx');
    }).then(function () {
      // Drop the (source, ts) unique index.
      return migration.removeIndex('rollup_5min', 'rollup_5min_source_ts_idx');
    }).then(function () {
      // Drop the 5-minute rollup table.
      return migration.dropTable('rollup_5min');
    }).then(function () {
      return migration.sequelize.query(fs.readFileSync(downRaw, 'utf8'), null, {
        raw: true
      });
    }).done(done);
  }
};
