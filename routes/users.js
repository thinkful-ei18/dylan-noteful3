'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User } = require('../models/user');

router.post('/users', (req, res, next) => {
  const { fullname, username, password } = req.body;

  return User.hashPassword(password)
    .then(digest => {
      const newUser = { fullname, username, password: digest };
      return User.create(newUser);
    })
    .then(response => {
      if (response) {
        res
          .status(201)
          .location(`${req.originalUrl}/${response.id}`)
          .json(response);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('That username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;