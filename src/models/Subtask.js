const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Subtask title is required'],
      trim: true,
      maxlength: [200, 'Subtask title cannot exceed 200 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    position: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

subtaskSchema.index({ task: 1 });
subtaskSchema.index({ task: 1, position: 1 });

subtaskSchema.pre('save', function (next) {
  if (this.isModified('completed')) {
    this.completedAt = this.completed ? new Date() : null;
  }
  next();
});

subtaskSchema.methods.toJSON = function () {
  const subtask = this.toObject();
  delete subtask.__v;
  return subtask;
};

const Subtask = mongoose.model('Subtask', subtaskSchema);

module.exports = Subtask;
