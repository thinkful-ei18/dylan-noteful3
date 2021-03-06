'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullname: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

userSchema.set('toObject', {
  transform: function(doc, ret) {
    delete ret.password;
    ret.id = ret._id;
    delete ret.__v;
    delete ret._id;
  }
});

userSchema.methods.validatePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.statics.hashPassword = function(password) {
  return bcrypt.hash(password, 10);
};


const User = mongoose.model('User', userSchema);

module.exports = { User };
