'use strict';

const express = require('express');
// Create an router instance (aka "mini-app")
const router = express.Router();
const { Note } = require('../models/note');
const mongoose = require('mongoose');

/* ========== GET/READ ALL ITEM ========== */
router.get('/notes', (req, res, next) => {
  Note.find()
    .then(response => {
      res.json(response);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/notes/:id', (req, res, next) => {

  if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  Note.findById(req.params.id)
    .then(response => {
      if (response){
        res.json(response);
      } else {
        next();
      }
    })
    .catch(err => {
      console.log(err);
      next(err);
    });

});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/notes', (req, res, next) => {

  const requiredFields = ['title', 'content'];
  requiredFields.forEach(field => {
    if (!(field in req.body)) {
      const err = new Error(`Missing ${field} in request body`);
      err.status = 400;
      return next(err);
    }
  });

  const newItem = {
    title: req.body.title,
    content: req.body.content
  };

  Note.create(newItem)
    .then(response => {
      console.log(response);
      if (response) {
        res.location(`${req.originalUrl}/${response.id}`).status(201).json(response);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/notes/:id', (req, res, next) => {

  console.log('Update a Note');
  res.json({ id: 2 });

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/notes/:id', (req, res, next) => {

  console.log('Delete a Note');
  res.status(204).end();

});

module.exports = router;