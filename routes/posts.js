const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({'dest': 	'uploads/'})
const { asyncErrorHandler } = require('../middleware');
const { 
	postIndex,
 	postNew,
 	postCreate,
 	postShow,
 	postEdit,
 	postUpdate
 } = require('../controllers/posts');

/* GET posts index /posts */
router.get('/', asyncErrorHandler(postIndex));

/* GET posts new /posts/new */
router.get('/new', postNew);

/* POST posts create /posts */
router.post('/', upload.array('images', 4), asyncErrorHandler(postCreate));

/* GET posts show /posts/:id */
router.get('/:id', asyncErrorHandler(postShow));

/* GET posts edit /posts/:id/edit */
router.get('/:id/edit', asyncErrorHandler(postEdit));

/* PUT posts index /posts/:id */
router.put('/:id', upload.array('images', 4), asyncErrorHandler(postUpdate));

/* DELETE posts destroy /posts/:id */
router.delete('/:id', asyncErrorHandler(postUpdate));



module.exports = router;

// GET index         /posts
// POST create       /posts
// GET show          /posts/:id
// GET edit          /posts/:id/edit
// PUT update        /posts/:id
// DELETE destroy    /posts/:id