const Team = require('../models/Team');
const { AppError } = require('../middleware/errorHandler');
const auditService = require('../services/auditService');

/**
 * POST /api/v1/teams
 */
const createTeam = async (req, res, next) => {
  try {
    const team = await Team.create({
      ...req.body,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'OWNER' }],
    });

    await team.populate(['owner', 'members.user']);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'TEAM_CREATED',
      entity: 'Team',
      entityId: team._id,
      description: `Team created: "${team.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: { team },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/teams
 */
const getTeams = async (req, res, next) => {
  try {
    const query = {};

    // USER role: only see teams they are a member of
    if (req.user.role === 'USER') {
      query['members.user'] = req.user._id;
    }

    const total = await Team.countDocuments(query);

    const teams = await Team.find(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip((req.pagination.page - 1) * req.pagination.limit)
      .limit(req.pagination.limit);

    res.json({
      success: true,
      message: 'Teams retrieved successfully',
      data: teams,
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
 * GET /api/v1/teams/:id
 */
const getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    res.json({
      success: true,
      message: 'Team retrieved successfully',
      data: { team },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/teams/:id
 */
const updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    const member = team.members.find((m) => m.user.toString() === req.user._id.toString());
    if (!member || !['OWNER', 'MANAGER'].includes(member.role)) {
      throw new AppError('You do not have permission to update this team.', 403, 'NOT_AUTHORIZED');
    }

    const allowedUpdates = ['name', 'description'];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        team[field] = req.body[field];
      }
    });

    await team.save();
    await team.populate(['owner', 'members.user']);

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: { team },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/teams/:id
 */
const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.owner.toString() !== req.user._id.toString()) {
      throw new AppError('Only the team owner can delete it.', 403, 'NOT_AUTHORIZED');
    }

    await Team.findByIdAndDelete(req.params.id);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'TEAM_DELETED',
      entity: 'Team',
      entityId: req.params.id,
      description: 'Team deleted',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'Team deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTeam, getTeams, getTeam, updateTeam, deleteTeam };
