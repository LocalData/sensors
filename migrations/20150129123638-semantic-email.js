'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.sequelize.transaction(function (t) {
      return migration.addColumn('sources', 'email', {
        type: DataTypes.STRING,
        transaction: t
      }).then(function () {
        // Copy the email metadata field, if there is one, to the semantic email
        // column. Removing the email field from the metadata is awkward with raw
        // SQL but can be done with a PLV8 function if necessary.
        return migration.sequelize.query('UPDATE sources SET email = data->>\'email\'', null, {
          raw: true,
          transaction: t
        });
      });
    }).done(done);
  },

  down: function(migration, DataTypes, done) {
    migration.removeColumn('sources', 'email')
    .done(done);
  }
};
