const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { validateCreateProject } = require('../validators/projectValidators');

router.get('/', authenticate, validatePagination, projectController.getProjects);
router.post('/', authenticate, validateCreateProject, projectController.createProject);
router.get('/:id', authenticate, validateObjectId('id'), projectController.getProject);
router.put('/:id', authenticate, validateObjectId('id'), projectController.updateProject);
router.delete('/:id', authenticate, validateObjectId('id'), projectController.deleteProject);

router.post('/:id/members', authenticate, validateObjectId('id'), projectController.addMember);
router.delete('/:id/members/:userId', authenticate, validateObjectId('id'), validateObjectId('userId'), projectController.removeMember);

module.exports = router;
