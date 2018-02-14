'use strict';
const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSpies = require('chai-spies');
const expect = chai.expect;

chai.use(chaiHttp);
chai.use(chaiSpies);

const mongoose = require('mongoose');
const {TEST_MONGODB_URI} = require('../config');
const {Note} = require('../models/note');
const seedData = require('../db/seed/notes');

before(function() {
  return mongoose.connect(TEST_MONGODB_URI, { autoIndex: false });
});

beforeEach(function() {
  return Note.insertMany(seedData)
    .then(() => Note.ensureIndexes());
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
    return chai.request(app)
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
    return chai.request(app)
      .get('/v3/notes?searchTerm=Lorem')
      .then(_response => {
        response = _response;
        expect(response).to.have.status(200);
        expect(response.body).to.have.length(4);
        expect(response.body[0].score).to.equal(0.5076923076923077);
        return Note.find({$text: { $search: 'Lorem' } }).count();
      })
      .then(count => {
        expect(count).to.equal(response.body.length);
      });
  });
});