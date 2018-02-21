'use strict';
const passport = require('passport');
const options = { session: false, failWithError: true };
const localAuth = passport.authenticate('local', options);
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { JWT_EXPIRY, JWT_SECRET } = require('../config');

function createAuthToken(user) {
  return jwt.sign({ user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
}

router.post('/login', localAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  return res.json({ authToken });
});

module.exports = router;
