const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/v1/tasks/:id/comments
 */
const getComments = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
    }

    const comments = await Comment.find({ task: req.params.id })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Comments retrieved successfully',
      data: { comments },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/tasks/:id/comments
 */
const createComment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      throw new AppError('Task not found.', 404, 'TASK_NOT_FOUND');
    }

    const comment = await Comment.create({
      task: req.params.id,
      user: req.user._id,
      content: req.body.content,
    });

    await comment.populate('user', 'name email avatar');

    // Notify task creator and assignee
    const notifyUsers = new Set();
    if (task.createdBy.toString() !== req.user._id.toString()) {
      notifyUsers.add(task.createdBy.toString());
    }
    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      notifyUsers.add(task.assignedTo.toString());
    }

    for (const userId of notifyUsers) {
      await Notification.create({
        user: userId,
        type: 'COMMENT_ADDED',
        message: `New comment on task "${task.title}" by ${req.user.name}`,
        relatedEntity: { type: 'Task', id: task._id },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/comments/:id
 */
const updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      throw new AppError('Comment not found.', 404, 'COMMENT_NOT_FOUND');
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      throw new AppError('You can only edit your own comments.', 403, 'NOT_AUTHORIZED');
    }

    comment.content = req.body.content;
    await comment.save();
    await comment.populate('user', 'name email avatar');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/comments/:id
 */
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      throw new AppError('Comment not found.', 404, 'COMMENT_NOT_FOUND');
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      throw new AppError('You can only delete your own comments.', 403, 'NOT_AUTHORIZED');
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Comment deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getComments, createComment, updateComment, deleteComment };
