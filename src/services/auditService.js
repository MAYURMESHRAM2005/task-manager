const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity
 */
const logActivity = async ({ userId, action, entity, entityId, description, ipAddress, userAgent }) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      entity,
      entityId: entityId || null,
      description: description || '',
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
    });
  } catch (error) {
    // Don't let audit logging failures break the application
    console.error('Failed to log activity:', error.message);
  }
};

/**
 * Get audit logs with pagination (admin only)
 */
const getAuditLogs = async (pagination, filters = {}) => {
  const query = {};

  if (filters.user) query.user = filters.user;
  if (filters.entity) query.entity = filters.entity;
  if (filters.action) query.action = { $regex: filters.action, $options: 'i' };

  const total = await ActivityLog.countDocuments(query);

  const logs = await ActivityLog.find(query)
    .populate('user', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit);

  return {
    data: logs,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

module.exports = { logActivity, getAuditLogs };
