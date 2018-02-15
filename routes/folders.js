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
        res.status(404).json({message: `${id} does not exist`, status: 404});
      }
    })
    .catch(next);
});

module.exports = router;