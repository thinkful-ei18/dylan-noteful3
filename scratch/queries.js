'use strict';
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const { MONGODB_URI } = require('../config');

const {Note} = require('../models/note');

// mongoose
//   .connect(MONGODB_URI)
//   .then(() => {
//     const searchTerm = '';
//     let filter = {};

//     if (searchTerm) {
//       const re = new RegExp(searchTerm, 'i');
//       filter = {$or: [{title: { $regex: re } }, { content: { $regex: re } }] };
//     }

//     return Note.find(filter)
//       .select()
//       .sort('created')
//       .then(results => {
//         console.log(results);
//       })
//       .catch(console.error);
//   })
//   .then(() => {
//     return mongoose.disconnect().then(() => {
//       console.info('Disconnected');
//     });
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });


// mongoose
//   .connect(MONGODB_URI)
//   .then(() => {
//     const newItem = {
//       title: 'Cats',
//       content: 'cats r us' 
//     };

//     return Note.create(newItem).then(item => console.log(item));
//   })
//   .then(() => {
//     return mongoose.disconnect().then(() => {
//       console.info('Disconnected');
//     });
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    return Note.find(
      { $text: { $search: 'Lady Gaga' } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .then(results => {
        console.log(results);
      });
  })
  .then(() => {
    return mongoose.disconnect().then(() => {
      console.info('Disconnected');
    });
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });