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
    // Perform some work in raw SQL rather than cramming function definitions
    // into gross concatenated js strings.
    return migration.sequelize.query(fs.readFileSync(upRaw, 'utf8'), null, {
      raw: true
    }).catch(function (error) {
      console.log(error);
      done(error);
    }).done(done);
  },

  down: function(migration, DataTypes, done) {
    return migration.sequelize.query(fs.readFileSync(downRaw, 'utf8'), null, {
      raw: true
    }).done(done);
  }
};
