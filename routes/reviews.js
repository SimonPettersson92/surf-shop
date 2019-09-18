const express = require('express');
const router = express.Router({ mergeParams: true });
const {asyncErrorHandler, isReviewAuthor } = require('../middleware');
const {
	reviewCreate,
	reviewUpdate,
	reviewDestroy
} = require('../controllers/reviews');

/* POST reviews create /posts/:id/reviews */
router.post('/', asyncErrorHandler(reviewCreate));

/* PUT reviews index /posts/:id/reviews/:review_id */
router.put('/:review_id', isReviewAuthor, asyncErrorHandler(reviewUpdate));

/* DELETE reviews destroy /posts/:id/reviews/:review_id */
router.delete('/:review_id', isReviewAuthor, asyncErrorHandler(reviewDestroy));



module.exports = router;

// GET index         /reviews
// POST create       /reviews
// GET show          /reviews/:id
// GET edit          /reviews/:id/edit
// PUT update        /reviews/:id
// DELETE destroy    /reviews/:id