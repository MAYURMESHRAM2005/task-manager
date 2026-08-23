const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const { validateChangePassword } = require('../validators/authValidators');

router.get('/', authenticate, validatePagination, userController.getUsers);
router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, userController.updateProfile);
router.put('/me/password', authenticate, validateChangePassword, userController.changePassword);

module.exports = router;
