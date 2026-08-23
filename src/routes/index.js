const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const taskRoutes = require('./taskRoutes');
const projectRoutes = require('./projectRoutes');
const teamRoutes = require('./teamRoutes');
const commentRoutes = require('./commentRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
const attachmentRoutes = require('./attachmentRoutes');
const activityRoutes = require('./activityRoutes');

const { checkDBHealth } = require('../config/database');
const env = require('../config/env');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/projects', projectRoutes);
router.use('/teams', teamRoutes);
router.use('/comments', commentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/activity', activityRoutes);
router.use('/admin', adminRoutes);

// Health check endpoints
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'taskflow',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', (req, res) => {
  const dbHealth = checkDBHealth();
  if (dbHealth.connected) {
    res.json({
      success: true,
      status: 'ready',
      service: 'taskflow',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      success: false,
      status: 'not ready',
      service: 'taskflow',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
