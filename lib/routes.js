'use strict';

var express = require('express');

var entries = require('./controllers/entries');

var routes = module.exports = new express.Router();

function validateKey(req, res, next) {
  // TODO: make sure the key checks out.
  next();
}

routes.post('/api/sources/:source/entries', validateKey, entries.post);
routes.get('/api/sources/:source/entries', entries.list);