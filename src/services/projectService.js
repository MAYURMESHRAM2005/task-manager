const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

/**
 * Compute project health score (0-100)
 * Factors: completion rate, overdue ratio, activity recency
 */
const computeHealthScore = (taskStats) => {
  const { total, completed, overdue, inProgress, todo } = taskStats;

  if (total === 0) return { score: 100, label: 'No Tasks', color: '#94a3b8' };

  const completionRate = completed / total;
  const overdueRate = total > 0 ? overdue / total : 0;
  const activeRate = total > 0 ? (inProgress + completed) / total : 0;

  // Weighted score: 50% completion, 30% no-overdue, 20% activity
  const score = Math.round(
    (completionRate * 50) +
    ((1 - overdueRate) * 30) +
    (activeRate * 20)
  );

  let label, color;
  if (score >= 80) { label = 'Healthy'; color = '#22c55e'; }
  else if (score >= 60) { label = 'On Track'; color = '#f59e0b'; }
  else if (score >= 40) { label = 'At Risk'; color = '#f97316'; }
  else { label = 'Needs Attention'; color = '#ef4444'; }

  return { score, label, color };
};

/**
 * Create a new project
 */
const createProject = async (projectData, userId) => {
  const project = await Project.create({
    ...projectData,
    owner: userId,
    members: [{ user: userId, role: 'OWNER' }],
  });

  await project.populate('owner', 'name email avatar');
  await project.populate('members.user', 'name email avatar');

  return project;
};

/**
 * Get projects with pagination and health scores
 */
const getProjects = async (pagination, userId, userRole) => {
  let query = {};

  // USER role: only see projects they are a member of
  if (userRole === 'USER') {
    query['members.user'] = userId;
  }

  const total = await Project.countDocuments(query);

  const projects = await Project.find(query)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip((pagination.page - 1) * pagination.limit)
    .limit(pagination.limit);

  // Add task stats and health score for each project
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const taskStatsRaw = await Task.aggregate([
        { $match: { project: project._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const totalTasks = taskStatsRaw.reduce((acc, s) => acc + s.count, 0);
      const completedTasks = taskStatsRaw.find((s) => s._id === 'COMPLETED')?.count || 0;
      const overdueTasks = await Task.countDocuments({
        project: project._id,
        dueDate: { $lt: new Date(), $ne: null },
        status: { $in: ['TODO', 'IN_PROGRESS'] },
      });
      const inProgressTasks = taskStatsRaw.find((s) => s._id === 'IN_PROGRESS')?.count || 0;
      const todoTasks = taskStatsRaw.find((s) => s._id === 'TODO')?.count || 0;

      const health = computeHealthScore({
        total: totalTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        inProgress: inProgressTasks,
        todo: todoTasks,
      });

      return {
        ...project.toJSON(),
        taskStats: {
          total: totalTasks,
          completed: completedTasks,
          overdue: overdueTasks,
          completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        health,
      };
    })
  );

  return {
    data: projectsWithStats,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

/**
 * Get project by ID
 */
const getProjectById = async (projectId) => {
  const project = await Project.findById(projectId)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

  if (!project) {
    throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
  }

  // Get task stats
  const taskStatsRaw = await Task.aggregate([
    { $match: { project: project._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const totalTasks = taskStatsRaw.reduce((acc, s) => acc + s.count, 0);
  const completedTasks = taskStatsRaw.find((s) => s._id === 'COMPLETED')?.count || 0;
  const overdueTasks = await Task.countDocuments({
    project: project._id,
    dueDate: { $lt: new Date(), $ne: null },
    status: { $in: ['TODO', 'IN_PROGRESS'] },
  });
  const inProgressTasks = taskStatsRaw.find((s) => s._id === 'IN_PROGRESS')?.count || 0;
  const todoTasks = taskStatsRaw.find((s) => s._id === 'TODO')?.count || 0;

  const health = computeHealthScore({
    total: totalTasks,
    completed: completedTasks,
    overdue: overdueTasks,
    inProgress: inProgressTasks,
    todo: todoTasks,
  });

  return {
    ...project.toJSON(),
    taskStats: {
      total: totalTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      breakdown: taskStatsRaw.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
    },
    health,
  };
};

/**
 * Update project
 */
const updateProject = async (projectId, updateData, userId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
  }

  // Check if user is owner or manager of the project
  const member = project.members.find((m) => m.user.toString() === userId.toString());
  if (!member || !['OWNER', 'MANAGER'].includes(member.role)) {
    throw new AppError('You do not have permission to update this project.', 403, 'NOT_AUTHORIZED');
  }

  const allowedUpdates = ['name', 'description', 'status', 'startDate', 'endDate'];
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      project[field] = updateData[field];
    }
  });

  await project.save();
  await project.populate(['owner', 'members.user']);

  return project;
};

/**
 * Delete project
 */
const deleteProject = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.owner.toString() !== userId.toString()) {
    throw new AppError('Only the project owner can delete it.', 403, 'NOT_AUTHORIZED');
  }

  // Unassign tasks from this project
  await Task.updateMany({ project: projectId }, { project: null });

  await Project.findByIdAndDelete(projectId);
  return { message: 'Project deleted successfully' };
};

/**
 * Add member to project
 */
const addMember = async (projectId, memberId, role = 'MEMBER', userId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
  }

  // Check authorization
  const requester = project.members.find((m) => m.user.toString() === userId.toString());
  if (!requester || !['OWNER', 'MANAGER'].includes(requester.role)) {
    throw new AppError('You do not have permission to manage project members.', 403, 'NOT_AUTHORIZED');
  }

  // Check if already a member
  const existingMember = project.members.find((m) => m.user.toString() === memberId);
  if (existingMember) {
    throw new AppError('User is already a member of this project.', 409, 'ALREADY_MEMBER');
  }

  project.members.push({ user: memberId, role });
  await project.save();
  await project.populate('members.user', 'name email avatar');

  // Create notification
  await Notification.create({
    user: memberId,
    type: 'PROJECT_MEMBER_ADDED',
    message: `You have been added to project: "${project.name}"`,
    relatedEntity: { type: 'Project', id: project._id },
  });

  return project;
};

/**
 * Remove member from project
 */
const removeMember = async (projectId, memberId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
  }

  // Check authorization: only owner or manager can remove members
  const requester = project.members.find((m) => m.user.toString() === userId.toString());
  if (!requester || !['OWNER', 'MANAGER'].includes(requester.role)) {
    throw new AppError('You do not have permission to manage project members.', 403, 'NOT_AUTHORIZED');
  }

  // Cannot remove the owner
  if (project.owner.toString() === memberId) {
    throw new AppError('Cannot remove the project owner.', 400, 'CANNOT_REMOVE_OWNER');
  }

  const memberIndex = project.members.findIndex((m) => m.user.toString() === memberId);
  if (memberIndex === -1) {
    throw new AppError('User is not a member of this project.', 404, 'MEMBER_NOT_FOUND');
  }

  project.members.splice(memberIndex, 1);
  await project.save();

  return project;
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
