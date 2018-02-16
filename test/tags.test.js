'use strict';
const express = require('express');
const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSpies = require('chai-spies');
const expect = chai.expect;

chai.use(chaiHttp);
chai.use(chaiSpies);

const mongoose = require('mongoose');
const { TEST_MONGODB_URI } = require('../config');
const { Tag } = require('../models/tag');
const seedTags = require('../db/seed/tags');
const { Note } = require('../models/note');
const seedNotes = require('../db/seed/notes');

const sinon = require('sinon');
const sandbox = sinon.sandbox.create();

describe('Before and After Hooks', function() {
  before(function() {
    return mongoose.connect(TEST_MONGODB_URI, { autoIndex: false });
  });

  beforeEach(function() {
    return Tag.insertMany(seedTags)
      .then(() => Tag.ensureIndexes())
      .then(() => Note.insertMany(seedNotes))
      .then(() => Note.ensureIndexes());
  });

  afterEach(function() {
    sandbox.restore();
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('GET /tags', function() {
    it('should return a list of all tags on the database with no search term', function() {
      let response;
      return chai
        .request(app)
        .get('/v3/tags')
        .then(_response => {
          response = _response;
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          expect(response.body).to.have.length(4);
          return Tag.count();
        })
        .then(count => {
          expect(count).to.equal(response.body.length);
        });
    });

    it('should return the correct values', function() {
      let item;
      return chai
        .request(app)
        .get('/v3/tags')
        .then(_response => {
          item = _response.body[0];
          return Tag.findById(item.id);
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
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('GET tags/:id', function() {
    it('should return the proper Tag', function() {
      let itemId;
      return chai
        .request(app)
        .get('/v3/tags')
        .then(response => {
          itemId = response.body[0].id;
          return chai.request(app).get(`/v3/tags/${itemId}`);
        })
        .then(response => {
          expect(response.body.id).to.equal(itemId);
          expect(response).to.have.status(200);
          return Tag.findById(itemId);
        })
        .then(tag => {
          expect(tag.id).to.equal(itemId);
        });
    });

    it('should send an error on a invalid id format', function() {
      let badId = '00000000000000000000000';
      const spy = chai.spy();
      return chai
        .request(app)
        .get(`/v3/tags/${badId}`)
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
        .get(`/v3/tags/${badId}`)
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
        .get('/v3/tags/222222222222222222222202')
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('POST /tags', function() {
    it('should post a new tag with proper attributes', function() {
      let newItem = { name: 'CATS' };

      return chai
        .request(app)
        .post('/v3/tags')
        .send(newItem)
        .then(response => {
          expect(response).to.have.status(201);
          expect(response.body).to.be.an('object');
          expect(response.body.name).to.equal(newItem.name);
          return Tag.count();
        })
        .then(response => {
          expect(response).to.equal(5);
        });
    });

    it('should 400 error when not all fields are present', function() {
      let newItem = {};
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/v3/tags')
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
      let newItem = { name: 'bar' };
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/v3/tags')
        .send(newItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Tag name already exists');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('PUT tags/:id', function() {
    it('should update a tag with proper validation', function() {
      let updateItem = { name: 'DOGS', id: '222222222222222222222200' };

      return chai
        .request(app)
        .put('/v3/tags/222222222222222222222200')
        .send(updateItem)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body.name).to.equal(updateItem.name);
          expect(response.body.id).to.equal(updateItem.id);
          return Tag.findById(response.body.id);
        })
        .then(tag => {
          expect(tag.name).to.equal(updateItem.name);
          expect(tag.id).to.equal(updateItem.id);
        });
    });

    it('should not update tag if body and param id do not match', function() {
      let updateItem = { name: 'DOGS' };

      const spy = chai.spy();

      return chai
        .request(app)
        .put('/v3/tags/222222222222222222222200')
        .send(updateItem)
        .then(spy)

        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal(
            'Params id: 222222222222222222222200 and Body id: undefined must match'
          );
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
        .put('/v3/tags/00000000000000000000000')
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
      let updateItem = { name: 'DOGS', id: '111111111111111111111108' };
      const spy = chai.spy();

      return chai
        .request(app)
        .put('/v3/folders/111111111111111111111108')
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
      let newItem = { id: '222222222222222222222200' };
      let spy = chai.spy();
      return chai
        .request(app)
        .put('/v3/tags/222222222222222222222200')
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

    it('should 400 error when tag name already exists', function() {
      let updateItem = { name: 'baz', id: '222222222222222222222200' };
      let spy = chai.spy();
      return chai
        .request(app)
        .put('/v3/tags/222222222222222222222200')
        .send(updateItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Tag name already exists');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('DELETE /tags/:id', function() {
    it('should delete a tags with the proper id', function() {

      return chai
        .request(app)
        .delete('/v3/tags/222222222222222222222200')
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body[1].nModified).to.equal(8);
          return Tag.findById('222222222222222222222200');
        })
        .then(tag => {
          expect(tag).to.equal(null);
          return Note.find({ tags: '222222222222222222222200' });
        })
        .then(response => {
          expect(response).to.have.length(0);
        });
    });

    it.only('should 404 with an id that does not exist', function() {
      const spy = chai.spy();

      return chai
        .request(app)
        .delete('/v3/tags/000000000000000000000009')
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
