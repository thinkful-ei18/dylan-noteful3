'use strict';
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models/user');

const localStrategy = new LocalStrategy((username, password, done) => {
  let user;
  User.findOne({ username })
    .then(results => {
      user = results;
      if (!user) {
        return done(null, false);
      }
      return user.validatePassword(password);
    })
    .then(isValid => {
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
