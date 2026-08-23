const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team owner is required'],
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
  },
  {
    timestamps: true,
  }
);

teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });

teamSchema.methods.toJSON = function () {
  const team = this.toObject();
  delete team.__v;
  return team;
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
