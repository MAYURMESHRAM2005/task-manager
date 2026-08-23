const validateCreateProject = (req, res, next) => {
  const { name } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Project name must be at least 2 characters long');
  }
  if (name && name.trim().length > 100) {
    errors.push('Project name cannot exceed 100 characters');
  }
  if (req.body.description && req.body.description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }
  if (req.body.status && !['PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(req.body.status)) {
    errors.push('Invalid status value');
  }

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: errors.join('. '),
      error: { code: 'VALIDATION_ERROR', details: errors },
    });
  }

  next();
};

module.exports = { validateCreateProject };
