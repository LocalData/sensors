'use strict';

var logfmt = require('logfmt');

var Source = require('../models/Source');

exports.validateToken = function validateToken(req, res, next) {
  if (!req.token) {
    res.sendStatus(401);
    return;
  }
  
  var temp = (new Buffer(req.token, 'base64')).toString();
  if (temp[0] !== ':') {
    res.sendStatus(403);
  }
  
  var token = temp.substr(1);

  Source.find({
    token: token
  }).then(function (source) {
    if (source && (source.id === req.params.source)) {
      next();
    } else {
      res.sendStatus(403);
    }
  }).catch(function (error) {
    logfmt.error(error);
    res.sendStatus(500);
  });
};

exports.create = function create(req, res, next) {
  var data;
  if (req.body) {
    data = req.body.data;
  }

  Source.create({
    data: data
  }).then(function (source) {
    res.status(201).json(source);
  }).catch(function (error) {
    logfmt.error(error);
    res.sendStatus(500);
  });
};

exports.get = function get(req, res, next) {
  Source.find({
    id: req.params.source
  }).then(function (source) {
    if (source) {
      res.status(200).json({
        id: source.id,
        data: source.data
      });
    } else {
      res.sendStatus(404);
    }
  }).catch(function (error) {
    logfmt.error(error);
    res.sendStatus(500);
  });
};