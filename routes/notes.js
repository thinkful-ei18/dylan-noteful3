'use strict';

const express = require('express');
// Create an router instance (aka "mini-app")
const router = express.Router();
const { Note } = require('../models/note');
const { Folder } = require('../models/folder');
const { Tag } = require('../models/tag');
const mongoose = require('mongoose');

/* ========== GET/READ ALL ITEM ========== */
router.get('/notes', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id;
  const filter = { userId };
  const projection = {};
  if (folderId) {
    filter.folderId = folderId;
  }
  if (tagId) {
    filter.tags = tagId;
  }
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
  const { id } = req.params;
  const userId = req.user.id;
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error(`${req.params.id} is not a valid ID`);
    err.status = 400;
    return next(err);
  }

  Note.findOne({ _id: id, userId })
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
    tags: [],
    userId: req.user.id
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
  const checkPromiseArray = [];
  if (newItem.folderId) {
    checkPromiseArray.push(checkFolderPromise(newItem.folderId, req.user.id));
  }
  if (newItem.tags.length > 0) {
    newItem.tags.forEach(tagId => {
      checkPromiseArray.push(checkTagPromise(tagId, req.user.id));
    });
  }

  Promise.all(checkPromiseArray)
    .then(() => {
      return Note.create(newItem);
    })
    .then(response => {
      if (response) {
        return Note.findById(response.id)
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
  const userId = req.user.id;
  const updateItem = { tags: [], userId };

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

  Note.findById(id).then(response => {
    if (response.userId.toString() !== userId) {
      const err = new Error('You can only update your own notes');
      err.status = 400;
      return next(err);
    }
  });

  const checkPromiseArray = [];
  if (updateItem.folderId) {
    checkPromiseArray.push(checkFolderPromise(updateItem.folderId, req.user.id));
  }
  if (updateItem.tags.length > 0) {
    updateItem.tags.forEach(tagId => {
      checkPromiseArray.push(checkTagPromise(tagId, req.user.id));
    });
  }

  Promise.all(checkPromiseArray)
    .then(() => {
      return Note.findOne({ _id: id, userId });
    })
    .then(response => response.update(updateItem, { new: true }))
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
  const userId = req.user.id;

  Note.findOneAndRemove({ _id: id, userId })
    .then(response => {
      if (response) {
        return res.status(204).end();
      }
      const err = new Error('You do not have permission to delete this note');
      err.status = 400;
      next(err);
    })
    .catch(next);
});

/* ========== HELPERS ========== */
function checkFolderPromise(fId, uId) {
  return new Promise((resolve, reject) => {
    if (!fId) {
      return resolve('valid');
    }
    Folder.find({ _id: fId, userId: uId }).then(response => {
      if (response.length > 0) {
        return resolve('valid');
      }
      const err = new Error('That is not a valid folder');
      err.status = 400;
      return reject(err);
    });
  });
}

function checkTagPromise(tId, uId) {
  return new Promise((resolve, reject) => {
    if (!tId) {
      return resolve('valid');
    }
    Tag.find({ _id: tId, userId: uId }).then(response => {
      if (response.length > 0) {
        return resolve('valid');
      }
      const err = new Error(`${tId} is not a valid tag`);
      err.status = 400;
      return reject(err);
    });
  });
}

module.exports = router;
