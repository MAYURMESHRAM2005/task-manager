const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { emitToUser } = require('./socketService');

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
let intervalId = null;

/**
 * Calculate the next occurrence date based on recurrence pattern
 */
const getNextOccurrence = (completedAt, recurrence) => {
  if (!recurrence || recurrence.frequency === 'none') return null;

  const date = new Date(completedAt);
  const interval = recurrence.interval || 1;

  switch (recurrence.frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 * interval));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + interval);
      break;
    default:
      return null;
  }

  return date;
};

/**
 * Check for completed recurring tasks and create next instance
 */
const checkRecurringTasks = async () => {
  try {
    // Find tasks that were just completed and have active recurrence
    const completedRecurring = await Task.find({
      status: 'COMPLETED',
      'recurrence.frequency': { $ne: 'none' },
      completedAt: { $ne: null },
    });

    for (const task of completedRecurring) {
      const nextDate = getNextOccurrence(task.completedAt, task.recurrence);

      // Check if recurrence has ended
      if (task.recurrence.endDate && nextDate > task.recurrence.endDate) {
        // Reset recurrence on the original task
        await Task.findByIdAndUpdate(task._id, {
          'recurrence.frequency': 'none',
          nextRecurrenceAt: null,
        });
        continue;
      }

      // Check if next instance already exists (prevent duplicates)
      const existingNext = await Task.findOne({
        title: task.title,
        createdBy: task.createdBy,
        status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW'] },
        nextRecurrenceAt: { $ne: null },
      });

      if (existingNext) continue;

      // Create next instance
      const newTask = await Task.create({
        title: task.title,
        description: task.description,
        status: 'TODO',
        priority: task.priority,
        category: task.category,
        labels: task.labels,
        dueDate: nextDate,
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        project: task.project,
        recurrence: task.recurrence,
        nextRecurrenceAt: nextDate,
      });

      // Mark original task recurrence as handled
      await Task.findByIdAndUpdate(task._id, {
        nextRecurrenceAt: null,
      });

      // Notify assignee
      if (newTask.assignedTo && newTask.assignedTo.toString() !== task.createdBy.toString()) {
        const notification = await Notification.create({
          user: newTask.assignedTo,
          type: 'TASK_ASSIGNED',
          message: `Recurring task "${newTask.title}" is due on ${newTask.dueDate ? new Date(newTask.dueDate).toLocaleDateString() : 'no date set'}`,
          relatedEntity: { type: 'Task', id: newTask._id },
        });

        emitToUser(newTask.assignedTo, 'notification', {
          type: 'RECURRING_TASK',
          message: notification.message,
          taskId: newTask._id,
        });
      }

      if (process.env.NODE_ENV !== 'test') {
        console.log(`[RecurringScheduler] Created next instance for task: ${task.title}`);
      }
    }
  } catch (error) {
    console.error('[RecurringScheduler] Error:', error.message);
  }
};

/**
 * Start the recurring task scheduler
 */
const startRecurringScheduler = () => {
  if (intervalId) return;
  checkRecurringTasks();
  intervalId = setInterval(checkRecurringTasks, CHECK_INTERVAL_MS);
  if (process.env.NODE_ENV !== 'test') {
    console.log('[RecurringScheduler] Started — checking every 5 minutes');
  }
};

/**
 * Stop the recurring task scheduler
 */
const stopRecurringScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    if (process.env.NODE_ENV !== 'test') {
      console.log('[RecurringScheduler] Stopped');
    }
  }
};

module.exports = { startRecurringScheduler, stopRecurringScheduler, checkRecurringTasks, getNextOccurrence };
