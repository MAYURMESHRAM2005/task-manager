const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    // Polymorphic reference
    entityType: {
      type: String,
      enum: ['Task', 'Project'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityType',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

attachmentSchema.index({ entityType: 1, entityId: 1 });
attachmentSchema.index({ uploadedBy: 1 });

attachmentSchema.methods.toJSON = function () {
  const attachment = this.toObject();
  delete attachment.__v;
  delete attachment.path;
  return attachment;
};

const Attachment = mongoose.model('Attachment', attachmentSchema);

module.exports = Attachment;
