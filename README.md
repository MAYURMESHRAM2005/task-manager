# ⚡ TaskFlow

A full-stack task management and productivity platform built with Node.js, Express.js, and MongoDB Atlas.

**Live:** [taskflow-nll5.onrender.com](https://taskflow-nll5.onrender.com)

## Features

- 🔐 JWT authentication with refresh token rotation
- 👥 Role-based access (User / Manager / Admin)
- ✅ Task CRUD with status, priority, due dates, categories
- 📁 Project and team management
- 💬 Task comments
- 🔔 Real-time notifications (Socket.IO)
- 📊 Dashboard with Chart.js analytics
- 📅 Calendar view and Kanban board
- 🛡️ Admin panel with audit logs
- 🌓 Dark/Light mode
- 📱 Responsive design with PWA support (installable)
- 🐳 Docker containerized

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, JavaScript, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT + bcryptjs |
| Real-time | Socket.IO |
| Testing | Jest, Supertest |
| Container | Docker (multi-stage) |
| CI/CD | Jenkins |
| PWA | Service Worker, Web Manifest |

## Quick Start

```bash
git clone https://github.com/tusharmendhule/tasks-taskflow.git
cd tasks-taskflow
cp .env.example .env   # configure MongoDB URI and JWT secrets
npm install
npm run seed            # optional: load demo data
npm run dev             # http://localhost:3000
```

### Test Accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@taskflow.com | admin123 |
| Manager | manager@taskflow.com | manager123 |
| User | john@taskflow.com | john123 |

## Environment Variables

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskflow
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

## API

Base URL: `/api/v1`

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Users | `GET/PUT /users/me`, `PUT /users/me/password` |
| Tasks | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/:id`, `PATCH /tasks/:id/status` |
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/:id` |
| Teams | `GET/POST /teams`, `GET/PUT/DELETE /teams/:id` |
| Comments | `GET/POST /tasks/:id/comments`, `PUT/DELETE /comments/:id` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read` |
| Admin | `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/audit-logs` |
| Health | `GET /health`, `GET /ready` |

## Docker

```bash
docker compose up --build
```

## Testing

```bash
npm test
npm run test:coverage
```

## License

MIT
