const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');
const { validateObjectId, validatePagination } = require('../middleware/validation');

// All admin routes require authentication + admin role
router.use(authenticate, isAdmin);

router.get('/users', validatePagination, adminController.getUsers);
router.patch('/users/:id/status', validateObjectId('id'), adminController.updateUserStatus);
router.patch('/users/:id/role', validateObjectId('id'), adminController.updateUserRole);

router.get('/audit-logs', validatePagination, adminController.getAuditLogs);
router.get('/statistics', adminController.getStatistics);

module.exports = router;
