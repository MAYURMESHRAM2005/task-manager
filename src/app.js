const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const apiRoutes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const env = require('./config/env');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS
app.use(cors({
  origin: env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── General Middleware ─────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging (skip in test)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── Rate Limiting (skip in test) ────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use('/api/', apiLimiter);
}

// ─── Static Files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// Serve frontend pages
const publicDir = path.join(__dirname, '../public');
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(publicDir, 'register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(publicDir, 'dashboard.html')));
app.get('/tasks', (req, res) => res.sendFile(path.join(publicDir, 'tasks.html')));
app.get('/projects', (req, res) => res.sendFile(path.join(publicDir, 'projects.html')));
app.get('/teams', (req, res) => res.sendFile(path.join(publicDir, 'teams.html')));
app.get('/notifications', (req, res) => res.sendFile(path.join(publicDir, 'notifications.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(publicDir, 'profile.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(publicDir, 'settings.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    error: { code: 'ROUTE_NOT_FOUND' },
  });
});

// 404 handler for unknown page routes - serve SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
