const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

let io = null;

/**
 * Initialize Socket.IO on an HTTP server
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  // JWT auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join user-specific room for targeted notifications
    socket.join(`user:${socket.userId}`);

    if (env.NODE_ENV !== 'test') {
      console.log(`[Socket] User ${socket.userId} connected`);
    }

    // Join project rooms
    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // Join task rooms
    socket.on('join:task', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('leave:task', (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on('disconnect', () => {
      if (env.NODE_ENV !== 'test') {
        console.log(`[Socket] User ${socket.userId} disconnected`);
      }
    });
  });

  if (env.NODE_ENV !== 'test') {
    console.log('[Socket] Socket.IO initialized');
  }

  return io;
};

/**
 * Get the Socket.IO instance
 */
const getIO = () => {
  return io;
};

/**
 * Emit to a specific user
 */
const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emit to a project room
 */
const emitToProject = (projectId, event, data) => {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
};

/**
 * Emit to a task room
 */
const emitToTask = (taskId, event, data) => {
  if (!io) return;
  io.to(`task:${taskId}`).emit(event, data);
};

/**
 * Broadcast to all connected users
 */
const broadcast = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser, emitToProject, emitToTask, broadcast };
