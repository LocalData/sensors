"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.addIndex('entries', ['source', 'ts'], {
      concurrently: true
    }).done(done);
  },

  down: function(migration, DataTypes, done) {
    migration.removeIndex('entries', ['source', 'ts'])
    .done(done);
  }
};
