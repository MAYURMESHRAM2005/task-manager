const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { validateCreateTask, validateUpdateTask, validateReorderTasks } = require('../validators/taskValidators');

// Dashboard stats (must be before /:id routes)
router.get('/dashboard/stats', authenticate, taskController.getDashboardStats);

// Kanban board (must be before /:id routes)
router.get('/kanban', authenticate, taskController.getKanbanBoard);

// Calendar data (must be before /:id routes)
router.get('/calendar', authenticate, taskController.getCalendarData);

// Reorder tasks (must be before /:id routes)
router.patch('/reorder', authenticate, validateReorderTasks, taskController.reorderTasks);

// CRUD
router.get('/', authenticate, validatePagination, taskController.getTasks);
router.post('/', authenticate, validateCreateTask, taskController.createTask);
router.get('/:id', authenticate, validateObjectId('id'), taskController.getTask);
router.put('/:id', authenticate, validateObjectId('id'), validateUpdateTask, taskController.updateTask);
router.delete('/:id', authenticate, validateObjectId('id'), taskController.deleteTask);

// Status & Assignment
router.patch('/:id/status', authenticate, validateObjectId('id'), taskController.updateStatus);
router.patch('/:id/assign', authenticate, validateObjectId('id'), taskController.assignTask);

// Subtasks
router.get('/:id/subtasks', authenticate, validateObjectId('id'), taskController.getSubtasks);
router.post('/:id/subtasks', authenticate, validateObjectId('id'), taskController.createSubtask);
router.put('/subtasks/:subtaskId', authenticate, validateObjectId('subtaskId'), taskController.updateSubtask);
router.delete('/subtasks/:subtaskId', authenticate, validateObjectId('subtaskId'), taskController.deleteSubtask);

// Comments (nested under tasks)
const commentController = require('../controllers/commentController');
router.get('/:id/comments', authenticate, validateObjectId('id'), commentController.getComments);
router.post('/:id/comments', authenticate, validateObjectId('id'), commentController.createComment);

module.exports = router;
