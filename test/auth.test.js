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

  describe('POST /login', function() {
    it('should return an auth token with a valid login', function() {
      const userInfo = {
        username: 'bobby',
        password: 'thepriceisright'
      };
      return chai
        .request(app)
        .post('/v3/login')
        .send(userInfo)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body.authToken).to.not.eql(null);
        });
    });

    it('should 401 error with an invalid username', function() {
      const userInfo = { username: 'bobby1', password: 'thepriceisright' };
      return chai
        .request(app)
        .post('/v3/login')
        .send(userInfo)
        .catch(err => {
          expect(err).to.have.status(401);
          expect(err.response.body.message).to.equal('Unauthorized');
        });
    });

    it('should 401 error with an invalid username', function() {
      const userInfo = { username: 'bobby', password: 'thepriceisrigh' };
      return chai
        .request(app)
        .post('/v3/login')
        .send(userInfo)
        .catch(err => {
          expect(err).to.have.status(401);
          expect(err.response.body.message).to.equal('Unauthorized');
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      const userInfo = { username: 'bobby', password: 'thepriceisright' };
      return chai
        .request(app)
        .post('/v3/login')
        .send(userInfo)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });
});