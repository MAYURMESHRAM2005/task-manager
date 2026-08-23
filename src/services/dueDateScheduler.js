const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { emitToUser } = require('./socketService');

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
let intervalId = null;

/**
 * Check for tasks due soon (within 24 hours) and overdue tasks
 * Creates notifications for assigned users and task creators
 */
const checkDueDates = async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks due within 24 hours that haven't been notified for due-soon
    const dueSoonTasks = await Task.find({
      dueDate: { $lte: in24h, $gte: now },
      status: { $nin: ['COMPLETED', 'CANCELLED'] },
      reminderNotified: false,
    })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    for (const task of dueSoonTasks) {
      const notifyUserId = task.assignedTo?._id || task.createdBy?._id;
      if (!notifyUserId) continue;

      // Check if we already sent a due-soon notification
      const existing = await Notification.findOne({
        user: notifyUserId,
        type: 'TASK_DUE_SOON',
        'relatedEntity.id': task._id,
      });

      if (!existing) {
        const notification = await Notification.create({
          user: notifyUserId,
          type: 'TASK_DUE_SOON',
          message: `⏰ Task "${task.title}" is due soon`,
          relatedEntity: { type: 'Task', id: task._id },
        });

        emitToUser(notifyUserId, 'notification', {
          type: 'TASK_DUE_SOON',
          message: notification.message,
          entityType: 'Task',
          entityId: task._id,
          timestamp: notification.createdAt,
        });
      }
    }

    // Find overdue tasks
    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status: { $nin: ['COMPLETED', 'CANCELLED'] },
    })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    for (const task of overdueTasks) {
      const notifyUserId = task.assignedTo?._id || task.createdBy?._id;
      if (!notifyUserId) continue;

      // Check if we already sent an overdue notification
      const existing = await Notification.findOne({
        user: notifyUserId,
        type: 'TASK_OVERDUE',
        'relatedEntity.id': task._id,
      });

      if (!existing) {
        const notification = await Notification.create({
          user: notifyUserId,
          type: 'TASK_OVERDUE',
          message: `⚠️ Task "${task.title}" is overdue`,
          relatedEntity: { type: 'Task', id: task._id },
        });

        emitToUser(notifyUserId, 'notification', {
          type: 'TASK_OVERDUE',
          message: notification.message,
          entityType: 'Task',
          entityId: task._id,
          timestamp: notification.createdAt,
        });
      }
    }

    const total = dueSoonTasks.length + overdueTasks.length;
    if (total > 0) {
      console.log(`[DueDateScheduler] Processed ${dueSoonTasks.length} due-soon, ${overdueTasks.length} overdue`);
    }
  } catch (error) {
    console.error('[DueDateScheduler] Error checking due dates:', error.message);
  }
};

/**
 * Start the due date scheduler
 */
const startDueDateScheduler = () => {
  if (intervalId) return;
  checkDueDates();
  intervalId = setInterval(checkDueDates, CHECK_INTERVAL_MS);
  if (process.env.NODE_ENV !== 'test') {
    console.log('[DueDateScheduler] Started — checking every 5 minutes');
  }
};

/**
 * Stop the due date scheduler
 */
const stopDueDateScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    if (process.env.NODE_ENV !== 'test') {
      console.log('[DueDateScheduler] Stopped');
    }
  }
};

module.exports = { startDueDateScheduler, stopDueDateScheduler, checkDueDates };
