const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

router.put('/:id', authenticate, validateObjectId('id'), commentController.updateComment);
router.delete('/:id', authenticate, validateObjectId('id'), commentController.deleteComment);

module.exports = router;
