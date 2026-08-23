// ─── TaskFlow API Client ──────────────────────────────────────────────────
const API_BASE = '/api/v1';

const api = {
  // ── Token Management ───────────────────────────────────────────────────
  getToken() {
    return localStorage.getItem('taskflow_token');
  },

  getRefreshToken() {
    return localStorage.getItem('taskflow_refresh');
  },

  setTokens(accessToken, refreshToken) {
    localStorage.setItem('taskflow_token', accessToken);
    if (refreshToken) localStorage.setItem('taskflow_refresh', refreshToken);
  },

  clearTokens() {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_refresh');
    localStorage.removeItem('taskflow_user');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('taskflow_user'));
    } catch { return null; }
  },

  setUser(user) {
    localStorage.setItem('taskflow_user', JSON.stringify(user));
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  // ── Core Request ───────────────────────────────────────────────────────
  async request(method, endpoint, data = null, isRetry = false) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);

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
      const response = await fetch(`${API_BASE}/auth/refresh`, {
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
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/users?${qs}`);
  },
  async getProfile() { return this.request('GET', '/users/me'); },
  async updateProfile(data) { return this.request('PUT', '/users/me', data); },
  async changePassword(data) { return this.request('PUT', '/users/me/password', data); },

  // ── Tasks ──────────────────────────────────────────────────────────────
  async getTasks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/tasks?${qs}`);
  },
  async createTask(data) { return this.request('POST', '/tasks', data); },
  async getTask(id) { return this.request('GET', `/tasks/${id}`); },
  async updateTask(id, data) { return this.request('PUT', `/tasks/${id}`, data); },
  async deleteTask(id) { return this.request('DELETE', `/tasks/${id}`); },
  async updateTaskStatus(id, status) { return this.request('PATCH', `/tasks/${id}/status`, { status }); },
  async assignTask(id, assignedTo) { return this.request('PATCH', `/tasks/${id}/assign`, { assignedTo }); },
  async getDashboardStats() { return this.request('GET', '/tasks/dashboard/stats'); },

  // ── Kanban ─────────────────────────────────────────────────────────────
  async getKanbanBoard(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/tasks/kanban?${qs}`);
  },
  async reorderTasks(updates) { return this.request('PATCH', '/tasks/reorder', { updates }); },

  // ── Calendar ───────────────────────────────────────────────────────────
  async getCalendarData(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/tasks/calendar?${qs}`);
  },

  // ── Subtasks ───────────────────────────────────────────────────────────
  async getSubtasks(taskId) { return this.request('GET', `/tasks/${taskId}/subtasks`); },
  async createSubtask(taskId, data) { return this.request('POST', `/tasks/${taskId}/subtasks`, data); },
  async updateSubtask(subtaskId, data) { return this.request('PUT', `/tasks/subtasks/${subtaskId}`, data); },
  async deleteSubtask(subtaskId) { return this.request('DELETE', `/tasks/subtasks/${subtaskId}`); },

  // ── Projects ───────────────────────────────────────────────────────────
  async getProjects(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/projects?${qs}`);
  },
  async createProject(data) { return this.request('POST', '/projects', data); },
  async getProject(id) { return this.request('GET', `/projects/${id}`); },
  async updateProject(id, data) { return this.request('PUT', `/projects/${id}`, data); },
  async deleteProject(id) { return this.request('DELETE', `/projects/${id}`); },
  async addProjectMember(id, userId, role) { return this.request('POST', `/projects/${id}/members`, { userId, role }); },
  async removeProjectMember(id, userId) { return this.request('DELETE', `/projects/${id}/members/${userId}`); },

  // ── Teams ──────────────────────────────────────────────────────────────
  async getTeams(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/teams?${qs}`);
  },
  async createTeam(data) { return this.request('POST', '/teams', data); },
  async getTeam(id) { return this.request('GET', `/teams/${id}`); },
  async updateTeam(id, data) { return this.request('PUT', `/teams/${id}`, data); },
  async deleteTeam(id) { return this.request('DELETE', `/teams/${id}`); },

  // ── Comments ───────────────────────────────────────────────────────────
  async getComments(taskId) { return this.request('GET', `/tasks/${taskId}/comments`); },
  async createComment(taskId, content) { return this.request('POST', `/tasks/${taskId}/comments`, { content }); },
  async updateComment(id, content) { return this.request('PUT', `/comments/${id}`, { content }); },
  async deleteComment(id) { return this.request('DELETE', `/comments/${id}`); },

  // ── Notifications ──────────────────────────────────────────────────────
  async getNotifications(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/notifications?${qs}`);
  },
  async markNotificationRead(id) { return this.request('PATCH', `/notifications/${id}/read`); },
  async markAllNotificationsRead() { return this.request('PATCH', '/notifications/read-all'); },

  // ── Admin ──────────────────────────────────────────────────────────────
  async getAdminUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/admin/users?${qs}`);
  },
  async updateUserStatus(id, isActive) { return this.request('PATCH', `/admin/users/${id}/status`, { isActive }); },
  async updateUserRole(id, role) { return this.request('PATCH', `/admin/users/${id}/role`, { role }); },
  async getAuditLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/admin/audit-logs?${qs}`);
  },
  async getStatistics() { return this.request('GET', '/admin/statistics'); },

  // ── Health ─────────────────────────────────────────────────────────────
  async healthCheck() { return this.request('GET', '/health'); },
  async readinessCheck() { return this.request('GET', '/ready'); },

  // ── Attachments ───────────────────────────────────────────────────────
  async getAttachments(entityType, entityId) { return this.request('GET', `/attachments/${entityType}/${entityId}`); },
  async uploadAttachment(entityType, entityId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const response = await fetch(`${API_BASE}/attachments/${entityType}/${entityId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  },
  async deleteAttachment(id) { return this.request('DELETE', `/attachments/${id}`); },

  // ── Activity Feed ──────────────────────────────────────────────────────
  async getProjectActivity(projectId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/activity/project/${projectId}?${qs}`);
  },
  async getMyActivity(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/activity/me?${qs}`);
  },
};

// ─── Socket.IO Client ─────────────────────────────────────────────────────
let socket = null;

function initSocket() {
  if (socket || !api.isAuthenticated()) return socket;
  try {
    socket = io({ auth: { token: api.getToken() }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });
    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });
    socket.on('notification', (data) => {
      showToast(data.message, 'info');
      updateNotifCount();
    });
    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });
    return socket;
  } catch (e) {
    console.error('[Socket] Init error:', e);
    return null;
  }
}

function getSocket() { return socket; }

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ─── Toast Notifications ──────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('taskflow_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('taskflow_theme', next);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
}

// ─── Chart Theme ─────────────────────────────────────────────────────────
function getChartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    return {
      textColor: '#A3A3A3',
      legendColor: '#E5E5E5',
      gridColor: '#242424',
      borderColor: '#333333',
      axisColor: '#525252',
      tooltipBg: '#0D0D0D',
      tooltipBorder: '#333333',
      tooltipTitle: '#FFFFFF',
      tooltipBody: '#D4D4D4',
      remainingColor: '#262626',
    };
  }
  return {
    textColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1e293b',
    legendColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1e293b',
    gridColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e2e8f0',
    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e2e8f0',
    axisColor: '#e2e8f0',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipTitle: '#1e293b',
    tooltipBody: '#475569',
    remainingColor: '#e2e8f0',
  };
}

function getChartScales(t) {
  return {
    x: {
      ticks: { color: t.textColor },
      grid: { color: t.gridColor },
      border: { color: t.borderColor },
    },
    y: {
      ticks: { color: t.textColor, stepSize: 1 },
      grid: { color: t.gridColor },
      border: { color: t.borderColor },
    },
  };
}

function getChartPlugins(t) {
  return {
    legend: {
      labels: { color: t.legendColor, usePointStyle: true, padding: 16 },
    },
    tooltip: {
      backgroundColor: t.tooltipBg,
      titleColor: t.tooltipTitle,
      bodyColor: t.tooltipBody,
      borderColor: t.tooltipBorder,
      borderWidth: 1,
    },
  };
}

// ─── Auth Guard ───────────────────────────────────────────────────────────
function requireAuth() {
  if (!api.isAuthenticated()) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

function redirectIfAuth() {
  if (api.isAuthenticated()) {
    window.location.href = '/dashboard';
    return true;
  }
  return false;
}

// ─── Sidebar Renderer ─────────────────────────────────────────────────────
function renderSidebar(activePage) {
  const user = api.getUser();
  const isAdmin = user?.role === 'ADMIN';

  const links = [
    { section: 'Main' },
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/tasks', icon: '✅', label: 'My Tasks' },
    { href: '/kanban', icon: '📋', label: 'Kanban Board' },
    { href: '/calendar', icon: '📅', label: 'Calendar' },
    { href: '/projects', icon: '📁', label: 'Projects' },
    { section: 'Collaborate' },
    { href: '/teams', icon: '👥', label: 'Teams' },
    { href: '/notifications', icon: '🔔', label: 'Notifications' },
    { section: 'Account' },
    { href: '/analytics', icon: '📈', label: 'Analytics' },
    { href: '/profile', icon: '👤', label: 'Profile' },
    { href: '/settings', icon: '⚙️', label: 'Settings' },
  ];

  if (isAdmin) {
    links.push({ section: 'Admin' });
    links.push({ href: '/admin', icon: '🛡️', label: 'Admin Panel' });
  }

  let html = `
    <button class="sidebar-close" onclick="closeSidebar()" aria-label="Close menu">✕</button>
    <div class="sidebar-header">
      <h1>⚡ Task<span>Flow</span></h1>
    </div>
    <nav class="sidebar-nav">
  `;

  links.forEach((link) => {
    if (link.section) {
      html += `<div class="nav-section">${link.section}</div>`;
    } else {
      const active = link.href === `/${activePage}` ? 'active' : '';
      html += `<a href="${link.href}" class="nav-link ${active}" onclick="closeSidebar()"><span class="icon">${link.icon}</span>${link.label}</a>`;
    }
  });

  html += `
    </nav>
    <div style="padding:15px 20px;border-top:1px solid rgba(255,255,255,0.1)">
      <div class="user-info" style="color:var(--text-sidebar)">
        <div class="avatar">${user?.name?.charAt(0) || 'U'}</div>
        <div>
          <div class="user-name" style="color:#fff;font-size:0.85rem">${user?.name || 'User'}</div>
          <div style="font-size:0.72rem;opacity:0.6">${user?.role || 'USER'}</div>
        </div>
      </div>
    </div>
  `;

  return html;
}

function renderTopbar(activePage) {
  return `
    <div class="topbar-left">
      <div class="menu-toggle-wrapper">
        <button class="menu-toggle" onclick="toggleSidebar()" aria-label="Toggle menu">☰</button>
      </div>
      <h2 style="font-size:1.1rem">${activePage.charAt(0).toUpperCase() + activePage.slice(1)}</h2>
    </div>
    <div class="topbar-right">
      <div class="notification-bell" onclick="window.location.href='/notifications'">
        🔔
        <span class="notification-badge" id="notifCount" style="display:none">0</span>
      </div>
      <button class="btn btn-outline btn-sm" onclick="toggleTheme()" title="Toggle theme">🌓</button>
      <button class="btn btn-outline btn-sm" onclick="handleLogout()">Logout</button>
    </div>
  `;
}

// ─── Sidebar Toggle (mobile) ─────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function ensureSidebarOverlay() {
  if (!document.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusBadge(status) {
  const map = { TODO: 'badge-todo', IN_PROGRESS: 'badge-progress', REVIEW: 'badge-progress', COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled' };
  return `<span class="badge ${map[status] || ''}">${status.replace('_', ' ')}</span>`;
}

function priorityBadge(priority) {
  const map = { LOW: 'badge-low', MEDIUM: 'badge-medium', HIGH: 'badge-high', URGENT: 'badge-urgent' };
  return `<span class="badge ${map[priority] || ''}">${priority}</span>`;
}

function roleBadge(role) {
  const map = { USER: 'badge-user', MANAGER: 'badge-manager', ADMIN: 'badge-admin' };
  return `<span class="badge ${map[role] || ''}">${role}</span>`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text || ''));
  return div.innerHTML;
}

function showModal(id) { document.getElementById(id)?.classList.add('active'); }
function hideModal(id) { document.getElementById(id)?.classList.remove('active'); }

async function handleLogout() {
  try { await api.logout(); } catch { /* ignore */ }
  window.location.href = '/login';
}

async function updateNotifCount() {
  try {
    const result = await api.getNotifications({ unread: 'true', limit: 1 });
    const badge = document.getElementById('notifCount');
    if (badge && result?.unreadCount > 0) {
      badge.textContent = result.unreadCount > 9 ? '9+' : result.unreadCount;
      badge.style.display = 'flex';
    }
  } catch { /* ignore */ }
}

function renderSkeleton(count = 3) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += '<div class="skeleton skeleton-card mb-10"></div>';
  }
  return html;
}

function progressBar(percentage, colorClass = 'green') {
  return `<div class="progress-bar"><div class="progress-fill ${colorClass}" style="width:${percentage}%"></div></div>`;
}

function scoreRing(percentage) {
  const r = 42, c = 2 * Math.PI * r;
  const offset = c - (percentage / 100) * c;
  const color = percentage >= 80 ? '#22c55e' : percentage >= 60 ? '#f59e0b' : '#ef4444';
  return `
    <div class="score-ring">
      <svg width="100" height="100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--border)" stroke-width="6"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/></svg>
      <span class="score-ring-value">${percentage}%</span>
    </div>
  `;
}
