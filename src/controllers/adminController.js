const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Team = require('../models/Team');
const { AppError } = require('../middleware/errorHandler');
const auditService = require('../services/auditService');

/**
 * GET /api/v1/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const total = await User.countDocuments();

    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip((req.pagination.page - 1) * req.pagination.limit)
      .limit(req.pagination.limit);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      pagination: {
        page: req.pagination.page,
        limit: req.pagination.limit,
        total,
        totalPages: Math.ceil(total / req.pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    await auditService.logActivity({
      userId: req.user._id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'User',
      entityId: user._id,
      description: `User ${user.email} ${isActive ? 'activated' : 'deactivated'}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    await auditService.logActivity({
      userId: req.user._id,
      action: 'ROLE_CHANGED',
      entity: 'User',
      entityId: user._id,
      description: `User ${user.email} role changed to ${role}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const filters = {
      user: req.query.user,
      entity: req.query.entity,
      action: req.query.action,
    };

    const result = await auditService.getAuditLogs(req.pagination, filters);

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/statistics
 */
const getStatistics = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalTasks, totalProjects, totalTeams] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Task.countDocuments(),
      Project.countDocuments(),
      Team.countDocuments(),
    ]);

    const taskStatusStats = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const taskPriorityStats = await Task.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        totalUsers,
        activeUsers,
        totalTasks,
        totalProjects,
        totalTeams,
        taskStatusBreakdown: taskStatusStats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
        taskPriorityBreakdown: taskPriorityStats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, updateUserStatus, updateUserRole, getAuditLogs, getStatistics };
