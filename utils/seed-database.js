'use strict';
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const { MONGODB_URI } = require('../config');
const {Note} = require('../models/note');
const seedNotes = require('../db/seed/notes');

mongoose.connect(MONGODB_URI)
  .then(() => {
    return mongoose.connection.db.dropDatabase()
      .then(result => {
        console.info('Dropped database:', result);
      });
  })
  .then(() => {
    return Note.insertMany(seedNotes)
      .then(results => {
        console.info('Inserted Notes:', results.length);
      });
  })
  .then(() => {
    return mongoose.disconnect()
      .then(() => {
        console.info('Disconnected');
      });
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    console.error(err);
  });