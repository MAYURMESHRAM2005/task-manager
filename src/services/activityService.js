const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity event
 */
const logActivity = async ({ userId, action, entity, entityId, description, projectId, ipAddress, userAgent }) => {
  try {
    const activity = await ActivityLog.create({
      user: userId,
      action,
      entity,
      entityId,
      description,
      metadata: { projectId },
      ipAddress,
      userAgent,
    });
    return activity;
  } catch (error) {
    // Don't let activity logging break main operations
    if (process.env.NODE_ENV !== 'test') {
      console.error('[ActivityService] Error logging activity:', error.message);
    }
    return null;
  }
};

/**
 * Get activity feed for a project
 */
const getProjectActivity = async (projectId, pagination = { page: 1, limit: 20 }) => {
  const query = { 'metadata.projectId': projectId };

  const total = await ActivityLog.countDocuments(query);

  const activities = await ActivityLog.find(query)
    .populate('user', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit);

  return {
    data: activities,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

/**
 * Get activity feed for a user across all their projects/tasks
 */
const getUserActivity = async (userId, pagination = { page: 1, limit: 20 }) => {
  const query = { user: userId };

  const total = await ActivityLog.countDocuments(query);

  const activities = await ActivityLog.find(query)
    .populate('user', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit);

  return {
    data: activities,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

module.exports = { logActivity, getProjectActivity, getUserActivity };
