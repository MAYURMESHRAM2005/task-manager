const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

/**
 * Create a new task
 */
const createTask = async (taskData, userId) => {
  const task = await Task.create({
    ...taskData,
    createdBy: userId,
  });

  await task.populate(['createdBy', 'assignedTo', 'project']);

  // Create notification if assigned
  if (task.assignedTo && task.assignedTo._id.toString() !== userId) {
    await Notification.create({
      user: task.assignedTo._id,
      type: 'TASK_ASSIGNED',
      message: `You have been assigned a new task: "${task.title}"`,
      relatedEntity: { type: 'Task', id: task._id },
    });
  }

  return task;
};

/**
 * Get tasks with filtering, sorting, search, and pagination
 */
const getTasks = async (filters, pagination, userId) => {
  const query = {};

  // Role-based filtering
  if (filters.userRole === 'USER') {
    query.$or = [{ createdBy: userId }, { assignedTo: userId }];
  }

  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }

  // Priority filter
  if (filters.priority) {
    query.priority = filters.priority;
  }

  // Category filter
  if (filters.category) {
    query.category = filters.category;
  }

  // Project filter
  if (filters.project) {
    query.project = filters.project;
  }

  // Assigned user filter
  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  // Created by filter
  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  // Search by title or description
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Due date filter
  if (filters.dueBefore) {
    query.dueDate = { ...query.dueDate, $lte: new Date(filters.dueBefore) };
  }
  if (filters.dueAfter) {
    query.dueDate = { ...query.dueDate, $gte: new Date(filters.dueAfter) };
  }

  // Overdue filter
  if (filters.overdue === 'true') {
    query.dueDate = { $lt: new Date() };
    query.status = { $in: ['TODO', 'IN_PROGRESS'] };
  }

  const total = await Task.countDocuments(query);

  // Sort
  let sort = { createdAt: -1 };
  if (filters.sortBy) {
    const sortField = filters.sortBy;
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    sort = { [sortField]: sortOrder };
  }

  const tasks = await Task.find(query)
    .populate('createdBy', 'name email avatar')
    .populate('assignedTo', 'name email avatar')
    .populate('project', 'name')
    .sort(sort)
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit);

  return {
    data: tasks,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

/**
 * Get single task by ID
 */
const getTaskById = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate('createdBy', 'name email avatar')
    .populate('assignedTo', 'name email avatar')
    .populate('project', 'name');

  if (!task) {
    throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
  }

  return task;
};

/**
 * Update a task
 */
const updateTask = async (taskId, updateData, userId, userRole) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
  }

  // Check authorization: creator, assignee, or manager/admin can update
  const isCreator = task.createdBy.toString() === userId.toString();
  const isAssignee = task.assignedTo && task.assignedTo.toString() === userId.toString();
  const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(userRole);

  if (!isCreator && !isAssignee && !isManagerOrAdmin) {
    throw new AppError('You do not have permission to update this task.', 403, 'NOT_AUTHORIZED');
  }

  const allowedUpdates = ['title', 'description', 'status', 'priority', 'category', 'dueDate', 'assignedTo', 'project', 'reminderAt'];
  allowedUpdates.forEach((field) => {
    if (field in updateData) {
      task[field] = updateData[field];
    }
  });

  await task.save();
  await task.populate(['createdBy', 'assignedTo', 'project']);

  return task;
};

/**
 * Delete a task
 */
const deleteTask = async (taskId, userId, userRole) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
  }

  const isCreator = task.createdBy.toString() === userId.toString();
  const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(userRole);
  if (!isCreator && !isManagerOrAdmin) {
    throw new AppError('You do not have permission to delete this task.', 403, 'NOT_AUTHORIZED');
  }

  await Task.findByIdAndDelete(taskId);
  return { message: 'Task deleted successfully' };
};

/**
 * Assign a task
 */
const assignTask = async (taskId, assignedToId, userId, userRole) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
  }

  // Only creator, manager, or admin can assign tasks
  const isCreator = task.createdBy.toString() === userId.toString();
  const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(userRole);
  if (!isCreator && !isManagerOrAdmin) {
    throw new AppError('You do not have permission to assign this task.', 403, 'NOT_AUTHORIZED');
  }

  task.assignedTo = assignedToId || null;
  await task.save();
  await task.populate(['createdBy', 'assignedTo', 'project']);

  // Create notification
  if (assignedToId && assignedToId.toString() !== userId.toString()) {
    const previousAssignee = task.assignedTo?._id?.toString();
    const notificationType = previousAssignee ? 'TASK_REASSIGNED' : 'TASK_ASSIGNED';

    await Notification.create({
      user: assignedToId,
      type: notificationType,
      message: `You have been ${notificationType === 'TASK_REASSIGNED' ? 'reassigned' : 'assigned'} to task: "${task.title}"`,
      relatedEntity: { type: 'Task', id: task._id },
    });
  }

  return task;
};

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (userId, userRole) => {
  const matchQuery = {};
  if (userRole === 'USER') {
    matchQuery.$or = [{ createdBy: userId }, { assignedTo: userId }];
  }

  const [statusStats, priorityStats, overdueStats, weeklyStats, monthlyStats] = await Promise.all([
    Task.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.countDocuments({
      ...matchQuery,
      dueDate: { $lt: new Date() },
      status: { $in: ['TODO', 'IN_PROGRESS'] },
    }),
    Task.aggregate([
      {
        $match: {
          ...matchQuery,
          completedAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$completedAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Task.aggregate([
      {
        $match: {
          ...matchQuery,
          completedAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: '$completedAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalTasks = statusStats.reduce((acc, s) => acc + s.count, 0);
  const statusMap = {};
  statusStats.forEach((s) => { statusMap[s._id] = s.count; });
  const priorityMap = {};
  priorityStats.forEach((p) => { priorityMap[p._id] = p.count; });

  return {
    totalTasks,
    completedTasks: statusMap.COMPLETED || 0,
    pendingTasks: statusMap.TODO || 0,
    inProgressTasks: statusMap.IN_PROGRESS || 0,
    cancelledTasks: statusMap.CANCELLED || 0,
    overdueTasks: overdueStats,
    urgentTasks: priorityMap.URGENT || 0,
    completionPercentage: totalTasks > 0 ? Math.round(((statusMap.COMPLETED || 0) / totalTasks) * 100) : 0,
    pendingPercentage: totalTasks > 0 ? Math.round(((statusMap.TODO || 0) / totalTasks) * 100) : 0,
    statusBreakdown: statusMap,
    priorityBreakdown: priorityMap,
    weeklyCompleted: weeklyStats,
    monthlyCompleted: monthlyStats,
  };
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  getDashboardStats,
};
