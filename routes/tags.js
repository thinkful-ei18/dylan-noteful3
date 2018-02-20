'use strict';
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Tag } = require('../models/tag');
const { Note } = require('../models/note');

router.get('/tags', (req, res, next) => {
  Tag.find()
    .then(response => {
      res.json(response);
    })
    .catch(next);
});

router.get('/tags/:id', (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`${id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  Tag.findById(id)
    .then(response => {
      if (response) {
        res.json(response);
      } else {
        next();
      }
    })
    .catch(next);
});

router.post('/tags', (req, res, next) => {
  const newTag = { name: req.body.name };

  if (!req.body.name) {
    const err = new Error('Missing name in request body');
    err.status = 400;
    return next(err);
  }

  Tag.create(newTag)
    .then(response => {
      if (response) {
        res
          .status(201)
          .location(`${req.originalUrl}/${response.id}`)
          .json(response);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('Tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

router.put('/tags/:id', (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  if (!(req.params.id && req.body.id === req.params.id)) {
    const err = new Error(
      `Params id: ${req.params.id} and Body id: ${req.body.id} must match`
    );
    err.status = 400;
    return next(err);
  }

  if (!req.body.name) {
    const err = new Error('Missing name in request body');
    err.status = 400;
    return next(err);
  }

  const { id } = req.params;

  const updateItem = {
    name: req.body.name,
    id: req.body.id
  };

  Tag.findByIdAndUpdate(id, updateItem, { new: true })
    .then(response => {
      if (response) {
        res.status(200).json(response);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('Tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

router.delete('/tags/:id', (req, res, next) => {
  const { id } = req.params;

  const removeTagPromise = Tag.findByIdAndRemove(id);
  const removeTagOnNotesPromise = Note.update(
    {},
    { $pull: { tags: id } },
    { multi: true, new: true }
  );
  Promise.all([removeTagPromise, removeTagOnNotesPromise])
    .then(response => {
      if (response[0] && response[1].nModified > 0) {
        res.json(response);
      } else if (response[0] && response[1].nModified === 0) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch(next);
});

module.exports = router;