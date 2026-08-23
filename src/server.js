const app = require('./app');
const { connectDB } = require('./config/database');
const { startReminderScheduler, stopReminderScheduler } = require('./services/reminderScheduler');
const env = require('./config/env');

const PORT = env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB Atlas
    await connectDB();

    // Start Express server
    const server = app.listen(PORT, () => {
      if (env.NODE_ENV !== 'test') {
        console.log(`TaskFlow server running on port ${PORT}`);
        console.log(`Environment: ${env.NODE_ENV}`);
        console.log(`API: http://localhost:${PORT}/api/v1`);
        console.log(`Health: http://localhost:${PORT}/api/v1/health`);
        console.log(`Ready: http://localhost:${PORT}/api/v1/ready`);
      }
    });

    // Start reminder scheduler
    startReminderScheduler();

    // Graceful shutdown
    const shutdown = async (signal) => {
      if (env.NODE_ENV !== 'test') {
        console.log(`\n${signal} received. Shutting down gracefully...`);
      }
      server.close(async () => {
        stopReminderScheduler();
        const { disconnectDB } = require('./config/database');
        await disconnectDB();
        if (env.NODE_ENV !== 'test') {
          console.log('Server closed.');
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      if (env.NODE_ENV !== 'test') {
        console.error('Unhandled Rejection:', err.message);
      }
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
