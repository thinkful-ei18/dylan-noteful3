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

  Folder.find({name: newFolder.name})
    .then((folder) => {
      if (folder.length > 0) {
        const err = new Error('Folder name already exists');
        err.status = 400;
        return next(err);
      } else {
        Folder.create(newFolder).then(response => {
          console.log(response)
          res
            .status(201)
            .location(`${req.originalUrl}/${response.id}`)
            .json(response);
        });
      }
    })
    .catch(next);
});

module.exports = router;