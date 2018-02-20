'use strict';
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models/user');

const localStrategy = new LocalStrategy((username, password, done) => {
  User.findOne({ username })
    .then(user => {
      if (!user) {
        return done(null, false);
      }
      const isValid = user.validatePassword(password);
      if (!isValid) {
        return done(null, false);
      }
      return done(null, user);
    })
    .catch(err => {
      done(err);
    });
});

module.exports = localStrategy;
