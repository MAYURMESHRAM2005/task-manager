const notificationService = require('../services/notificationService');

/**
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const result = await notificationService.getNotifications(req.user._id, req.pagination, unreadOnly);

    res.json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result.data,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.json({
      success: true,
      message: result.message,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
