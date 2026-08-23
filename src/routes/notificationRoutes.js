const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, notificationController.getNotifications);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);
router.patch('/:id/read', authenticate, validateObjectId('id'), notificationController.markAsRead);

module.exports = router;
