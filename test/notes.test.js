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

  describe('Authorized access', function() {
    it('should respond with unauthorized with no token', function() {
      return chai
        .request(app)
        .get('/v3/notes')
        .then(() => expect.fail(null, null, 'Request should not succeed'))
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(401);
        });
    });
  });

  it('Should reject requests with an invalid token', function() {
    return User.findById('322222222222222222222200')
      .then(response => {
        return jwt.sign(
          {
            user: {
              username: response.username,
              id: response.id
            }
          },
          'wrong',
          {
            algorithm: 'HS256',
            subject: response.username,
            expiresIn: '7d'
          }
        );
      })
      .then(token => {
        return chai
          .request(app)
          .get('/v3/notes')
          .set('Authorization', `Bearer ${token}`);
      })
      .then(() => expect.fail(null, null, 'Request should not succeed'))
      .catch(err => {
        if (err instanceof chai.AssertionError) {
          throw err;
        }
        const res = err.response;
        expect(res).to.have.status(401);
      });
  });

  it('Should reject requests with an expired token', function() {
    return User.findById('322222222222222222222200')
      .then(response => {
        return jwt.sign(
          {
            user: {
              username: response.username,
              id: response.id
            },
            expiresIn: Math.floor(Date.now() / 1000) - 10
          },
          'wrong',
          {
            algorithm: 'HS256',
            subject: response.username,
            expiresIn: '7d'
          }
        );
      })
      .then(token => {
        return chai
          .request(app)
          .get('/v3/notes')
          .set('Authorization', `Bearer ${token}`);
      })
      .then(() => expect.fail(null, null, 'Request should not succeed'))
      .catch(err => {
        if (err instanceof chai.AssertionError) {
          throw err;
        }
        const res = err.response;
        expect(res).to.have.status(401);
      });
  });

  describe('GET /notes', function() {
    it('should return a list of all notes on the database with no search term with a correct user', function() {
      let response;
      return chai
        .request(app)
        .get('/v3/notes')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          response = _response;
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          expect(response.body.length).to.eql(7);
          return Note.count({ userId: '322222222222222222222200' });
        })
        .then(count => {
          expect(count).to.equal(response.body.length);
        });
    });

    it('should return a filtered list of notes with scores if there is a search term', function() {
      let response;
      return chai
        .request(app)
        .get('/v3/notes?searchTerm=Lorem')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          response = _response;
          expect(response).to.have.status(200);
          expect(response.body).to.have.length(3);
          expect(response.body[0].score).to.equal(0.5076923076923077);
          return Note.find({
            $text: { $search: 'Lorem' },
            userId: '322222222222222222222200'
          }).count();
        })
        .then(count => {
          expect(count).to.equal(response.body.length);
        });
    });

    it('should return a filtered list of notes with scores if there is a folderId', function() {
      let response;
      return chai
        .request(app)
        .get('/v3/notes?folderId=111111111111111111111101')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          response = _response;
          expect(response).to.have.status(200);
          expect(response.body).to.have.length(2);
          return Note.find({
            folderId: '111111111111111111111101'
          }).count();
        })
        .then(count => {
          expect(count).to.equal(response.body.length);
        });
    });

    it('should return a filtered list of notes if there is a tagId', function() {
      let response;
      return chai
        .request(app)
        .get('/v3/notes?tagId=222222222222222222222202')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          response = _response;
          expect(response).to.have.status(200);
          expect(response.body).to.have.length(7);
          return Note.find({
            tags: '222222222222222222222202',
            userId: '322222222222222222222200'
          }).count();
        })
        .then(count => {
          expect(count).to.equal(response.body.length);
        });
    });

    it('should return the correct values', function() {
      let item;
      return chai
        .request(app)
        .get('/v3/notes')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          item = _response.body[0];
          return Note.findById(item.id);
        })
        .then(response => {
          expect(item.content).to.equal(response.content);
          expect(item.id).to.equal(response.id);
          expect(item.title).to.equal(response.title);
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/v3/notes')
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

  describe('GET notes/:id', function() {
    it('should return the proper note', function() {
      let itemId;
      return chai
        .request(app)
        .get('/v3/notes')
        .set('authorization', `Bearer ${token}`)
        .then(response => {
          itemId = response.body[0].id;
          return chai
            .request(app)
            .get(`/v3/notes/${itemId}`)
            .set('authorization', `Bearer ${token}`);
        })
        .then(response => {
          expect(response.body.id).to.equal(itemId);
          return Note.findById(itemId);
        })
        .then(note => {
          expect(note.id).to.equal(itemId);
        });
    });

    it('should send an error on a invalid id format', function() {
      let badId = '00000000000000000000000';
      const spy = chai.spy();
      return chai
        .request(app)
        .get(`/v3/notes/${badId}`)
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
        .get(`/v3/notes/${badId}`)
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
        .get('/v3/notes/000000000000000000000001')
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

  describe('POST /notes', function() {
    it('should post a new note with proper attributes', function() {
      let newItem = {
        title: 'CATS',
        content: 'I am a cat',
        folderId: '111111111111111111111101',
        tags: ['222222222222222222222202']
      };

      return chai
        .request(app)
        .post('/v3/notes')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(response => {
          expect(response).to.have.status(201);
          expect(response.body).to.be.an('object');
          expect(response.body.title).to.equal(newItem.title);
          expect(response.body.content).to.equal(newItem.content);
          return Note.count();
        })
        .then(response => {
          expect(response).to.equal(9);
        })
        .catch(err => {
          // console.log(err);
        });
    });

    it('should 400 error when not all fields are present', function() {
      let newItem = { content: 'I am a cat' };
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/v3/notes')
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

    it('should 400 error when tags are invalid', function() {
      let newItem = {
        title: 'CATS',
        content: 'I am a cat',
        folderId: '111111111111111111111100',
        tags: ['22222222222222222222220']
      };
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/v3/notes')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal(
            '22222222222222222222220 is not a valid id'
          );
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      let newItem = {
        title: 'CATS',
        content: 'I am a cat',
        folderId: '111111111111111111111102'
      };
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .post('/v3/notes/')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('PUT notes/:id', function() {
    it('should update a note with proper validation', function() {
      let updateItem = {
        title: 'DOGS',
        id: '000000000000000000000001',
        tags: ['222222222222222222222202']
      };

      return chai
        .request(app)
        .put('/v3/notes/000000000000000000000001')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body.title).to.equal(updateItem.title);
          expect(response.body.id).to.equal(updateItem.id);
          return Note.findById(response.body.id);
        })
        .then(note => {
          expect(note.title).to.equal(updateItem.title);
          expect(note.id).to.equal(updateItem.id);
        });
    });

    it('should not update note if body and param id do not match', function() {
      let updateItem = { title: 'DOGS' };

      const spy = chai.spy();

      return chai
        .request(app)
        .put('/v3/notes/000000000000000000000001')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(spy)

        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal(
            'Params id: 000000000000000000000001 and Body id: undefined must match'
          );
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should return 400 on invalid id', function() {
      let updateItem = { title: 'DOGS' };

      const spy = chai.spy();

      return chai
        .request(app)
        .put('/v3/notes/00000000000000000000000')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(spy)
        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal(
            '00000000000000000000000 is not a valid ID'
          );
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should return 404 with invalid id', function() {
      let updateItem = { title: 'DOGS', id: '000000000000000000000009' };
      const spy = chai.spy();

      return chai
        .request(app)
        .put('/v3/notes/000000000000000000000009')
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

    it('should 400 error when tags are invalid', function() {
      let newItem = {
        title: 'CATS',
        content: 'I am a cat',
        folderId: '111111111111111111111100',
        tags: ['22222222222222222222220'],
        id: '000000000000000000000000'
      };
      let spy = chai.spy();
      return chai
        .request(app)
        .put('/v3/notes/000000000000000000000000')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal(
            '22222222222222222222220 is not a valid id'
          );
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      let updateItem = { title: 'DOGS', id: '000000000000000000000000' };
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .put('/v3/notes/000000000000000000000000')
        .set('authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(400);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('DELETE /notes/:id', function() {
    it('should delete a note with the proper id', function() {
      let id;

      return Note.findOne({ userId: '322222222222222222222200' })
        .then(note => {
          id = note.id;
          return id;
        })
        .then(() => {
          return chai
            .request(app)
            .delete(`/v3/notes/${id}`)
            .set('authorization', `Bearer ${token}`);
        })
        .then(response => {
          expect(response).to.have.status(204);
          return Note.findById(id);
        })
        .then(note => {
          expect(note).to.equal(null);
        });
    });

    it('should 404 with an id that does not exist', function() {
      const spy = chai.spy();

      return chai
        .request(app)
        .delete('/v3/notes/000000000000000000000009')
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
