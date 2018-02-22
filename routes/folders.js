'use strict';

const express = require('express');
const router = express.Router();
const { Folder } = require('../models/folder');
const { Note } = require('../models/note');
const mongoose = require('mongoose');


router.get('/folders', (req, res, next) => {
  const userId = req.user.id;
  Folder.find({userId})
    .select('name id')
    .then(response => {
      res.json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.get('/folders/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  Folder.findOne({_id: id, userId})
    .then(folder => {
      if (folder) {
        res.json(folder);
      } else {
        next();
      }
    })
    .catch(err => next(err));
});

router.post('/folders', (req, res, next) => {
  const userId = req.user.id;
  const newFolder = {
    name: req.body.name,
    userId: userId
  };
  if (!req.body.name) {
    const err = new Error('Missing title in request body');
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
  const userId = req.user.id;
  if (!req.body.name) {
    const err = new Error('Missing name in request body');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  if (req.params.id !== req.body.id) {
    const err = new Error(`Params id: ${req.params.id} and Body id: ${req.body.id} must match`);
    err.status = 400;
    return next(err);
  }

  const updateFolder = {
    name: req.body.name,
    id: req.body.id
  };

  Folder.findOneAndUpdate({_id: req.params.id, userId}, updateFolder, { new: true })
    .then(response => {
      if (response) {
        res.status(200).json(response.serialize());
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
  const userId = req.user.id;
  const { id } = req.params;
  // Folder.findByIdAndRemove(id)
  //   .then(response => {
  //     if (response) {
  //       res.status(204).end();
  //     } else {
  //       next();
  //     }     
  //   });

  Note.find({ folderId: id })
    .then(response => {
      if (response.length > 0) {
        const err = new Error('This folder has associated notes. Delete those first before deleting folder.');
        err.status = 400;
        return next(err);
      }
      return Folder.findOneAndRemove({_id: id, userId});
    })
    .then(response => {
      if (response) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch(next);

  // Folder.findByIdAndRemove(id)
  //   .then(() => {
  //     return Note.update({ folderId: id }, { $set: { folderId: null } }, { multi: true });
  //   })
  //   .then(response => {
  //     if (response) {
  //       res.status(204).end();
  //     } else {
  //       next();
  //     }
  //   });
});

module.exports = router;