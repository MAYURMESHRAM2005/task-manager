const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { validateCreateTask, validateUpdateTask } = require('../validators/taskValidators');

// Dashboard stats (must be before /:id routes)
router.get('/dashboard/stats', authenticate, taskController.getDashboardStats);

router.get('/', authenticate, validatePagination, taskController.getTasks);
router.post('/', authenticate, validateCreateTask, taskController.createTask);
router.get('/:id', authenticate, validateObjectId('id'), taskController.getTask);
router.put('/:id', authenticate, validateObjectId('id'), validateUpdateTask, taskController.updateTask);
router.delete('/:id', authenticate, validateObjectId('id'), taskController.deleteTask);

router.patch('/:id/status', authenticate, validateObjectId('id'), taskController.updateStatus);
router.patch('/:id/assign', authenticate, validateObjectId('id'), taskController.assignTask);

// Comments (nested under tasks)
router.get('/:id/comments', authenticate, validateObjectId('id'), commentController.getComments);
router.post('/:id/comments', authenticate, validateObjectId('id'), commentController.createComment);

module.exports = router;
