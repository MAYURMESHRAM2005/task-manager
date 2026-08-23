const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Attachment = require('../models/Attachment');
const { AppError } = require('../middleware/errorHandler');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv',
    'application/zip',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('File type not allowed', 400, 'INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Upload attachment for an entity (task or project)
 */
const uploadAttachment = async (file, entityType, entityId, userId) => {
  const attachment = await Attachment.create({
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    entityType,
    entityId,
    uploadedBy: userId,
  });

  return attachment;
};

/**
 * Get attachments for an entity
 */
const getAttachments = async (entityType, entityId) => {
  const attachments = await Attachment.find({ entityType, entityId })
    .populate('uploadedBy', 'name avatar')
    .sort({ createdAt: -1 });

  return attachments;
};

/**
 * Delete an attachment
 */
const deleteAttachment = async (attachmentId, userId) => {
  const attachment = await Attachment.findById(attachmentId);
  if (!attachment) {
    throw new AppError('Attachment not found.', 404, 'ATTACHMENT_NOT_FOUND');
  }

  // Delete file from disk
  const filePath = path.join(__dirname, '../../uploads', attachment.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await Attachment.findByIdAndDelete(attachmentId);
  return { message: 'Attachment deleted successfully' };
};

module.exports = { upload, uploadAttachment, getAttachments, deleteAttachment };
