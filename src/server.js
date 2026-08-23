const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { initSocket } = require('./services/socketService');
const { startReminderScheduler, stopReminderScheduler } = require('./services/reminderScheduler');
const { startRecurringScheduler, stopRecurringScheduler } = require('./services/recurringTaskScheduler');
const { startDueDateScheduler, stopDueDateScheduler } = require('./services/dueDateScheduler');
const env = require('./config/env');

const PORT = env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB Atlas
    await connectDB();

    // Create HTTP server and attach Socket.IO
    const server = http.createServer(app);
    initSocket(server);

    // Start Express server
    server.listen(PORT, () => {
      if (env.NODE_ENV !== 'test') {
        console.log(`TaskFlow server running on port ${PORT}`);
        console.log(`Environment: ${env.NODE_ENV}`);
        console.log(`API: http://localhost:${PORT}/api/v1`);
        console.log(`Health: http://localhost:${PORT}/api/v1/health`);
        console.log(`Socket.IO: ws://localhost:${PORT}/socket.io`);
      }
    });

    // Start schedulers
    startReminderScheduler();
    startRecurringScheduler();
    startDueDateScheduler();

    // Graceful shutdown
    const shutdown = async (signal) => {
      if (env.NODE_ENV !== 'test') {
        console.log(`\n${signal} received. Shutting down gracefully...`);
      }
      server.close(async () => {
        stopReminderScheduler();
        stopRecurringScheduler();
        stopDueDateScheduler();
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
