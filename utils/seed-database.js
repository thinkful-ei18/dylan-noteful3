'use strict';
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const { MONGODB_URI } = require('../config');
const {Note} = require('../models/note');
const {Folder} = require('../models/folder');
const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');

mongoose.connect(MONGODB_URI)
  .then(() => {
    return mongoose.connection.db.dropDatabase()
      .then(result => {
        console.info('Dropped database:', result);
      });
  })
  .then(() => Folder.insertMany(seedFolders))
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