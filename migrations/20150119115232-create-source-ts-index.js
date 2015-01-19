"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.addIndex('entries', ['source', 'ts'])
    .done(done);
  },

  down: function(migration, DataTypes, done) {
    migration.removeIndex('entries', ['source', 'ts'])
    .done(done);
  }
};
