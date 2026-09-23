# ⚡ TaskFlow

A full-stack task management and productivity platform.

The original application has been migrated from a **Node.js/Express + MongoDB** backend to a
**Java 17 / Spring Boot + Spring Data JPA (Hibernate) + MySQL** backend, and its multi-page
HTML/CSS/JS frontend has been converted to a **React 18 + Vite single-page app** that keeps the
original look and API contract.

## Architecture

```
React frontend (frontend/)             Java backend (backend/)
  React 18 + Vite (SPA) ── REST /api ──▶  Controller → Service → Repository
  react-router-dom                        Spring Security (JWT + BCrypt)
  Chart.js                               native WebSocket ── /ws ──▶ WebSocket handler
                                              │
                                              ▼
                                        Spring Data JPA / Hibernate
                                              │
                                              ▼
                                            MySQL
```

| Layer     | Before                          | After                                          |
|-----------|---------------------------------|------------------------------------------------|
| Frontend  | HTML/CSS/JS served by Express   | React 18 + Vite SPA, same UI and CSS           |
| Backend   | Node.js + Express.js            | Java 17 + Spring Boot 3                        |
| Data      | MongoDB + Mongoose              | MySQL + Spring Data JPA (Hibernate)            |
| Auth      | JWT + bcryptjs                  | JWT (jjwt) + BCrypt (strength 12)              |
| Real-time | Socket.IO                       | Native WebSocket at `/ws`                      |
| Build     | npm                             | Maven + Vite                                   |
| CI/CD     | —                               | Jenkins pipeline (`Jenkinsfile`)               |

## Requirements

- **Node.js 18+** (to build/run the React frontend)
- **Java 17+** (JDK 17 or newer; also builds on JDK 21/23)
- **MySQL 8+**
- **Maven 3.8+** — *optional*: the Maven Wrapper is checked in, so no global install is needed
- **Docker + Docker Compose** — *optional*, for the containerized setup
- **Jenkins** — *optional*, for the CI/CD pipeline

## Repository layout

```
tasks-taskflow/
├── frontend/          # React + Vite single-page application
│   ├── index.html     # Vite entry document
│   ├── vite.config.js # dev server + /api and /ws proxy to the backend
│   ├── public/        # css/style.css, icons/, manifest.json, sw.js
│   ├── src/
│   │   ├── main.jsx        # boot: theme, service worker, router, providers
│   │   ├── App.jsx         # routes
│   │   ├── config.js       # API/WebSocket URLs (VITE_* overridable)
│   │   ├── lib/            # api client, socket, toasts, theme, formatters
│   │   ├── context/        # AppProvider (user, unread count, logout)
│   │   ├── components/     # AppLayout, Sidebar, Topbar, Modal, ChartCanvas, ...
│   │   └── pages/          # Landing, Login, Dashboard, Tasks, Kanban, ...
│   ├── Dockerfile     # multi-stage: npm ci && npm run build, served by nginx
│   └── package.json
├── backend/           # Spring Boot application
│   ├── pom.xml
│   ├── mvnw, mvnw.cmd # Maven Wrapper (pinned Maven 3.9.9 in .mvn/)
│   ├── Dockerfile     # multi-stage: mvn package → JRE 17 runtime
│   └── src/main/java/com/taskflow/
│       ├── TaskflowApplication.java
│       ├── config/         # security, CORS, WebSocket, Jackson, seeder
│       ├── controller/     # REST controllers
│       ├── service/        # business logic (incl. TaskSchedulerService)
│       ├── repository/     # Spring Data JPA repositories
│       ├── entity/         # JPA entities + enums
│       ├── dto/request|response/
│       ├── exception/      # @RestControllerAdvice + typed exceptions
│       ├── security/       # JWT service, filter, entry point
│       ├── socket/         # WebSocket handler + session registry
│       └── util/
├── .env.example       # backend environment template (copy to .env)
├── docker-compose.yml # mysql + backend + frontend (nginx)
├── nginx.conf         # static assets + /api and /ws reverse proxy
├── Jenkinsfile        # CI/CD pipeline (build → test → image → deploy → health)
└── README.md
```

`.env`, `target/`, `dist/`, `node_modules/` and `*.log` are gitignored.

## 1. MySQL setup

Create the database (the backend can also create it automatically thanks to
`createDatabaseIfNotExist=true` in the JDBC URL):

```sql
CREATE DATABASE taskflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Tables are created/updated automatically by Hibernate (`spring.jpa.hibernate.ddl-auto=update`).

Configure the connection with environment variables (no passwords are hardcoded):

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=taskflow
DB_USERNAME=root
DB_PASSWORD=your_password
```

Copy [`.env.example`](.env.example) to `.env` and fill it in — Spring picks it up, and
`docker compose` reads the same file automatically.

## 2. Backend setup

```bash
cd backend
# set the environment variables above (or copy ../.env.example to ../.env)
./mvnw clean install
./mvnw spring-boot:run
```

The Maven Wrapper (`./mvnw`) is checked in, so **a global Maven install is not required** —
it downloads and caches the pinned Maven 3.9.9 on first use. On Windows use `mvnw.cmd` from
`cmd`/PowerShell, or `./mvnw` from Git Bash. If you already have Maven, plain `mvn` works too.

Backend URL: **http://localhost:8080**
Health check: **http://localhost:8080/api/v1/health**

Optional demo data (equivalent to the original `npm run seed`):

```bash
cd backend
APP_SEED_ENABLED=true ./mvnw spring-boot:run
```

Seed accounts: `admin@taskflow.com / admin123`, `manager@taskflow.com / manager123`,
`john@taskflow.com / john123`, `jane@taskflow.com / jane123`.

## 3. Frontend setup

```bash
cd frontend
npm install        # first run only
npm run dev        # Vite dev server with HMR
```

Frontend URL: **http://localhost:5173**

The dev server proxies `/api` and `/ws` to the backend (`BACKEND_ORIGIN`, default
`http://localhost:8080`), so the app runs same-origin in development exactly like it does
behind nginx in production. The URLs live in [`frontend/src/config.js`](frontend/src/config.js)
and can be overridden with environment variables:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
```

Leaving both unset uses the relative defaults (`/api/v1` and the page origin + `/ws`).

Production build:

```bash
npm run build      # emits frontend/dist
npm run preview    # serves dist on http://localhost:4173
```

## 4. Docker

```bash
cp .env.example .env    # set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
docker compose up --build
```

Or without a `.env` file:

```bash
DB_PASSWORD=taskflow docker compose up --build
```

This starts MySQL, the Spring Boot backend (port 8080) and an nginx container serving the
built React app (port 80). The frontend image runs `npm ci && npm run build` in a Node stage,
and `nginx.conf` proxies `/api` and `/ws` to the backend. Both containers have healthchecks
(the backend polls `/api/v1/health`, MySQL uses `mysqladmin ping`), and MySQL data persists
in the `mysql-data` volume.

## 5. CI/CD (Jenkins)

The [`Jenkinsfile`](Jenkinsfile) defines an 8-stage pipeline. Configure two tools in Jenkins
(`jdk17` and `maven3`) and a Docker-enabled agent:

| Stage | What it does |
|-------|--------------|
| Checkout | `checkout scm` |
| Backend Build | `mvn -B -DskipTests clean package` |
| Backend Tests | `mvn -B test`, results published via `junit` |
| Frontend Build | `npm ci && npm run build` |
| Build Docker Image | builds `taskflow-backend` and `taskflow-frontend`, tagged with build number, `latest` and the short commit |
| Deploy | replaces the running `taskflow-backend` container on port 8080 |
| Health Check | curls `/api/v1/health` and `/api/v1/ready` |
| Post-Deployment Verification | confirms the container is up and prints image tags |

On failure the pipeline stops and removes the backend container.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_PORT` | `8080` | Backend port |
| `APP_ENV` | `development` | Reported by `/health` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `3306` / `taskflow` | MySQL connection |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / *(empty)* | MySQL credentials |
| `DDL_AUTO` | `update` | Hibernate schema strategy |
| `SHOW_SQL` | `false` | Log SQL statements |
| `JWT_SECRET` | dev default | Access-token signing key |
| `JWT_REFRESH_SECRET` | dev default | Refresh-token signing key |
| `JWT_EXPIRES_IN` | `900000` | Access token TTL (ms) |
| `JWT_REFRESH_EXPIRES_IN` | `604800000` | Refresh token TTL (ms) |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:3000,http://localhost` | Allowed frontend origins |
| `UPLOAD_DIR` | `uploads` | Attachment storage directory |
| `APP_SEED_ENABLED` | `false` | Load demo data on startup |
| `BACKEND_ORIGIN` | `http://localhost:8080` | Vite dev/preview proxy target (frontend only) |
| `VITE_API_BASE_URL` | `/api/v1` | Absolute API base URL override (frontend only) |
| `VITE_WS_URL` | *(page origin)* `/ws` | Absolute WebSocket URL override (frontend only) |
| `PORT` | `5173` (dev) / `4173` (preview) | Vite server port |

## API

Base URL: `/api/v1` — the URLs, methods, request/response shapes and error codes are
preserved from the original application.

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Users | `GET /users`, `GET /users/me`, `PUT /users/me`, `PUT /users/me/password` |
| Tasks | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/:id`, `PATCH /tasks/:id/status`, `PATCH /tasks/:id/assign` |
| Kanban | `GET /tasks/kanban`, `PATCH /tasks/reorder` |
| Calendar | `GET /tasks/calendar` |
| Statistics | `GET /tasks/dashboard/stats` |
| Subtasks | `GET/POST /tasks/:id/subtasks`, `PUT/DELETE /tasks/subtasks/:subtaskId` |
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/:id`, `POST /projects/:id/members`, `DELETE /projects/:id/members/:userId` |
| Teams | `GET/POST /teams`, `GET/PUT/DELETE /teams/:id` |
| Comments | `GET/POST /tasks/:id/comments`, `PUT/DELETE /comments/:id` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Attachments | `POST/GET /attachments/:entityType/:entityId`, `DELETE /attachments/:id` |
| Activity | `GET /activity/project/:projectId`, `GET /activity/me` |
| Admin | `GET /admin/users`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/role`, `GET /admin/audit-logs`, `GET /admin/statistics` |
| Health | `GET /health`, `GET /ready` |

Every response uses the original envelope:

```json
{ "success": true, "message": "Tasks retrieved successfully", "data": [...], "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

Errors use:

```json
{ "success": false, "message": "Task not found.", "error": { "code": "TASK_NOT_FOUND" } }
```

## Database schema

MongoDB collections were converted to normalized relational tables:

| Collection | Table(s) | Notes |
|------------|----------|-------|
| `users` | `users` | unique `email`, indexed `role`, `is_active` |
| `tasks` | `tasks`, `task_labels`, `task_dependencies`, `task_mentions` | `@ManyToOne` creator/assignee/project, self-referencing `@ManyToMany` dependencies, `@ElementCollection` labels |
| `projects` | `projects`, `project_members` | embedded `members[]` normalized into `project_members` (user + role + joined_at) |
| `teams` | `teams`, `team_members` | embedded `members[]` normalized into `team_members` |
| `comments` | `comments`, `comment_mentions` | `@ManyToOne` task/user, `@ManyToMany` mentions |
| `subtasks` | `subtasks` | `@ManyToOne` task/creator |
| `notifications` | `notifications` | `relatedEntity` flattened to `related_entity_type` / `related_entity_id` |
| `refreshtokens` | `refresh_tokens` | unique token, expiry, revoked flag |
| `activitylogs` | `activity_logs` | `metadata.projectId` flattened to `project_id` |
| `attachments` | `attachments` | polymorphic `entity_type` + `entity_id` |

## Testing

```bash
cd backend
./mvnw test

cd ../frontend
npm run build      # type/bundle check for the React app
```

`TaskflowApiIntegrationTest` boots the whole application (Spring Security + JPA + H2) and
exercises the full frontend-facing contract: registration, login, token refresh, JWT error
codes, role-protected admin routes, tasks CRUD, filters/search/sort, dashboard stats, kanban,
calendar, subtasks, comments, notifications, projects (stats + health), teams, and cascading
task deletion.

## Migration notes

- **Response compatibility** — the frontend reads MongoDB-style `_id` fields and `isActive` /
  `isRead` flags. A Jackson naming strategy maps the relational `id` back to `_id`, and the
  boolean fields are explicitly serialized as `isActive` / `isRead`, so the API contract is
  unchanged.
- **React conversion** — every page (`dashboard`, `tasks`, `kanban`, `calendar`, `projects`,
  `teams`, `notifications`, `analytics`, `profile`, `settings`, `admin`, `login`, `register`,
  landing) became a route component under `src/pages`, with the shared sidebar/topbar in
  `src/components/AppLayout.jsx`. Routing is client-side via `react-router-dom` (the old clean
  URLs `/dashboard`, `/tasks`, ... still work), and `css/style.css` is reused byte-for-byte so
  the UI is unchanged.
- **Real-time** — Socket.IO is Node-only, so live notifications use a native WebSocket at
  `/ws` (authenticated with the access token). The client lives in `frontend/src/lib/socket.js`
  and pages subscribe with the `useSocketEvent` hook.
- **Charts** — the vendored `chart.umd.min.js` was replaced by the `chart.js` npm package,
  rendered through the `ChartCanvas` component (theme-aware, re-renders on theme change).
- **Idempotent notifications** — the original code sometimes created two notifications for a
  single assignment event; the migrated version creates one well-formed notification per event.
- **Background jobs** — the original reminder / due-date / recurring-task schedulers are
  reimplemented with Spring `@Scheduled` tasks (`TaskSchedulerService`).
- **Attachments** — files are stored on disk under `UPLOAD_DIR` and their metadata in MySQL.

## License

MIT
