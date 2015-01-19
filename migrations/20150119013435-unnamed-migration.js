'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable('sources', {
      source: {
        type: DataTypes.CHAR(25),
        primaryKey: true
      },
      token: {
        type: DataTypes.TEXT,
        unique: true
      },
      data: DataTypes.JSON
    }).then(function () {
      return migration.createTable('entries', {
        source: DataTypes.CHAR(25),
        ts: DataTypes.DATE,
        data: DataTypes.JSON
      });
    }).then(function () {
      return migration.addIndex('entries', ['source'], {
        indexName: 'entries_source_idx'
      });
    }).then(function () {
      return migration.addIndex('entries', ['ts'], {
        indexName: 'entries_ts_idx'
      });
    }).done(done);
  },

  down: function(migration, DataTypes, done) {
    done();
  }
};
