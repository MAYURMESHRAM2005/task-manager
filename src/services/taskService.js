const Task = require('../models/Task');
const Subtask = require('../models/Subtask');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

/**
 * Create a new task
 */
const createTask = async (taskData, userId) => {
  // Auto-assign position at end of column
  if (taskData.status && !taskData.position && taskData.position !== 0) {
    const lastTask = await Task.findOne({ status: taskData.status, project: taskData.project || null })
      .sort({ position: -1 });
    taskData.position = lastTask ? lastTask.position + 1 : 0;
  }

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
 * Get tasks with advanced filtering, sorting, search, and pagination
 */
const getTasks = async (filters, pagination, userId) => {
  const query = {};

  // Role-based filtering
  if (filters.userRole === 'USER') {
    query.$or = [{ createdBy: userId }, { assignedTo: userId }];
  }

  // Status filter (support comma-separated)
  if (filters.status) {
    const statuses = filters.status.split(',');
    if (statuses.length === 1) {
      query.status = statuses[0];
    } else {
      query.status = { $in: statuses };
    }
  }

  // Priority filter (support comma-separated)
  if (filters.priority) {
    const priorities = filters.priority.split(',');
    if (priorities.length === 1) {
      query.priority = priorities[0];
    } else {
      query.priority = { $in: priorities };
    }
  }

  // Category filter
  if (filters.category) {
    query.category = filters.category;
  }

  // Labels filter
  if (filters.label) {
    query.labels = { $in: filters.label.split(',') };
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

  // Due date range
  if (filters.dueBefore) {
    query.dueDate = { ...query.dueDate, $lte: new Date(filters.dueBefore) };
  }
  if (filters.dueAfter) {
    query.dueDate = { ...query.dueDate, $gte: new Date(filters.dueAfter) };
  }

  // Calendar range (for calendar view)
  if (filters.dateFrom && filters.dateTo) {
    query.dueDate = {
      $gte: new Date(filters.dateFrom),
      $lte: new Date(filters.dateTo),
    };
  }

  // Overdue filter
  if (filters.overdue === 'true') {
    query.dueDate = { $lt: new Date() };
    query.status = { $in: ['TODO', 'IN_PROGRESS'] };
  }

  // Has dependencies filter
  if (filters.hasDependencies === 'true') {
    query.dependsOn = { $exists: true, $ne: [] };
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
    .populate('dependsOn', 'title status')
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
    .populate('project', 'name')
    .populate('dependsOn', 'title status priority');

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

  // Check dependency cycle if adding new dependencies
  if (updateData.dependsOn && updateData.dependsOn.length > 0) {
    for (const depId of updateData.dependsOn) {
      if (depId.toString() === taskId.toString()) {
        throw new AppError('A task cannot depend on itself.', 400, 'SELF_DEPENDENCY');
      }
      const hasCycle = await checkDependencyCycle(taskId, depId);
      if (hasCycle) {
        throw new AppError('Adding this dependency would create a circular dependency.', 400, 'CIRCULAR_DEPENDENCY');
      }
    }
  }

  const allowedUpdates = ['title', 'description', 'status', 'priority', 'category', 'dueDate', 'assignedTo', 'project', 'reminderAt', 'position', 'labels', 'dependsOn', 'recurrence', 'nextRecurrenceAt', 'mentions'];
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
 * Check for circular dependency (BFS)
 */
const checkDependencyCycle = async (taskId, dependsOnId) => {
  const visited = new Set();
  const queue = [dependsOnId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId.toString() === taskId.toString()) {
      return true;
    }
    if (visited.has(currentId.toString())) continue;
    visited.add(currentId.toString());

    const task = await Task.findById(currentId).select('dependsOn');
    if (task && task.dependsOn && task.dependsOn.length > 0) {
      task.dependsOn.forEach((dep) => queue.push(dep));
    }
  }
  return false;
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

  // Remove this task from other tasks' dependencies
  await Task.updateMany({ dependsOn: taskId }, { $pull: { dependsOn: taskId } });

  // Delete subtasks
  await Subtask.deleteMany({ task: taskId });

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
 * Reorder tasks for kanban drag-and-drop
 */
const reorderTasks = async (updates) => {
  const bulkOps = updates.map(({ taskId, status, position }) => ({
    updateOne: {
      filter: { _id: taskId },
      update: { $set: { status, position } },
    },
  }));

  await Task.bulkWrite(bulkOps);

  return { message: 'Tasks reordered successfully', count: updates.length };
};

/**
 * Get kanban board data
 */
const getKanbanBoard = async (filters, userId, userRole) => {
  const query = {};

  if (filters.project) {
    query.project = filters.project;
  }

  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  if (userRole === 'USER') {
    query.$or = [{ createdBy: userId }, { assignedTo: userId }];
  }

  const tasks = await Task.find(query)
    .populate('createdBy', 'name email avatar')
    .populate('assignedTo', 'name email avatar')
    .populate('project', 'name')
    .populate('dependsOn', 'title status')
    .sort({ position: 1, createdAt: -1 });

  const board = {
    TODO: tasks.filter((t) => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
    REVIEW: tasks.filter((t) => t.status === 'REVIEW'),
    COMPLETED: tasks.filter((t) => t.status === 'COMPLETED'),
  };

  return board;
};

/**
 * Get calendar data
 */
const getCalendarData = async (filters, userId, userRole) => {
  const query = {};

  if (userRole === 'USER') {
    query.$or = [{ createdBy: userId }, { assignedTo: userId }];
  }

  if (filters.project) {
    query.project = filters.project;
  }

  // Only tasks with due dates in the month range
  query.dueDate = {
    $gte: new Date(filters.dateFrom),
    $lte: new Date(filters.dateTo),
  };

  query.dueDate.$ne = null;

  const tasks = await Task.find(query)
    .populate('createdBy', 'name email avatar')
    .populate('assignedTo', 'name email avatar')
    .populate('project', 'name')
    .sort({ dueDate: 1 });

  return tasks;
};

/**
 * Get dashboard statistics (enhanced)
 */
const getDashboardStats = async (userId, userRole) => {
  const matchQuery = {};
  if (userRole === 'USER') {
    matchQuery.$or = [{ createdBy: userId }, { assignedTo: userId }];
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

  const [statusStats, priorityStats, overdueStats, weeklyStats, monthlyStats, todayTasks, upcomingTasks, recentActivity] = await Promise.all([
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
      dueDate: { $lt: now, $ne: null },
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
    // Tasks due today
    Task.countDocuments({
      ...matchQuery,
      dueDate: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
      status: { $nin: ['COMPLETED', 'CANCELLED'] },
    }),
    // Tasks due this week
    Task.countDocuments({
      ...matchQuery,
      dueDate: { $gte: today, $lte: endOfWeek },
      status: { $nin: ['COMPLETED', 'CANCELLED'] },
    }),
    // Recent tasks (last 10)
    Task.find(matchQuery)
      .populate('assignedTo', 'name avatar')
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title status priority dueDate updatedAt assignedTo'),
  ]);

  const totalTasks = statusStats.reduce((acc, s) => acc + s.count, 0);
  const statusMap = {};
  statusStats.forEach((s) => { statusMap[s._id] = s.count; });
  const priorityMap = {};
  priorityStats.forEach((p) => { priorityMap[p._id] = p.count; });

  // Calculate productivity score (completed / total, weighted by priority)
  const completedCount = statusMap.COMPLETED || 0;
  const productivityScore = totalTasks > 0
    ? Math.round((completedCount / totalTasks) * 100)
    : 0;

  return {
    totalTasks,
    completedTasks: completedCount,
    pendingTasks: statusMap.TODO || 0,
    inProgressTasks: statusMap.IN_PROGRESS || 0,
    reviewTasks: statusMap.REVIEW || 0,
    cancelledTasks: statusMap.CANCELLED || 0,
    overdueTasks: overdueStats,
    urgentTasks: priorityMap.URGENT || 0,
    todayTasks,
    upcomingTasks,
    completionPercentage: productivityScore,
    productivityScore,
    pendingPercentage: totalTasks > 0 ? Math.round(((statusMap.TODO || 0) / totalTasks) * 100) : 0,
    statusBreakdown: statusMap,
    priorityBreakdown: priorityMap,
    weeklyCompleted: weeklyStats,
    monthlyCompleted: monthlyStats,
    recentActivity,
  };
};

/**
 * Get subtasks for a task
 */
const getSubtasks = async (taskId) => {
  const subtasks = await Subtask.find({ task: taskId })
    .populate('createdBy', 'name avatar')
    .sort({ position: 1, createdAt: 1 });

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed).length;

  return {
    data: subtasks,
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

/**
 * Create subtask
 */
const createSubtask = async (taskId, data, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
  }

  const lastSubtask = await Subtask.findOne({ task: taskId }).sort({ position: -1 });
  const position = lastSubtask ? lastSubtask.position + 1 : 0;

  const subtask = await Subtask.create({
    task: taskId,
    title: data.title,
    position,
    createdBy: userId,
  });

  await subtask.populate('createdBy', 'name avatar');
  return subtask;
};

/**
 * Update subtask
 */
const updateSubtask = async (subtaskId, data) => {
  const subtask = await Subtask.findById(subtaskId);
  if (!subtask) {
    throw new AppError('Subtask not found.', 404, 'SUBTASK_NOT_FOUND');
  }

  if (data.title !== undefined) subtask.title = data.title;
  if (data.completed !== undefined) subtask.completed = data.completed;
  if (data.position !== undefined) subtask.position = data.position;

  await subtask.save();
  await subtask.populate('createdBy', 'name avatar');
  return subtask;
};

/**
 * Delete subtask
 */
const deleteSubtask = async (subtaskId) => {
  const subtask = await Subtask.findById(subtaskId);
  if (!subtask) {
    throw new AppError('Subtask not found.', 404, 'SUBTASK_NOT_FOUND');
  }

  await Subtask.findByIdAndDelete(subtaskId);
  return { message: 'Subtask deleted successfully' };
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
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
