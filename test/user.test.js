'use strict';
const express = require('express');
const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSpies = require('chai-spies');
const expect = chai.expect;
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
chai.use(chaiSpies);

const mongoose = require('mongoose');
const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');
const { Note } = require('../models/note');
const seedData = require('../db/seed/notes');
const { Tag } = require('../models/tag');
const seedTags = require('../db/seed/tags');
const { User } = require('../models/user');
const seedUsers = require('../db/seed/users');
const { Folder } = require('../models/folder');
const seedFolders = require('../db/seed/folders');

const sinon = require('sinon');
const sandbox = sinon.sandbox.create();
describe('Before and After Hooks', function() {
  let token;
  before(function() {
    return mongoose.connect(TEST_MONGODB_URI, { autoIndex: false });
  });

  beforeEach(function() {
    return Note.insertMany(seedData)
      .then(() => Note.ensureIndexes())
      .then(() => Tag.insertMany(seedTags))
      .then(() => Tag.ensureIndexes())
      .then(() => Folder.insertMany(seedFolders))
      .then(() => Folder.ensureIndexes())
      .then(() => User.insertMany(seedUsers))
      .then(() => User.ensureIndexes())
      .then(() => User.findById('322222222222222222222200'))
      .then(response => {
        token = jwt.sign(
          {
            user: {
              username: response.username,
              id: response.id
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: response.username,
            expiresIn: '7d'
          }
        );
      });
  });

  afterEach(function() {
    sandbox.restore();
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('POST /users', function() {
    it('should create a new user with valid credentials', function() {
      let newUser = {
        username: 'tim',
        password: 'timmyturner',
        fullname: 'timmy turner'
      };
      return chai
        .request(app)
        .post('/v3/users')
        .send(newUser)
        .then(response => {
          expect(response).to.have.status(201);
          expect(response.body.id).to.not.eql(null);
        });
    });

    it('should return a 422 error when a field is missing', function() {
      let spy = chai.spy();
      let newUser = {
        username: 'tim',
        fullname: 'timmy turner'
      };
      return chai
        .request(app)
        .post('/v3/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal(
            'Missing password in request body'
          );
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a field is not a string', function() {
      let spy = chai.spy();
      let newUser = {
        username: 'tim',
        password: 1234456789,
        fullname: 'timmy turner'
      };
      return chai
        .request(app)
        .post('/v3/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal('password must be a string');
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a field has leading or trailing whitespace', function() {
      let spy = chai.spy();
      let newUser = { username: 'tim', password: ' 1234456789', fullname: 'timmy turner' };
      return chai
        .request(app)
        .post('/v3/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal('password must not have any leading or trailing whitespace');
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a username exists', function() {
      let spy = chai.spy();
      let newUser = { username: 'bobby', password: '1234456789', fullname: 'timmy turner' };
      return chai
        .request(app)
        .post('/v3/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(400);
          expect(err.response.body.message).to.equal('That username already exists');
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a username is too short', function() {
      let spy = chai.spy();
      let newUser = { username: '', password: '1234456789', fullname: 'timmy turner' };
      return chai
        .request(app)
        .post('/v3/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal('username must be 1 characters or longer');
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a password is too short', function() {
      let spy = chai.spy();
      let newUser = { username: '1', password: '1234', fullname: 'timmy turner' };
      return chai
        .request(app)
        .post('/v3/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal('password must be 8 characters or longer');
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a password is too long', function() {
      let spy = chai.spy();
      let newUser = { username: '1', password: '1234kjdfhglkadjfhglksdjhfgklsdjfhgklsdjhfgkljsdfhglkjsdhfglksjhdfglksjdhfglkjsdhfgklsdjhfglakjshdf;sDJKF;KLAHDGKLJAHDFGLKJHDSFLKJDLKVJBALDBJVAUEHRVUHAELRIUHVAERLGHK', fullname: 'timmy turner' };
      return chai
        .request(app)
        .post('/v3/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal('password must be 72 characters or smaller');
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });
  });
});
