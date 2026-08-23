const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const { parseMentions, resolveMentions, notifyMentions } = require('../services/mentionService');
const { emitToUser, emitToTask } = require('../services/socketService');

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
      .populate('mentions', 'name email avatar')
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

    // Parse @mentions from content
    const mentionUsernames = parseMentions(req.body.content);
    let mentionedUsers = [];
    if (mentionUsernames.length > 0) {
      mentionedUsers = await resolveMentions(mentionUsernames);
    }

    const comment = await Comment.create({
      task: req.params.id,
      user: req.user._id,
      content: req.body.content,
      mentions: mentionedUsers.map((u) => u._id),
    });

    await comment.populate('user', 'name email avatar');
    await comment.populate('mentions', 'name email avatar');

    // Notify task creator and assignee (non-mention notifications)
    const notifyUsers = new Set();
    if (task.createdBy.toString() !== req.user._id.toString()) {
      notifyUsers.add(task.createdBy.toString());
    }
    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      notifyUsers.add(task.assignedTo.toString());
    }

    for (const userId of notifyUsers) {
      const notification = await Notification.create({
        user: userId,
        type: 'COMMENT_ADDED',
        message: `New comment on task "${task.title}" by ${req.user.name}`,
        relatedEntity: { type: 'Task', id: task._id },
      });

      emitToUser(userId, 'notification', {
        type: 'COMMENT_ADDED',
        message: notification.message,
        taskId: task._id,
        comment: { _id: comment._id, content: comment.content, user: comment.user },
        timestamp: notification.createdAt,
      });
    }

    // Notify @mentioned users
    if (mentionedUsers.length > 0) {
      await notifyMentions(mentionedUsers, {
        entityType: 'Task',
        entityId: task._id,
        entityTitle: task.title,
        actorId: req.user._id,
        actorName: req.user.name,
      });
    }

    // Broadcast new comment to task room
    emitToTask(req.params.id, 'task:comment', {
      taskId: req.params.id,
      comment,
    });

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

    // Parse new mentions
    const mentionUsernames = parseMentions(req.body.content);
    let mentionedUsers = [];
    if (mentionUsernames.length > 0) {
      mentionedUsers = await resolveMentions(mentionUsernames);
    }

    comment.content = req.body.content;
    comment.mentions = mentionedUsers.map((u) => u._id);
    await comment.save();
    await comment.populate('user', 'name email avatar');
    await comment.populate('mentions', 'name email avatar');

    // Notify new mentions
    if (mentionedUsers.length > 0) {
      const task = await Task.findById(comment.task);
      if (task) {
        await notifyMentions(mentionedUsers, {
          entityType: 'Task',
          entityId: task._id,
          entityTitle: task.title,
          actorId: req.user._id,
          actorName: req.user.name,
        });
      }
    }

    // Broadcast update to task room
    emitToTask(comment.task.toString(), 'task:comment:updated', {
      taskId: comment.task.toString(),
      comment,
    });

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

    const taskId = comment.task.toString();
    await Comment.findByIdAndDelete(req.params.id);

    // Broadcast deletion to task room
    emitToTask(taskId, 'task:comment:deleted', {
      taskId,
      commentId: req.params.id,
    });

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
