const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const attachmentService = require('../services/attachmentService');
const { logActivity } = require('../services/activityService');
const { emitToUser, emitToProject, emitToTask } = require('../services/socketService');

/**
 * POST /api/v1/attachments/:entityType/:entityId — upload file
 */
router.post('/:entityType/:entityId', authenticate, validateObjectId('entityId'), (req, res, next) => {
  const uploadSingle = attachmentService.upload.single('file');
  uploadSingle(req, res, async (err) => {
    if (err) {
      if (err instanceof require('multer').MulterError) {
        return res.status(400).json({ success: false, message: err.message, error: { code: 'UPLOAD_ERROR' } });
      }
      return next(err);
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded', error: { code: 'NO_FILE' } });
    }

    try {
      const { entityType, entityId } = req.params;
      if (!['Task', 'Project'].includes(entityType)) {
        return res.status(400).json({ success: false, message: 'Invalid entity type' });
      }

      const attachment = await attachmentService.uploadAttachment(req.file, entityType, entityId, req.user._id);

      await logActivity({
        userId: req.user._id,
        action: 'FILE_UPLOADED',
        entity: entityType,
        entityId,
        description: `Uploaded file: ${req.file.originalname}`,
        projectId: entityType === 'Project' ? entityId : undefined,
      });

      // Real-time notification
      if (entityType === 'Task') {
        emitToTask(entityId, 'task:attachment', { taskId: entityId, attachment });
      } else {
        emitToProject(entityId, 'project:attachment', { projectId: entityId, attachment });
      }

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: { attachment },
      });
    } catch (error) {
      next(error);
    }
  });
});

/**
 * GET /api/v1/attachments/:entityType/:entityId — list attachments
 */
router.get('/:entityType/:entityId', authenticate, validateObjectId('entityId'), async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const attachments = await attachmentService.getAttachments(entityType, entityId);
    res.json({
      success: true,
      message: 'Attachments retrieved successfully',
      data: attachments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/attachments/:id — delete attachment
 */
router.delete('/:id', authenticate, validateObjectId('id'), async (req, res, next) => {
  try {
    const result = await attachmentService.deleteAttachment(req.params.id, req.user._id);
    res.json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
