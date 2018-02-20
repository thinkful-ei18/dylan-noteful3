'use strict';

const { strategy: LocalStrategy } = require('passport-local');
const { User } = require('../models/user');

const localStrategy = new LocalStrategy((username, password, done) => {
  User.findOne({ username })
    .then(user => {
      if (!user) {
      }
      const isValid = user.validatePassword(password);
      if (!isValid) {
      }
      return done(null, user);
    })
    .catch(err => {});
});
