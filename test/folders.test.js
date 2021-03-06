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

  describe('GET /folders', function() {
    it('should return a list of all folders on the database with no search term', function() {
      let response;
      return chai
        .request(app)
        .get('/v3/folders')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          response = _response;
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          expect(response.body).to.have.length(4);
          return Folder.count({ userId: '322222222222222222222200' });
        })
        .then(count => {
          expect(count).to.equal(response.body.length);
        });
    });

    it('should return the correct values', function() {
      let item;
      return chai
        .request(app)
        .get('/v3/folders')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          item = _response.body[0];
          return Folder.findById(item.id);
        })
        .then(response => {
          expect(item.id).to.equal(response.id);
          expect(item.name).to.equal(response.name);
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/v3/folders')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('GET folders/:id', function() {
    it('should return the proper Folder', function() {
      let itemId;
      return chai
        .request(app)
        .get('/v3/folders')
        .set('authorization', `Bearer ${token}`)
        .then(response => {
          itemId = response.body[0].id;
          return chai
            .request(app)
            .get(`/v3/folders/${itemId}`)
            .set('authorization', `Bearer ${token}`);
        })
        .then(response => {
          expect(response.body.id).to.equal(itemId);
          return Folder.findById(itemId);
        })
        .then(folder => {
          expect(folder.id).to.equal(itemId);
        });
    });

    it('should send an error on a invalid id format', function() {
      let badId = '00000000000000000000000';
      const spy = chai.spy();
      return chai
        .request(app)
        .get(`/v3/folders/${badId}`)
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal(`${badId} is not a valid ID`);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should send an 404 error on a bad id', function() {
      let badId = '000000000000000000000009';
      const spy = chai.spy();
      return chai
        .request(app)
        .get(`/v3/folders/${badId}`)
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(404);
          expect(res.body.message).to.equal('Not Found');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/v3/folders/111111111111111111111101')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('POST /folders', function() {
    it('should post a new folder with proper attributes', function() {
      let newItem = { name: 'CATS'};

      return chai
        .request(app)
        .post('/v3/folders')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(response => {
          expect(response).to.have.status(201);
          expect(response.body).to.be.an('object');
          expect(response.body.name).to.equal(newItem.name);
          return Folder.count();
        })
        .then(response => {
          expect(response).to.equal(6);
        });
    });

    it('should 400 error when not all fields are present', function() {
      let newItem = {};
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/v3/folders')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Missing title in request body');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should 400 error when folder name already exists', function() {
      let newItem = { name: 'Personal' };
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/v3/folders')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Folder name already exists');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('PUT folders/:id', function() {
    it('should update a folder with proper validation', function() {
      let updateItem = { name: 'DOGS', id: '111111111111111111111101' };

      return chai
        .request(app)
        .put('/v3/folders/111111111111111111111101')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body.name).to.equal(updateItem.name);
          expect(response.body.id).to.equal(updateItem.id);
          return Folder.findById(response.body.id);
        })
        .then(folder => {
          expect(folder.name).to.equal(updateItem.name);
          expect(folder.id).to.equal(updateItem.id);
        });
    });

    it('should not update folder if body and param id do not match', function() {
      let updateItem = { name: 'DOGS' };

      const spy = chai.spy();

      return chai
        .request(app)
        .put('/v3/folders/111111111111111111111101')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(spy)

        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Params id: 111111111111111111111101 and Body id: undefined must match');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should return 400 on invalid id', function() {
      let updateItem = { name: 'DOGS' };

      const spy = chai.spy();

      return chai
        .request(app)
        .put('/v3/folders/00000000000000000000000')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(spy)
        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('00000000000000000000000 is not a valid ID');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should return 404 with invalid id', function() {
      let updateItem = { name: 'DOGS', id: '111111111111111111111108' };
      const spy = chai.spy();

      return chai
        .request(app)
        .put('/v3/folders/111111111111111111111108')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(spy)
        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(404);
          expect(res.body.message).to.equal('Not Found');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should 400 error when not all fields are present', function() {
      let newItem = { id: 111111111111111111111100 };
      let spy = chai.spy();
      return chai
        .request(app)
        .put('/v3/folders/111111111111111111111100')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Missing name in request body');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should 400 error when folder name already exists', function() {
      let updateItem = { name: 'Personal', id: '111111111111111111111101' };
      let spy = chai.spy();
      return chai
        .request(app)
        .put('/v3/folders/111111111111111111111101')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Folder name already exists');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('DELETE /folders/:id', function() {
    it('should delete a folder with the proper id', function() {
      let id;

      return Folder.findOne({ _id: '111111111111111111111104' })
        .then(folder => {
          id = folder.id;
          return id;
        })
        .then(() => {
          return chai
            .request(app)
            .delete(`/v3/folders/${id}`)
            .set('authorization', `Bearer ${token}`);
        })
        .then(response => {
          expect(response).to.have.status(204);
          return Folder.findById(id);
        })
        .then(folder => {
          expect(folder).to.equal(null);
        });
    });

    it('should 404 with an id that does not exist', function() {
      const spy = chai.spy();

      return chai
        .request(app)
        .delete('/v3/folders/000000000000000000000009')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(404);
          expect(res.body.message).to.equal('Not Found');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });
});
