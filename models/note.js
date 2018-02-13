'use strict';

const mongoose = require('mongoose');

const noteSchema = mongoose.Schema({
  title: { type: String, index: true },
  content: { type: String, index: true },
  created: { type: Date, default: Date.now }
});

noteSchema.index({ title: 'text', content: 'text' }, {weights: {title: 2, content: 1}});

noteSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

const Note = mongoose.model('Note', noteSchema);
module.exports = { Note };
