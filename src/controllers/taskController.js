const taskService = require('../services/taskService');
const auditService = require('../services/auditService');

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

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  updateStatus,
  assignTask,
  getDashboardStats,
};
