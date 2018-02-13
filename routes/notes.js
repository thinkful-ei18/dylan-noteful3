'use strict';

const express = require('express');
// Create an router instance (aka "mini-app")
const router = express.Router();
const { Note } = require('../models/note');
const mongoose = require('mongoose');

/* ========== GET/READ ALL ITEM ========== */
router.get('/notes', (req, res, next) => {
  const { searchTerm } = req.query;
  if(searchTerm) {
    Note.find(
      { $text: { $search: searchTerm } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .then(response => {
        res.json(response);
      })
      .catch(err => {
        next(err);
      });
  } else {
    Note.find()
      .then(response => {
        res.json(response);
      })
      .catch(err => {
        next(err);
      });
  }
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/notes/:id', (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  Note.findById(req.params.id)
    .then(response => {
      if (response) {
        res.json(response);
      } else {
        next();
      }
    })
    .catch(err => {
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
      if (response) {
        res
          .location(`${req.originalUrl}/${response.id}`)
          .status(201)
          .json(response);
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
  const { id } = req.params;
  const updateItem = {};
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }
  if (!(id && req.body.id && id === req.body.id)) {
    const err = new Error(
      `Params id: ${id} and Body id: ${req.body.id} must match`
    );
    err.status = 400;
    return next(err);
  }
  const updateFields = ['title', 'content'];
  updateFields.forEach(field => {
    if (field in req.body) {
      updateItem[field] = req.body[field];
    }
  });

  Note.findByIdAndUpdate(id, updateItem, { new: true })
    .then(response => {
      if (response) {
        res.status(200).json(response);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/notes/:id', (req, res, next) => {
  const { id } = req.params;
  Note.findByIdAndRemove(id)
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
