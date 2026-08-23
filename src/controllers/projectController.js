const projectService = require('../services/projectService');
const auditService = require('../services/auditService');

/**
 * POST /api/v1/projects
 */
const createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body, req.user._id);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'PROJECT_CREATED',
      entity: 'Project',
      entityId: project._id,
      description: `Project created: "${project.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/projects
 */
const getProjects = async (req, res, next) => {
  try {
    const result = await projectService.getProjects(req.pagination, req.user._id, req.user.role);

    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/projects/:id
 */
const getProject = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    res.json({
      success: true,
      message: 'Project retrieved successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/projects/:id
 */
const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body, req.user._id);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'PROJECT_UPDATED',
      entity: 'Project',
      entityId: project._id,
      description: `Project updated: "${project.name}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/projects/:id
 */
const deleteProject = async (req, res, next) => {
  try {
    const result = await projectService.deleteProject(req.params.id, req.user._id);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'PROJECT_DELETED',
      entity: 'Project',
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
 * POST /api/v1/projects/:id/members
 */
const addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const project = await projectService.addMember(req.params.id, userId, role, req.user._id);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'PROJECT_MEMBER_ADDED',
      entity: 'Project',
      entityId: project._id,
      description: `Member added to project`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'Member added successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/projects/:id/members/:userId
 */
const removeMember = async (req, res, next) => {
  try {
    const project = await projectService.removeMember(req.params.id, req.params.userId, req.user._id);

    await auditService.logActivity({
      userId: req.user._id,
      action: 'PROJECT_MEMBER_REMOVED',
      entity: 'Project',
      entityId: project._id,
      description: `Member removed from project`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
