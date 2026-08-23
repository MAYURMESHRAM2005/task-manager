const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task reference is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ task: 1 });
commentSchema.index({ user: 1 });
commentSchema.index({ task: 1, createdAt: -1 });

commentSchema.methods.toJSON = function () {
  const comment = this.toObject();
  delete comment.__v;
  return comment;
};

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
