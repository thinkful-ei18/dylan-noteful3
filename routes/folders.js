'use strict';

const express = require('express');
const router = express.Router();
const { Folder } = require('../models/folder');
const mongoose = require('mongoose');


router.get('/folders', (req, res, next) => {
  const { searchTerm } = req.query;
  const [filter, projection] = [{}, {}];
  if (searchTerm) {
    filter.$text = { $search: searchTerm };
    projection.score = { $meta: 'textScore' };
  }
  Folder.find(filter, projection)
    .sort(projection)
    .then(response => {
      res.json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.get('/folders/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  Folder.findById(id)
    .then(folder => {
      if (folder) {
        res.json(folder);
      } else {
        next();
      }
    })
    .catch(next);
});

router.post('/folders', (req, res, next) => {
  const newFolder = {
    name: req.body.name
  };
  if (!req.body.name) {
    const err = new Error('Name Field is missing');
    err.status = 400;
    return next(err);
  }

  Folder.create(newFolder)
    .then(response => {
      res
        .status(201)
        .location(`${req.originalUrl}/${response.id}`)
        .json(response);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('Folder name already exists');
        err.status = 400;
      }
      next(err);
    });
});

router.put('/folders/:id', (req, res, next) => {
  if (!req.body.name) {
    const err = new Error('Name Field is missing');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid id.`);
    err.status = 400;
    return next(err);
  }

  if (req.params.id !== req.body.id) {
    const err = new Error(`Body: ${req.body.id} and Params: ${req.params.id} id must match`);
    err.status = 400;
    return next(err);
  }

  const updateFolder = {
    name: req.body.name,
    id: req.body.id
  };

  Folder.findByIdAndUpdate(req.params.id, updateFolder, { new: true })
    .then(response => {
      if (response) {
        res.status(200).json(response);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('Folder name already exists');
        err.status = 400;
      }
      next(err);
    });
});

router.delete('/folders/:id', (req, res, next) => {
  const { id } = req.params;
  Folder.findByIdAndRemove(id)
    .then(() => {
      res.status(204).end();
    });
});

module.exports = router;