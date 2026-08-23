const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get user notifications with pagination
 */
const getNotifications = async (userId, pagination, unreadOnly = false) => {
  const query = { user: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit);

  return {
    data: notifications,
    unreadCount,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );

  return {
    message: 'All notifications marked as read',
    modifiedCount: result.modifiedCount,
  };
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
