const taskService = require('../services/taskService');
const auditService = require('../services/auditService');
const Notification = require('../models/Notification');
const { emitToUser, emitToProject, emitToTask } = require('../services/socketService');
const { parseMentions, resolveMentions, notifyMentions } = require('../services/mentionService');

/**
 * POST /api/v1/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body, req.user._id);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'TASK_CREATED',
      entity: 'Task',
      entityId: task._id,
      description: `Task created: "${task.title}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Real-time: notify assigned user
    if (task.assignedTo && task.assignedTo._id && task.assignedTo._id.toString() !== req.user._id.toString()) {
      // Create persistent notification
      const notif = await Notification.create({
        user: task.assignedTo._id,
        type: 'TASK_ASSIGNED',
        message: `You have been assigned to task "${task.title}" by ${req.user.name}`,
        relatedEntity: { type: 'Task', id: task._id },
      });
      emitToUser(task.assignedTo._id, 'notification', {
        type: 'TASK_ASSIGNED',
        message: notif.message,
        entityType: 'Task',
        entityId: task._id,
        timestamp: notif.createdAt,
      });
    }
    if (task.project && task.project._id) {
      emitToProject(task.project._id, 'project:task:created', { task });
    }

    // Parse and handle @mentions in description
    if (task.description) {
      const mentionUsernames = parseMentions(task.description);
      if (mentionUsernames.length > 0) {
        const mentionedUsers = await resolveMentions(mentionUsernames);
        if (mentionedUsers.length > 0) {
          await notifyMentions(mentionedUsers, {
            entityType: 'Task',
            entityId: task._id,
            entityTitle: task.title,
            actorId: req.user._id,
            actorName: req.user.name,
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      category: req.query.category,
      project: req.query.project,
      assignedTo: req.query.assignedTo,
      createdBy: req.query.createdBy,
      search: req.query.search,
      overdue: req.query.overdue,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      label: req.query.label,
      hasDependencies: req.query.hasDependencies,
      userRole: req.user.role,
    };

    const result = await taskService.getTasks(filters, req.pagination, req.user._id);

    res.json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/:id
 */
const getTask = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    res.json({
      success: true,
      message: 'Task retrieved successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user._id, req.user.role);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'TASK_UPDATED',
      entity: 'Task',
      entityId: task._id,
      description: `Task updated: "${task.title}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Real-time: broadcast task update
    emitToTask(req.params.id, 'task:updated', { task });
    if (task.project && task.project._id) {
      emitToProject(task.project._id, 'project:task:updated', { task });
    }
    if (task.assignedTo && task.assignedTo._id) {
      emitToUser(task.assignedTo._id, 'task:updated', { task });
    }

    // Handle @mentions in description
    if (task.description) {
      const mentionUsernames = parseMentions(task.description);
      if (mentionUsernames.length > 0) {
        const mentionedUsers = await resolveMentions(mentionUsernames);
        if (mentionedUsers.length > 0) {
          await notifyMentions(mentionedUsers, {
            entityType: 'Task',
            entityId: task._id,
            entityTitle: task.title,
            actorId: req.user._id,
            actorName: req.user.name,
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const result = await taskService.deleteTask(req.params.id, req.user._id, req.user.role);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'TASK_DELETED',
      entity: 'Task',
      entityId: req.params.id,
      description: result.message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Real-time: broadcast task deletion
    emitToTask(req.params.id, 'task:deleted', { taskId: req.params.id });

    res.json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/tasks/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await taskService.updateTask(req.params.id, { status }, req.user._id, req.user.role);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'TASK_STATUS_CHANGED',
      entity: 'Task',
      entityId: task._id,
      description: `Task status changed to: ${status}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Real-time: broadcast status change
    emitToTask(req.params.id, 'task:status', { taskId: req.params.id, status, task });
    if (task.project && task.project._id) {
      emitToProject(task.project._id, 'project:task:status', { taskId: req.params.id, status, task });
    }

    // Create notification for task creator when status changes
    const creatorId = task.createdBy?._id || task.createdBy;
    if (creatorId && creatorId.toString() !== req.user._id.toString()) {
      let notifType = 'TASK_COMPLETED';
      let notifMsg = `Task "${task.title}" status changed to ${status.replace(/_/g, ' ').toLowerCase()} by ${req.user.name}`;
      if (status === 'COMPLETED') {
        notifMsg = `Task "${task.title}" has been completed by ${req.user.name}`;
      } else if (status === 'CANCELLED') {
        notifType = 'TASK_OVERDUE';
        notifMsg = `Task "${task.title}" has been cancelled by ${req.user.name}`;
      }

      const notif = await Notification.create({
        user: creatorId,
        type: notifType,
        message: notifMsg,
        relatedEntity: { type: 'Task', id: task._id },
      });

      emitToUser(creatorId, 'notification', {
        type: notifType,
        message: notif.message,
        entityType: 'Task',
        entityId: task._id,
        timestamp: notif.createdAt,
      });
    }

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/tasks/:id/assign
 */
const assignTask = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const task = await taskService.assignTask(req.params.id, assignedTo, req.user._id, req.user.role);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'TASK_ASSIGNED',
      entity: 'Task',
      entityId: task._id,
      description: `Task assigned to user`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Notify the assigned user
    if (task.assignedTo && task.assignedTo._id && task.assignedTo._id.toString() !== req.user._id.toString()) {
      const notif = await Notification.create({
        user: task.assignedTo._id,
        type: 'TASK_ASSIGNED',
        message: `You have been assigned to task "${task.title}" by ${req.user.name}`,
        relatedEntity: { type: 'Task', id: task._id },
      });
      emitToUser(task.assignedTo._id, 'notification', {
        type: 'TASK_ASSIGNED',
        message: notif.message,
        entityType: 'Task',
        entityId: task._id,
        timestamp: notif.createdAt,
      });
    }

    res.json({
      success: true,
      message: 'Task assigned successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/tasks/reorder — kanban drag-and-drop
 */
const reorderTasks = async (req, res, next) => {
  try {
    const result = await taskService.reorderTasks(req.body.updates);
    // Real-time: broadcast reorder to all connected users
    emitToTask('global', 'kanban:reordered', { updates: req.body.updates });
    res.json({
      success: true,
      message: result.message,
      data: { count: result.count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/kanban — kanban board data
 */
const getKanbanBoard = async (req, res, next) => {
  try {
    const board = await taskService.getKanbanBoard({
      project: req.query.project,
      assignedTo: req.query.assignedTo,
    }, req.user._id, req.user.role);

    res.json({
      success: true,
      message: 'Kanban board retrieved successfully',
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/calendar — calendar view data
 */
const getCalendarData = async (req, res, next) => {
  try {
    const tasks = await taskService.getCalendarData({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      project: req.query.project,
    }, req.user._id, req.user.role);

    res.json({
      success: true,
      message: 'Calendar data retrieved successfully',
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/dashboard/stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await taskService.getDashboardStats(req.user._id, req.user.role);
    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tasks/:id/subtasks
 */
const getSubtasks = async (req, res, next) => {
  try {
    const result = await taskService.getSubtasks(req.params.id, req.user._id);
    res.json({
      success: true,
      message: 'Subtasks retrieved successfully',
      data: result.data,
      total: result.total,
      completed: result.completed,
      percentage: result.percentage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/tasks/:id/subtasks
 */
const createSubtask = async (req, res, next) => {
  try {
    const subtask = await taskService.createSubtask(req.params.id, req.body, req.user._id);
    res.status(201).json({
      success: true,
      message: 'Subtask created successfully',
      data: { subtask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/tasks/subtasks/:subtaskId
 */
const updateSubtask = async (req, res, next) => {
  try {
    const subtask = await taskService.updateSubtask(req.params.subtaskId, req.body, req.user._id);
    res.json({
      success: true,
      message: 'Subtask updated successfully',
      data: { subtask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/tasks/subtasks/:subtaskId
 */
const deleteSubtask = async (req, res, next) => {
  try {
    const result = await taskService.deleteSubtask(req.params.subtaskId, req.user._id);
    res.json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  updateStatus,
  assignTask,
  reorderTasks,
  getKanbanBoard,
  getCalendarData,
  getDashboardStats,
  getSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
};
