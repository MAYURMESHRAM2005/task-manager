const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project owner is required'],
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['OWNER', 'MANAGER', 'MEMBER'],
          default: 'MEMBER',
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'PLANNED',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ name: 'text', description: 'text' });

projectSchema.methods.toJSON = function () {
  const project = this.toObject();
  delete project.__v;
  return project;
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
