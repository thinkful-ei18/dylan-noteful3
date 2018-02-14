'use strict';
const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSpies = require('chai-spies');
const expect = chai.expect;

chai.use(chaiHttp);
chai.use(chaiSpies);

const mongoose = require('mongoose');
const { TEST_MONGODB_URI } = require('../config');
const { Note } = require('../models/note');
const seedData = require('../db/seed/notes');

before(function() {
  return mongoose.connect(TEST_MONGODB_URI, { autoIndex: false });
});

beforeEach(function() {
  return Note.insertMany(seedData).then(() => Note.ensureIndexes());
});

afterEach(function() {
  return mongoose.connection.db.dropDatabase();
});

after(function() {
  return mongoose.disconnect();
});

describe('GET /notes', function() {
  it('should return a list of all notes on the database with no search term', function() {
    let response;
    return chai
      .request(app)
      .get('/v3/notes')
      .then(_response => {
        response = _response;
        expect(response).to.have.status(200);
        expect(response.body).to.be.an('array');
        expect(response.body).to.have.length(8);
        return Note.count();
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
      .then(_response => {
        response = _response;
        expect(response).to.have.status(200);
        expect(response.body).to.have.length(4);
        expect(response.body[0].score).to.equal(0.5076923076923077);
        return Note.find({ $text: { $search: 'Lorem' } }).count();
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
});

describe('GET notes/:id', function() {
  it('should return the proper note', function() {
    let itemId;
    return chai
      .request(app)
      .get('/v3/notes')
      .then(response => {
        itemId = response.body[0].id;
        return itemId;
      })
      .then(itemId => {
        return chai.request(app).get(`/v3/notes/${itemId}`);
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
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(`${badId} is not a valid ID`);
      });
  });

  it('should send an 404 error on a bad id', function() {
    let badId = '000000000000000000000009';
    const spy = chai.spy();
    return chai
      .request(app)
      .get(`/v3/notes/${badId}`)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(404);
        expect(res.body.message).to.equal('Not Found');
      });
  });
});

describe('POST /notes', function() {
  it('should post a new note with proper attributes', function() {
    let newItem = {
      title: 'CATS',
      content: 'I am a cat'
    };

    return chai
      .request(app)
      .post('/v3/notes')
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
      });
  });

  it('should 400 error when not all fields are present', function() {
    let newItem = { content: 'I am a cat' };
    let spy = chai.spy();
    return chai
      .request(app)
      .post('/v3/notes')
      .send(newItem)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(400);
        expect(res.body.message).to.equal('Missing title in request body');
      });
  });
});

describe('PUT notes/:id', function() {
  it('should update a note with proper validation', function() {
    let updateItem = {
      title: 'DOGS',
      id: '000000000000000000000000'
    };

    return chai
      .request(app)
      .put('/v3/notes/000000000000000000000000')
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
    let updateItem = {
      title: 'DOGS'
    };

    const spy = chai.spy();

    return chai
      .request(app)
      .put('/v3/notes/000000000000000000000000')
      .send(updateItem)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        let res = err.response;
        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          'Params id: 000000000000000000000000 and Body id: undefined must match'
        );
      });
  });

  it('should return 400 on invalid id', function() {
    let updateItem = { title: 'DOGS' };

    const spy = chai.spy();

    return chai
      .request(app)
      .put('/v3/notes/00000000000000000000000')
      .send(updateItem)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        let res = err.response;
        expect(res).to.have.status(400);
        expect(res.body.message).to.equal(
          '00000000000000000000000 is not a valid ID'
        );
      });
  });

  it('should return 404 with invalid id', function() {
    let updateItem = { title: 'DOGS', id: '000000000000000000000009' };
    const spy = chai.spy();

    return chai
      .request(app)
      .put('/v3/notes/000000000000000000000009')
      .send(updateItem)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        let res = err.response;
        expect(res).to.have.status(404);
        expect(res.body.message).to.equal('Not Found');
      });
  });
});

describe('DELETE /notes/:id', function() {
  it('should delete a note with the proper id', function() {
    let id;

    return Note.findOne()
      .then(note => {
        id = note.id;
        return id;
      })
      .then(() => {
        return chai.request(app).delete(`/v3/notes/${id}`);
      })
      .then(response => {
        expect(response).to.have.status(204);
        return Note.findById(id);
      })
      .then(note => {
        expect(note).to.equal(null);
      });
  });

  it.only('should 404 with an id that does not exist', function() {
    const spy = chai.spy();

    return chai
      .request(app)
      .delete('/v3/notes/000000000000000000000009')
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(404);
        expect(res.body.message).to.equal('Not Found');
      });
  });
});
