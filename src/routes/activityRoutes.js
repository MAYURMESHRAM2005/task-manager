const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const activityService = require('../services/activityService');

/**
 * GET /api/v1/activity/project/:projectId — project activity feed
 */
router.get('/project/:projectId', authenticate, validateObjectId('projectId'), validatePagination, async (req, res, next) => {
  try {
    const result = await activityService.getProjectActivity(req.params.projectId, req.pagination);
    res.json({
      success: true,
      message: 'Activity feed retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/activity/me — user's own activity feed
 */
router.get('/me', authenticate, validatePagination, async (req, res, next) => {
  try {
    const result = await activityService.getUserActivity(req.user._id, req.pagination);
    res.json({
      success: true,
      message: 'Activity feed retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
