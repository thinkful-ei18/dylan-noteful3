'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User } = require('../models/user');

router.post('/users', (req, res, next) => {
  const { fullname, username, password } = req.body;
  const lengthValidation = {
    username: {
      min: 1
    },
    password: {
      min: 8,
      max: 72
    }
  };

  const requiredFields = ['username', 'password'];

  const errorGenerator = function(message) {
    const err = new Error(message);
    err.status = 422;
    return err;
  };

  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    const err = errorGenerator(`Missing ${missingField} in request body`);
    return next(err);
  }

  const nonStringField = requiredFields.find(
    field => typeof req.body[field] !== 'string'
  );

  if (nonStringField) {
    const err = errorGenerator(`${nonStringField} must be a string`);
    return next(err);
  }

  const whiteSpace = requiredFields.find(
    field =>
      req.body[field][0] === ' ' ||
      req.body[field][req.body[field].length - 1] === ' '
  );

  if (whiteSpace) {
    const err = errorGenerator(
      `${whiteSpace} must not have any leading or trailing whitespace`
    );
    return next(err);
  }

  const tooShort = requiredFields.find(
    field => req.body[field].length < lengthValidation[field].min
  );
  const tooLong = requiredFields.find(
    field => req.body[field].length > lengthValidation[field].max
  );

  if (tooShort || tooLong) {
    const err = errorGenerator(
      tooShort
        ? `${tooShort} must be ${
          lengthValidation[tooShort].min
        } characters or longer`
        : `${tooLong} must be ${
          lengthValidation[tooLong].max
        } characters or smaller`
    );
    return next(err);
  }

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
