const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

router.get('/', authenticate, validatePagination, teamController.getTeams);
router.post('/', authenticate, teamController.createTeam);
router.get('/:id', authenticate, validateObjectId('id'), teamController.getTeam);
router.put('/:id', authenticate, validateObjectId('id'), teamController.updateTeam);
router.delete('/:id', authenticate, validateObjectId('id'), teamController.deleteTeam);

module.exports = router;
