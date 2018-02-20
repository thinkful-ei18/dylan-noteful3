'use strict';

const express = require('express');
// Create an router instance (aka "mini-app")
const router = express.Router();
const { Note } = require('../models/note');
const mongoose = require('mongoose');

/* ========== GET/READ ALL ITEM ========== */
router.get('/notes', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const filter = folderId ? { folderId } : {};
  if (tagId) {
    filter.tags = tagId;
  }
  const projection = {};
  if (searchTerm) {
    filter.$text = { $search: searchTerm };
    projection.score = { $meta: 'textScore' };
  }
  Note.find(filter, projection)
    .select('title content created folderId id tags')
    .populate('tags')
    .sort(projection)
    .then(response => {
      res.json(response);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/notes/:id', (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  Note.findById(req.params.id)
    .select('title content created folderId id tags')
    .populate('tags')
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
    content: req.body.content,
    tags: []
  };

  req.body.folderId ? (newItem.folderId = req.body.folderId) : newItem;

  if (req.body.tags) {
    req.body.tags.forEach(tag => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error(`${tag} is not a valid id`);
        err.status = 400;
        return next(err);
      } else {
        newItem.tags.push(tag);
      }
    });
  }

  Note.create(newItem)
    .then(response => {
      if (response) {
        return Note
          .findById(response.id)
          .select('title content created folderId id tags')
          .populate('tags');
      } else {
        next();
      }
    })
    .then(response => {
      res
        .location(`${req.originalUrl}/${response.id}`)
        .status(201)
        .json(response);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/notes/:id', (req, res, next) => {
  const { id } = req.params;
  const updateItem = {tags: []};

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  if (!(id && id === req.body.id)) {
    const err = new Error(
      `Params id: ${id} and Body id: ${req.body.id} must match`
    );
    err.status = 400;
    return next(err);
  }

  const updateFields = ['title', 'content', 'folderId'];
  updateFields.forEach(field => {
    if (field in req.body) {
      updateItem[field] = req.body[field];
    }
  });

  if (req.body.tags) {
    req.body.tags.forEach(tag => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error(`${tag} is not a valid id`);
        err.status = 400;
        return next(err);
      } else {
        updateItem.tags.push(tag);
      }
    });
  }

  Note.findByIdAndUpdate(id, updateItem, { new: true })
    .then(response => {
      if (response) {
        return Note.findById(id)
          .select('title content created folderId id tags')
          .populate('tags');
      } else {
        next();
      }
    })
    .then(response => {
      res.status(200).json(response);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/notes/:id', (req, res, next) => {
  const { id } = req.params;
  Note.findByIdAndRemove(id)
    .then(response => {
      if (response) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch(next);
});

module.exports = router;
