# ⚡ TaskFlow - Task Management & Productivity Platform

### Advanced Software Lab Experiment No. 20

**Mini Project: Design, Develop, Containerize, and Deploy a Production-Level Full-Stack Application using Node.js, GitHub Copilot, MongoDB Atlas, Docker, Jenkins, GitHub, and VS Code**

---

## 📌 Problem Statement

Modern teams need efficient tools to manage tasks, track progress, and collaborate effectively. TaskFlow addresses this by providing a full-featured task management platform with role-based access, project organization, team collaboration, and real-time notifications — all built with production-grade technologies and a complete DevOps pipeline.

## 🎯 Aim

Design, develop, containerize, test, and deploy a production-level full-stack Task Management and Productivity Platform using Node.js and Express.js with MongoDB Atlas as the cloud database, Docker for containerization, GitHub for version control, Jenkins for CI/CD automation, and VS Code with GitHub Copilot for development.

## 🎯 Objectives

1. Build a secure RESTful API with JWT authentication and role-based access control
2. Create a responsive frontend using HTML, CSS, and vanilla JavaScript
3. Implement MongoDB Atlas cloud database with Mongoose ODM
4. Support task, project, team, and comment management
5. Implement notifications, activity logging, and admin controls
6. Write automated tests with Jest and Supertest
7. Containerize using Docker multi-stage builds
8. Set up Jenkins CI/CD pipeline with GitHub webhooks
9. Deploy with Nginx reverse proxy on Ubuntu

---

## ✨ Features

- 🔐 JWT authentication with refresh tokens
- 👥 Role-based access control (User, Manager, Admin)
- ✅ Full task CRUD with status, priority, due dates, categories
- 📁 Project management with member collaboration
- 👥 Team management
- 💬 Task comments and discussions
- 🔔 In-app notification system
- 📊 Dashboard with Chart.js analytics
- 🔍 Advanced search and filtering
- 📄 Server-side pagination
- 🛡️ Admin panel with user management and audit logs
- 🌓 Dark/Light mode toggle
- 📱 Fully responsive design
- 🐳 Docker containerized deployment
- ⚙️ Jenkins CI/CD pipeline
- 🔒 Security: Helmet, CORS, rate limiting, input validation

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Cloud), Mongoose ODM |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Testing | Jest, Supertest |
| Code Quality | ESLint, Prettier |
| Containerization | Docker, Docker Compose |
| Reverse Proxy | Nginx |
| CI/CD | Jenkins (Declarative Pipeline) |
| Version Control | Git, GitHub |
| IDE | VS Code with GitHub Copilot |
| OS | Ubuntu Linux |

---

## 🏗 System Architecture

```
                         USER
                          |
                          v
                 +----------------+
                 |   Frontend     |
                 | HTML/CSS/JS    |
                 +----------------+
                          |
                       REST API
                          |
                          v
                 +----------------+
                 | Nginx          |
                 | Reverse Proxy  |
                 +----------------+
                          |
                          v
                 +----------------+
                 | Node.js        |
                 | Express.js     |
                 +----------------+
                          |
              +-----------+-----------+
              |                       |
              v                       v
        Authentication          Application Logic
        JWT + bcrypt             Tasks/Projects
                                  Teams/Comments
                                      |
                                      v
                             +----------------+
                             | MongoDB Atlas  |
                             +----------------+

GitHub
   |
   | Push
   v
Jenkins
   |
   +--> Checkout
   |
   +--> Install
   |
   +--> Lint
   |
   +--> Test
   |
   +--> Security
   |
   +--> Docker Build
   |
   +--> Deploy
   |
   +--> Health Check
   |
   v
Ubuntu Production Server
```

---

## 📁 Project Structure

```
taskflow/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB Atlas connection
│   │   └── env.js               # Environment configuration
│   ├── controllers/
│   │   ├── authController.js    # Auth endpoints
│   │   ├── userController.js    # User profile
│   │   ├── taskController.js    # Task CRUD
│   │   ├── projectController.js # Project management
│   │   ├── teamController.js    # Team management
│   │   ├── commentController.js # Task comments
│   │   ├── notificationController.js
│   │   └── adminController.js   # Admin operations
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── role.js              # RBAC middleware
│   │   ├── errorHandler.js      # Centralized errors
│   │   ├── rateLimiter.js       # Rate limiting
│   │   └── validation.js        # Request validation
│   ├── models/
│   │   ├── User.js, Task.js, Project.js
│   │   ├── Team.js, Comment.js
│   │   ├── Notification.js, ActivityLog.js
│   │   └── RefreshToken.js
│   ├── routes/
│   │   ├── authRoutes.js, userRoutes.js
│   │   ├── taskRoutes.js, projectRoutes.js
│   │   ├── teamRoutes.js, commentRoutes.js
│   │   ├── notificationRoutes.js, adminRoutes.js
│   │   └── index.js
│   ├── services/
│   │   ├── authService.js, taskService.js
│   │   ├── projectService.js
│   │   ├── notificationService.js, auditService.js
│   ├── validators/
│   ├── scripts/seed.js
│   ├── app.js
│   └── server.js
├── public/
│   ├── css/style.css
│   ├── js/api.js
│   └── *.html (11 pages)
├── tests/
│   ├── setup.js
│   └── app.test.js
├── Dockerfile, docker-compose.yml
├── nginx.conf, Jenkinsfile
├── .env.example, .gitignore, .dockerignore
└── README.md
```

---

## 📡 API Documentation

### Base URL: `/api/v1`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get profile |
| PUT | `/users/me` | Update profile |
| PUT | `/users/me/password` | Change password |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | List tasks (with filters & pagination) |
| POST | `/tasks` | Create task |
| GET | `/tasks/:id` | Get task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| PATCH | `/tasks/:id/status` | Update status |
| PATCH | `/tasks/:id/assign` | Assign task |
| GET | `/tasks/dashboard/stats` | Dashboard statistics |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/members` | Add member |
| DELETE | `/projects/:id/members/:userId` | Remove member |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams` | List teams |
| POST | `/teams` | Create team |
| GET | `/teams/:id` | Get team |
| PUT | `/teams/:id` | Update team |
| DELETE | `/teams/:id` | Delete team |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks/:id/comments` | List comments |
| POST | `/tasks/:id/comments` | Add comment |
| PUT | `/comments/:id` | Edit comment |
| DELETE | `/comments/:id` | Delete comment |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark read |
| PATCH | `/notifications/read-all` | Mark all read |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/:id/status` | Activate/deactivate |
| PATCH | `/admin/users/:id/role` | Change role |
| GET | `/admin/audit-logs` | Audit logs |
| GET | `/admin/statistics` | System statistics |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Application health |
| GET | `/ready` | Database readiness |

---

## 🔧 Environment Variables

See `.env.example`. Required:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskflow
JWT_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=another_long_random_secret
```

---

## 🚀 Local Installation

```bash
# Verify tools
node --version    # v18+ required
npm --version
git --version
docker --version
docker compose version

# Clone and setup
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow
cp .env.example .env  # Edit with your MongoDB Atlas URI
npm install

# Seed demo data (optional)
npm run seed

# Start development
npm run dev
```

Access at **http://localhost:3000**

### Test Accounts (after seeding)
- Admin: `admin@taskflow.com` / `admin123`
- Manager: `manager@taskflow.com` / `manager123`
- User: `john@taskflow.com` / `john123`

---

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:coverage  # With coverage report
```

---

## 🐳 Docker

```bash
# Build and run
docker compose up --build

# Or manual
docker build -t taskflow .
docker run -d -p 3000:3000 --name taskflow taskflow

# Check
docker ps
docker logs taskflow

# Stop
docker stop taskflow && docker rm taskflow
docker compose down
```

**Note:** MongoDB is hosted on MongoDB Atlas (cloud). No MongoDB container is created.

---

## ⚙️ Jenkins CI/CD

### Pipeline Stages
```
Checkout → Install → Lint → Test → Coverage → Security → Docker Build → Deploy → Health Check
```

### Setup
1. Install Jenkins on Ubuntu
2. Create Pipeline job pointing to GitHub repo
3. Configure webhook for auto-trigger on push
4. For local Jenkins, use `ngrok http 8080`

### GitHub Webhook
```
GitHub → Settings → Webhooks → Add webhook
URL: http://YOUR_JENKINS_URL/github-webhook/
Content type: application/json
Events: Push
```

---

## 🔗 Nginx Configuration

Architecture: `Internet → Nginx(:80) → TaskFlow(:3000) → MongoDB Atlas`

Nginx provides: reverse proxy, security headers, gzip compression, static caching, request limits.

---

## 🛡 Security

- Helmet for HTTP headers
- CORS configuration
- Rate limiting on all APIs (stricter for auth)
- bcrypt password hashing (12 rounds)
- JWT with refresh token rotation
- Input validation on all endpoints
- Role-based access control
- Non-root Docker user
- Environment variables for secrets
- `.env` not committed to Git

---

## 🔄 Backup & Recovery

MongoDB Atlas provides:
- Automated backups (continuous)
- Point-in-time recovery
- Manual: `mongodump` / `mongorestore`

---

## 📊 Monitoring

- `/health` and `/ready` endpoints
- Docker health checks
- Jenkins post-deployment verification
- Future: Prometheus + Grafana, ELK stack

---

## 📸 Screenshots to Capture

1. VS Code project structure
2. Frontend login page
3. Registration page
4. Dashboard with charts
5. Task management page
6. Create task modal
7. Edit task
8. Project management
9. Team management
10. MongoDB Atlas cluster dashboard
11. MongoDB Atlas collections
12. API response (Postman/curl)
13. Docker image build
14. Running Docker container
15. Docker logs
16. Jenkins pipeline
17. Jenkins successful build
18. GitHub repository
19. GitHub webhook configuration
20. Deployed application in browser
21. Health endpoint response
22. Mobile responsive UI
23. Dark mode toggle

---

## 🏫 Lab Documentation

### Experiment No. 20
### Title: TaskFlow - Full-Stack Task Management Application

### Theory
**Node.js** is a server-side JavaScript runtime built on Chrome's V8 engine, enabling non-blocking I/O operations. **Express.js** is a minimal web framework for building REST APIs. **MongoDB Atlas** is a cloud-hosted NoSQL database service providing scalable document storage with automatic backups. **Mongoose** is an ODM (Object Document Modeling) library that provides schema-based modeling for MongoDB.

**JWT (JSON Web Tokens)** provide stateless authentication by encoding user claims in signed tokens. **bcrypt** provides secure password hashing. **Docker** enables containerization — packaging applications with dependencies for consistent deployment. **Jenkins** automates CI/CD pipelines triggered by GitHub webhooks.

### Software Requirements
Ubuntu 22.04 LTS, VS Code, Node.js v20.x, Docker Engine, Jenkins, Git, GitHub account, MongoDB Atlas account

### Hardware Requirements
Minimum 4GB RAM, 10GB disk space, Dual-core processor

### Procedure
1. Set up Node.js project with Express.js and MongoDB Atlas
2. Create Mongoose models for User, Task, Project, Team, Comment, Notification
3. Implement JWT authentication with role-based access control
4. Build REST API with controllers, services, and middleware
5. Create responsive frontend with HTML/CSS/JavaScript
6. Write automated tests with Jest and Supertest
7. Containerize with Docker multi-stage builds
8. Configure Nginx as reverse proxy
9. Set up Jenkins CI/CD pipeline
10. Configure GitHub webhooks for automated deployment

### Expected Output
The TaskFlow application runs at http://localhost:3000 with full functionality: user registration, login, task CRUD, project management, team collaboration, notifications, dashboard analytics, and admin controls. All tests pass, Docker container runs successfully, and Jenkins pipeline completes all stages.

### Result
The TaskFlow full-stack application was successfully designed, developed, containerized, tested, and deployed using the complete modern DevOps lifecycle.

### Precautions
- MongoDB Atlas URI must be correctly configured
- JWT secrets must be strong and unique
- Port 3000 must be available
- Docker daemon must be running
- Jenkins must have Docker permissions

---

## 🔮 Future Enhancements

- Real-time updates with WebSockets
- File attachments on tasks
- Email notifications
- Task dependencies and Gantt charts
- Time tracking and reporting
- Mobile app (React Native)
- Kubernetes deployment
- Prometheus + Grafana monitoring

---

## 📝 Viva Questions & Answers

**Q1: What is TaskFlow?**
A: TaskFlow is a full-stack task management and productivity platform that allows users to create, manage, and collaborate on tasks within projects and teams.

**Q2: Why use Node.js?**
A: Node.js uses non-blocking, event-driven I/O making it efficient for building scalable network applications. Its JavaScript runtime allows code sharing between frontend and backend.

**Q3: Why Express.js?**
A: Express.js provides a minimal, flexible framework for building REST APIs with middleware support, routing, and error handling.

**Q4: Why MongoDB Atlas instead of local MongoDB?**
A: MongoDB Atlas provides automated backups, scaling, monitoring, and high availability without managing server infrastructure.

**Q5: What is Mongoose?**
A: Mongoose is an ODM library that provides schema-based modeling for MongoDB, enabling data validation, type casting, and business logic hooks.

**Q6: What is JWT?**
A: JSON Web Tokens are compact, URL-safe tokens for securely transmitting information between parties. They contain encoded claims and are signed with a secret.

**Q7: What is a refresh token?**
A: A refresh token is a long-lived token used to obtain new access tokens without re-authenticating, improving security by limiting access token lifetime.

**Q8: What is role-based access control?**
A: RBAC restricts system access based on user roles. In TaskFlow, User, Manager, and Admin roles have different permissions.

**Q9: What is bcrypt?**
A: bcrypt is a password hashing function designed to be slow and computationally expensive, making brute-force attacks impractical.

**Q10: What is middleware?**
A: Middleware functions execute during the request-response cycle, performing tasks like authentication, logging, validation, and error handling.

**Q11: What is a REST API?**
A: REST (Representational State Transfer) is an architectural style using HTTP methods (GET, POST, PUT, DELETE) for resource-based communication.

**Q12: What is Docker?**
A: Docker packages applications into containers with their dependencies, ensuring consistent behavior across development, testing, and production environments.

**Q13: What is a Docker image vs container?**
A: An image is a read-only template with application code and dependencies. A container is a running instance of an image.

**Q14: Why use Docker multi-stage builds?**
A: Multi-stage builds reduce final image size by separating build dependencies from production runtime, improving security and deployment speed.

**Q15: Why is MongoDB not in Docker Compose?**
A: MongoDB is hosted on MongoDB Atlas (cloud), providing managed backups, scaling, and monitoring. No local database container is needed.

**Q16: What is Jenkins?**
A: Jenkins is an open-source automation server for building CI/CD pipelines that automate build, test, and deployment processes.

**Q17: What is CI/CD?**
A: Continuous Integration automatically builds and tests code changes. Continuous Deployment automatically deploys validated changes to production.

**Q18: What is a GitHub webhook?**
A: A webhook sends HTTP POST payloads to a specified URL when events (like push) occur in a repository, enabling automated CI/CD triggers.

**Q19: What is Nginx?**
A: Nginx is a high-performance web server used as a reverse proxy, handling load balancing, static file serving, SSL termination, and security headers.

**Q20: What is a reverse proxy?**
A: A reverse proxy sits between clients and servers, forwarding client requests to backend servers and returning responses, providing load balancing and security.

**Q21: What is rate limiting?**
A: Rate limiting restricts the number of requests a client can make within a time window, protecting against abuse and DDoS attacks.

**Q22: What is Helmet?**
A: Helmet is Express middleware that sets security-related HTTP headers (X-Frame-Options, CSP, etc.) to protect against common web vulnerabilities.

**Q23: What is CORS?**
A: Cross-Origin Resource Sharing is a mechanism that allows restricted resources to be requested from another domain, controlled by HTTP headers.

**Q24: What is API versioning?**
A: API versioning (e.g., /api/v1) allows multiple API versions to coexist, enabling backward-compatible changes without breaking existing clients.

**Q25: Why use environment variables?**
A: Environment variables separate configuration from code, allowing different settings per environment (development, test, production) without code changes.

**Q26: Why should .env not be uploaded to GitHub?**
A: .env files contain secrets (database passwords, JWT keys). Committing them exposes credentials to anyone with repository access.

**Q27: What is MongoDB indexing?**
A: Indexes are data structures that improve query performance by allowing MongoDB to locate documents without scanning entire collections.

**Q28: What is database backup?**
A: Database backup creates copies of data for recovery. MongoDB Atlas provides automated backups with point-in-time recovery.

**Q29: What is /health?**
A: A health endpoint verifies the application process is running and responding to requests.

**Q30: What is /ready?**
A: A readiness endpoint verifies the application and its dependencies (database) are operational and ready to handle requests.

**Q31: How does Jenkins verify deployment?**
A: Jenkins calls /health and /ready endpoints after deployment, verifying both application process and database connectivity.

**Q32: How would you rollback a failed deployment?**
A: Docker image versioning allows rollback by stopping the current container and starting a previous version: `docker run -d taskflow:build-14`.

**Q33: What is Docker image versioning?**
A: Tagging images with build numbers or commit SHAs (e.g., taskflow:build-15, taskflow:a83f91c) enables tracking, rollback, and deployment management.

**Q34: What is MongoDB Atlas network access?**
A: Atlas IP allowlisting controls which IP addresses can connect. Use 0.0.0.0/0 for testing, restrict to server IP in production.

**Q35: How would you scale this project?**
A: Add MongoDB Atlas M10+ for scaling, implement caching with Redis, use PM2 for cluster mode, and deploy with Kubernetes for horizontal scaling.

**Q36: What is the difference between 401 and 403?**
A: 401 Unauthorized means authentication is required or failed. 403 Forbidden means authenticated but insufficient permissions.

**Q37: What is the difference between PUT and PATCH?**
A: PUT replaces the entire resource. PATCH partially updates specific fields.

**Q38: What is input validation?**
A: Input validation checks user-provided data for correctness (type, length, format) before processing, preventing invalid data and security vulnerabilities.

**Q39: What is an audit log?**
A: An audit log records user actions (login, create, update, delete) with timestamps and details for security monitoring and compliance.

**Q40: How can this project be cloud-deployed?**
A: Deploy to AWS EC2/ECS, Azure App Service, or Google Cloud Run with MongoDB Atlas. Use Docker + Nginx + Jenkins for CI/CD automation.

---

## 📄 License

MIT License — Free to use for educational purposes.

---

> Built for Advanced Software Lab Experiment No. 20
