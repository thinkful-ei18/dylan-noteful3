'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User } = require('../models/user');

router.post('/users', (req, res, next) => {
  const newUser = {
    fullname: req.body.fullname,
    username: req.body.username,
    password: req.body.password
  };
  User.create(newUser)
    .then(response => {
      if (response) {
        res.status(201)
          .location(`${req.originalUrl}/${response.id}`)
          .json(response);
      } else {
        next();
      }
    })
    .catch(next);
});

module.exports = router;