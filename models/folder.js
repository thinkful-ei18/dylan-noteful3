'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {type: String, index: true, unique: true}
});

folderSchema.index({ name: 'text' });

folderSchema.methods.serialize = function() {
  return {
    id: this.id,
    name: this.name
  };
};

folderSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

const Folder = mongoose.model('Folder', folderSchema);
module.exports = {Folder};