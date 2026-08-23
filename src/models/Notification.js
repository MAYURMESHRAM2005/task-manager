const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    type: {
      type: String,
      enum: [        'TASK_ASSIGNED', 'TASK_REASSIGNED', 'TASK_COMPLETED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'TASK_REMINDER', 'PROJECT_MEMBER_ADDED', 'TEAM_INVITATION', 'COMMENT_ADDED', 'ROLE_CHANGED', 'ACCOUNT_DEACTIVATED',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedEntity: {
      type: {
        type: String,
        enum: ['Task', 'Project', 'Team', 'User'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });

notificationSchema.methods.toJSON = function () {
  const notification = this.toObject();
  delete notification.__v;
  return notification;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
