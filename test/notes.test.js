import { mongo } from 'mongoose';

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