const Task = require('../models/Task');
const Notification = require('../models/Notification');

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds
let intervalId = null;

/**
 * Check for tasks with reminders that are due and send notifications
 */
const checkReminders = async () => {
  try {
    const now = new Date();

    // Find tasks where reminderAt <= now, reminderNotified is false, and task is not completed/cancelled
    const dueTasks = await Task.find({
      reminderAt: { $lte: now, $ne: null },
      reminderNotified: false,
      status: { $nin: ['COMPLETED', 'CANCELLED'] },
    }).populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    for (const task of dueTasks) {
      // Determine who to notify: assigned user or task creator
      const notifyUserId = task.assignedTo?._id || task.createdBy._id;

      if (!notifyUserId) continue;

      // Check if a reminder notification already exists for this task to avoid duplicates
      const existing = await Notification.findOne({
        user: notifyUserId,
        type: 'TASK_REMINDER',
        'relatedEntity.id': task._id,
      });

      if (!existing) {
        await Notification.create({
          user: notifyUserId,
          type: 'TASK_REMINDER',
          message: `⏰ Reminder: Task "${task.title}" was set to remind you now`,
          relatedEntity: { type: 'Task', id: task._id },
        });
      }

      // Mark the task as notified
      await Task.findByIdAndUpdate(task._id, { reminderNotified: true });
    }

    if (dueTasks.length > 0) {
      console.log(`[ReminderScheduler] Processed ${dueTasks.length} reminder(s)`);
    }
  } catch (error) {
    console.error('[ReminderScheduler] Error checking reminders:', error.message);
  }
};

/**
 * Start the reminder scheduler
 */
const startReminderScheduler = () => {
  if (intervalId) return; // Already running

  // Run immediately on start, then every CHECK_INTERVAL_MS
  checkReminders();
  intervalId = setInterval(checkReminders, CHECK_INTERVAL_MS);

  if (process.env.NODE_ENV !== 'test') {
    console.log('[ReminderScheduler] Started — checking every 60 seconds');
  }
};

/**
 * Stop the reminder scheduler
 */
const stopReminderScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    if (process.env.NODE_ENV !== 'test') {
      console.log('[ReminderScheduler] Stopped');
    }
  }
};

module.exports = { startReminderScheduler, stopReminderScheduler, checkReminders };
