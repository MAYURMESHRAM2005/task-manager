// ─── TaskFlow API client ──────────────────────────────────────────────────
// Direct ESM port of the original frontend/js/api.js. All request/response
// shapes are unchanged; only the transport (window globals) is gone.
import { API_BASE_URL, STORAGE_KEYS } from '../config';

export const api = {
  // ── Token Management ───────────────────────────────────────────────────
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.token);
  },

  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.refresh);
  },

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(STORAGE_KEYS.token, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.refresh, refreshToken);
  },

  clearTokens() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.refresh);
    localStorage.removeItem(STORAGE_KEYS.user);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.user));
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  // ── Core Request ───────────────────────────────────────────────────────
  async request(method, endpoint, data = null, isRetry = false) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const config = { method, headers };
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (response.status === 401 && !isRetry) {
        const body = await response.clone().json().catch(() => ({}));
        if (body.error?.code === 'TOKEN_EXPIRED' && this.getRefreshToken()) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.request(method, endpoint, data, true);
          }
        }
        this.clearTokens();
        window.location.href = '/login';
        return null;
      }

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message || 'Request failed');
      }

      return body;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your connection.');
      }
      throw err;
    }
  },

  // ── Token Refresh ──────────────────────────────────────────────────────
  async refreshToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.getRefreshToken() }),
      });

      if (!response.ok) return false;

      const body = await response.json();
      this.setTokens(body.data.accessToken, body.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  },

  // ── Auth ───────────────────────────────────────────────────────────────
  async register(data) {
    const result = await this.request('POST', '/auth/register', data);
    if (result?.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
      this.setUser(result.data.user);
    }
    return result;
  },

  async login(email, password) {
    const result = await this.request('POST', '/auth/login', { email, password });
    if (result?.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
      this.setUser(result.data.user);
    }
    return result;
  },

  async logout() {
    try {
      await this.request('POST', '/auth/logout', { refreshToken: this.getRefreshToken() });
    } finally {
      this.clearTokens();
    }
  },

  // ── User ───────────────────────────────────────────────────────────────
  async getUsers(params = {}) {
    return this.request('GET', `/users?${new URLSearchParams(params)}`);
  },
  async getProfile() {
    return this.request('GET', '/users/me');
  },
  async updateProfile(data) {
    return this.request('PUT', '/users/me', data);
  },
  async changePassword(data) {
    return this.request('PUT', '/users/me/password', data);
  },

  // ── Tasks ──────────────────────────────────────────────────────────────
  async getTasks(params = {}) {
    return this.request('GET', `/tasks?${new URLSearchParams(params)}`);
  },
  async createTask(data) {
    return this.request('POST', '/tasks', data);
  },
  async getTask(id) {
    return this.request('GET', `/tasks/${id}`);
  },
  async updateTask(id, data) {
    return this.request('PUT', `/tasks/${id}`, data);
  },
  async deleteTask(id) {
    return this.request('DELETE', `/tasks/${id}`);
  },
  async updateTaskStatus(id, status) {
    return this.request('PATCH', `/tasks/${id}/status`, { status });
  },
  async assignTask(id, assignedTo) {
    return this.request('PATCH', `/tasks/${id}/assign`, { assignedTo });
  },
  async getDashboardStats() {
    return this.request('GET', '/tasks/dashboard/stats');
  },

  // ── Kanban ─────────────────────────────────────────────────────────────
  async getKanbanBoard(params = {}) {
    return this.request('GET', `/tasks/kanban?${new URLSearchParams(params)}`);
  },
  async reorderTasks(updates) {
    return this.request('PATCH', '/tasks/reorder', { updates });
  },

  // ── Calendar ───────────────────────────────────────────────────────────
  async getCalendarData(params = {}) {
    return this.request('GET', `/tasks/calendar?${new URLSearchParams(params)}`);
  },

  // ── Subtasks ───────────────────────────────────────────────────────────
  async getSubtasks(taskId) {
    return this.request('GET', `/tasks/${taskId}/subtasks`);
  },
  async createSubtask(taskId, data) {
    return this.request('POST', `/tasks/${taskId}/subtasks`, data);
  },
  async updateSubtask(subtaskId, data) {
    return this.request('PUT', `/tasks/subtasks/${subtaskId}`, data);
  },
  async deleteSubtask(subtaskId) {
    return this.request('DELETE', `/tasks/subtasks/${subtaskId}`);
  },

  // ── Projects ───────────────────────────────────────────────────────────
  async getProjects(params = {}) {
    return this.request('GET', `/projects?${new URLSearchParams(params)}`);
  },
  async createProject(data) {
    return this.request('POST', '/projects', data);
  },
  async getProject(id) {
    return this.request('GET', `/projects/${id}`);
  },
  async updateProject(id, data) {
    return this.request('PUT', `/projects/${id}`, data);
  },
  async deleteProject(id) {
    return this.request('DELETE', `/projects/${id}`);
  },
  async addProjectMember(id, userId, role) {
    return this.request('POST', `/projects/${id}/members`, { userId, role });
  },
  async removeProjectMember(id, userId) {
    return this.request('DELETE', `/projects/${id}/members/${userId}`);
  },

  // ── Teams ──────────────────────────────────────────────────────────────
  async getTeams(params = {}) {
    return this.request('GET', `/teams?${new URLSearchParams(params)}`);
  },
  async createTeam(data) {
    return this.request('POST', '/teams', data);
  },
  async getTeam(id) {
    return this.request('GET', `/teams/${id}`);
  },
  async updateTeam(id, data) {
    return this.request('PUT', `/teams/${id}`, data);
  },
  async deleteTeam(id) {
    return this.request('DELETE', `/teams/${id}`);
  },

  // ── Comments ───────────────────────────────────────────────────────────
  async getComments(taskId) {
    return this.request('GET', `/tasks/${taskId}/comments`);
  },
  async createComment(taskId, content) {
    return this.request('POST', `/tasks/${taskId}/comments`, { content });
  },
  async updateComment(id, content) {
    return this.request('PUT', `/comments/${id}`, { content });
  },
  async deleteComment(id) {
    return this.request('DELETE', `/comments/${id}`);
  },

  // ── Notifications ──────────────────────────────────────────────────────
  async getNotifications(params = {}) {
    return this.request('GET', `/notifications?${new URLSearchParams(params)}`);
  },
  async markNotificationRead(id) {
    return this.request('PATCH', `/notifications/${id}/read`);
  },
  async markAllNotificationsRead() {
    return this.request('PATCH', '/notifications/read-all');
  },

  // ── Admin ──────────────────────────────────────────────────────────────
  async getAdminUsers(params = {}) {
    return this.request('GET', `/admin/users?${new URLSearchParams(params)}`);
  },
  async updateUserStatus(id, isActive) {
    return this.request('PATCH', `/admin/users/${id}/status`, { isActive });
  },
  async updateUserRole(id, role) {
    return this.request('PATCH', `/admin/users/${id}/role`, { role });
  },
  async getAuditLogs(params = {}) {
    return this.request('GET', `/admin/audit-logs?${new URLSearchParams(params)}`);
  },
  async getStatistics() {
    return this.request('GET', '/admin/statistics');
  },

  // ── Health ─────────────────────────────────────────────────────────────
  async healthCheck() {
    return this.request('GET', '/health');
  },
  async readinessCheck() {
    return this.request('GET', '/ready');
  },

  // ── Attachments ────────────────────────────────────────────────────────
  async getAttachments(entityType, entityId) {
    return this.request('GET', `/attachments/${entityType}/${entityId}`);
  },
  async uploadAttachment(entityType, entityId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/attachments/${entityType}/${entityId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  },
  async deleteAttachment(id) {
    return this.request('DELETE', `/attachments/${id}`);
  },

  // ── Activity Feed ──────────────────────────────────────────────────────
  async getProjectActivity(projectId, params = {}) {
    return this.request('GET', `/activity/project/${projectId}?${new URLSearchParams(params)}`);
  },
  async getMyActivity(params = {}) {
    return this.request('GET', `/activity/me?${new URLSearchParams(params)}`);
  },
};

export default api;
