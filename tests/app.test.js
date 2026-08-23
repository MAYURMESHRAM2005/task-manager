const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const mongoose = require('mongoose');

// Set test environment BEFORE requiring app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

let mongoServer;
let app;

// Connect to in-memory MongoDB before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Require app AFTER connecting to in-memory MongoDB
  app = require('../src/app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Helper to register and get tokens
async function registerUser(userData = {}) {
  const defaultData = {
    name: 'Test User',
    email: `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`,
    password: 'password123',
  };
  const data = { ...defaultData, ...userData };
  const res = await request(app).post('/api/v1/auth/register').send(data);
  return { response: res, ...res.body.data };
}

// ─── Health Checks ───────────────────────────────────────────────────────
describe('Health Endpoints', () => {
  test('GET /api/v1/health should return ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('taskflow');
  });

  test('GET /api/v1/ready should return ready status', async () => {
    const res = await request(app).get('/api/v1/ready');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('connected');
  });
});

// ─── Authentication ──────────────────────────────────────────────────────
describe('Authentication', () => {
  test('POST /api/v1/auth/register - should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'John Doe', email: 'john@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe('John Doe');
    expect(res.body.data.user.email).toBe('john@example.com');
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('POST /api/v1/auth/register - should reject duplicate email', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'User 1', email: 'dup@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'User 2', email: 'dup@example.com', password: 'password456' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/register - should reject invalid data', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: '', email: 'invalid', password: '12' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/login - should login successfully', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Login Test', email: 'login@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('login@example.com');
  });

  test('POST /api/v1/auth/login - should reject wrong password', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Wrong Pass', email: 'wrong@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/login - should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  test('POST /api/v1/auth/refresh - should refresh tokens', async () => {
    const { refreshToken } = await registerUser({ email: 'refresh@example.com' });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  test('POST /api/v1/auth/refresh - should reject invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid-token' });

    expect(res.status).toBe(401);
  });

  test('POST /api/v1/auth/logout - should logout', async () => {
    const { accessToken, refreshToken } = await registerUser({ email: 'logout@example.com' });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/v1/users/me - protected route should require auth', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/v1/users/me - should return profile with valid token', async () => {
    const { accessToken } = await registerUser({ email: 'profile@example.com' });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('profile@example.com');
  });
});

// ─── Tasks ───────────────────────────────────────────────────────────────
describe('Tasks', () => {
  let token, userId;

  beforeEach(async () => {
    const user = await registerUser({ email: `taskuser${Date.now()}@example.com` });
    token = user.accessToken;
    userId = user.user._id;
  });

  test('POST /api/v1/tasks - should create a task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My First Task', description: 'Task description', priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('My First Task');
    expect(res.body.data.task.priority).toBe('HIGH');
    expect(res.body.data.task.status).toBe('TODO');
  });

  test('POST /api/v1/tasks - should reject empty title', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' });

    expect(res.status).toBe(422);
  });

  test('GET /api/v1/tasks - should list tasks', async () => {
    await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'Task 1' });
    await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'Task 2' });

    const res = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('GET /api/v1/tasks - should support pagination', async () => {
    for (let i = 0; i < 15; i++) {
      await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${token}`).send({ title: `Task ${i}` });
    }

    const res = await request(app)
      .get('/api/v1/tasks?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  test('GET /api/v1/tasks/:id - should get a specific task', async () => {
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Specific Task' });

    const taskId = createRes.body.data.task._id;

    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.task.title).toBe('Specific Task');
  });

  test('GET /api/v1/tasks/:id - should return 404 for non-existent task', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/tasks/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('PUT /api/v1/tasks/:id - should update a task', async () => {
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Update Me' });

    const taskId = createRes.body.data.task._id;

    const res = await request(app)
      .put(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title', priority: 'URGENT' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.title).toBe('Updated Title');
    expect(res.body.data.task.priority).toBe('URGENT');
  });

  test('DELETE /api/v1/tasks/:id - should delete a task', async () => {
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Delete Me' });

    const taskId = createRes.body.data.task._id;

    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  test('PATCH /api/v1/tasks/:id/status - should update status', async () => {
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Status Task' });

    const taskId = createRes.body.data.task._id;

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('COMPLETED');
    expect(res.body.data.task.completedAt).toBeDefined();
  });

  test('DELETE /api/v1/tasks/:id - should not delete another user\'s task', async () => {
    const otherUser = await registerUser({ email: `other${Date.now()}@example.com` });

    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Task' });

    const taskId = createRes.body.data.task._id;

    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${otherUser.accessToken}`);

    expect(res.status).toBe(403);
  });

  test('GET /api/v1/tasks/dashboard/stats - should return dashboard stats', async () => {
    await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'Task 1' });
    await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'Task 2', priority: 'URGENT' });

    const res = await request(app)
      .get('/api/v1/tasks/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stats.totalTasks).toBe(2);
  });
});

// ─── Projects ────────────────────────────────────────────────────────────
describe('Projects', () => {
  let token, userId;

  beforeEach(async () => {
    const user = await registerUser({ email: `projuser${Date.now()}@example.com` });
    token = user.accessToken;
    userId = user.user._id;
  });

  test('POST /api/v1/projects - should create a project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Project', description: 'A test project' });

    expect(res.status).toBe(201);
    expect(res.body.data.project.name).toBe('Test Project');
    expect(res.body.data.project.status).toBe('PLANNED');
  });

  test('GET /api/v1/projects - should list projects', async () => {
    await request(app).post('/api/v1/projects').set('Authorization', `Bearer ${token}`).send({ name: 'Project 1' });
    await request(app).post('/api/v1/projects').set('Authorization', `Bearer ${token}`).send({ name: 'Project 2' });

    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  test('PUT /api/v1/projects/:id - should update a project', async () => {
    const createRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Update Project' });

    const projectId = createRes.body.data.project._id;

    const res = await request(app)
      .put(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Project', status: 'ACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.project.name).toBe('Updated Project');
    expect(res.body.data.project.status).toBe('ACTIVE');
  });

  test('DELETE /api/v1/projects/:id - should delete a project', async () => {
    const createRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Delete Project' });

    const projectId = createRes.body.data.project._id;

    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  test('POST /api/v1/projects/:id/members - should add member', async () => {
    const member = await registerUser({ email: `member${Date.now()}@example.com` });

    const createRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Member Project' });

    const projectId = createRes.body.data.project._id;

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: member.user._id, role: 'MEMBER' });

    expect(res.status).toBe(200);
  });
});

// ─── Comments ────────────────────────────────────────────────────────────
describe('Comments', () => {
  let token, taskId;

  beforeEach(async () => {
    const user = await registerUser({ email: `commentuser${Date.now()}@example.com` });
    token = user.accessToken;

    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Task with Comments' });
    taskId = taskRes.body.data.task._id;
  });

  test('POST /api/v1/tasks/:id/comments - should create a comment', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'This is a comment' });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.content).toBe('This is a comment');
  });

  test('GET /api/v1/tasks/:id/comments - should list comments', async () => {
    await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Comment 1' });

    await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Comment 2' });

    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.comments.length).toBe(2);
  });

  test('DELETE /api/v1/comments/:id - should delete own comment', async () => {
    const createRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Delete me' });

    const commentId = createRes.body.data.comment._id;

    const res = await request(app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

// ─── Notifications ───────────────────────────────────────────────────────
describe('Notifications', () => {
  let token;

  beforeEach(async () => {
    const user = await registerUser({ email: `notifuser${Date.now()}@example.com` });
    token = user.accessToken;
  });

  test('GET /api/v1/notifications - should list notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.unreadCount).toBeDefined();
  });

  test('PATCH /api/v1/notifications/read-all - should mark all as read', async () => {
    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Admin ───────────────────────────────────────────────────────────────
describe('Admin', () => {
  let adminToken, userToken;

  beforeEach(async () => {
    const admin = await registerUser({ email: `admin${Date.now()}@example.com` });
    adminToken = admin.accessToken;

    const User = require('../src/models/User');
    await User.findByIdAndUpdate(admin.user._id, { role: 'ADMIN' });

    const user = await registerUser({ email: `regular${Date.now()}@example.com` });
    userToken = user.accessToken;
  });

  test('GET /api/v1/admin/users - should list users (admin only)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/v1/admin/users - should deny non-admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  test('PATCH /api/v1/admin/users/:id/role - should change user role', async () => {
    const User = require('../src/models/User');
    const user = await User.findOne({ role: 'USER' });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${user._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'MANAGER' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('MANAGER');
  });

  test('GET /api/v1/admin/statistics - should return system stats', async () => {
    const res = await request(app)
      .get('/api/v1/admin/statistics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/v1/admin/audit-logs - should return audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── 404 Handling ────────────────────────────────────────────────────────
describe('Error Handling', () => {
  test('GET /api/v1/nonexistent - should return 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
  });

  test('GET /api/v1/tasks/invalid-id - should return 400', async () => {
    const { accessToken } = await registerUser({ email: `err${Date.now()}@example.com` });
    const res = await request(app)
      .get('/api/v1/tasks/invalid-id')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });
});
