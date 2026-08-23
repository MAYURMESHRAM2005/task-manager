const mongoose = require('mongoose');

const validateCreateTask = (req, res, next) => {
  const { title } = req.body;
  const errors = [];

  if (!title || title.trim().length < 2) {
    errors.push('Title must be at least 2 characters long');
  }
  if (title && title.trim().length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }
  if (req.body.description && req.body.description.length > 2000) {
    errors.push('Description cannot exceed 2000 characters');
  }
  if (req.body.status && !['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(req.body.status)) {
    errors.push('Invalid status value');
  }
  if (req.body.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(req.body.priority)) {
    errors.push('Invalid priority value');
  }
  if (req.body.dueDate && isNaN(new Date(req.body.dueDate).getTime())) {
    errors.push('Invalid due date');
  }
  if (req.body.assignedTo && !mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
    errors.push('Invalid assignedTo user ID');
  }
  if (req.body.project && !mongoose.Types.ObjectId.isValid(req.body.project)) {
    errors.push('Invalid project ID');
  }
  if (req.body.reminderAt && isNaN(new Date(req.body.reminderAt).getTime())) {
    errors.push('Invalid reminder date');
  }
  if (req.body.reminderAt && new Date(req.body.reminderAt) < new Date()) {
    errors.push('Reminder date must be in the future');
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

const validateUpdateTask = (req, res, next) => {
  const errors = [];

  if (req.body.title !== undefined && req.body.title.trim().length < 2) {
    errors.push('Title must be at least 2 characters long');
  }
  if (req.body.title !== undefined && req.body.title.trim().length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }
  if (req.body.status && !['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(req.body.status)) {
    errors.push('Invalid status value');
  }
  if (req.body.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(req.body.priority)) {
    errors.push('Invalid priority value');
  }
  if (req.body.dueDate && req.body.dueDate !== null && isNaN(new Date(req.body.dueDate).getTime())) {
    errors.push('Invalid due date');
  }
  if (req.body.assignedTo !== undefined && req.body.assignedTo !== null && !mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
    errors.push('Invalid assignedTo user ID');
  }
  if (req.body.project !== undefined && req.body.project !== null && !mongoose.Types.ObjectId.isValid(req.body.project)) {
    errors.push('Invalid project ID');
  }
  if (req.body.reminderAt !== undefined && req.body.reminderAt !== null && isNaN(new Date(req.body.reminderAt).getTime())) {
    errors.push('Invalid reminder date');
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

module.exports = { validateCreateTask, validateUpdateTask };
