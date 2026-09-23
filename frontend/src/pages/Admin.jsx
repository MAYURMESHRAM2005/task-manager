import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import { Pagination, Spinner, RoleBadge, EmptyState, formatDateTime } from '../lib/format';

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'stats', label: 'Statistics' },
  { key: 'audit', label: 'Audit Logs' },
];

export default function Admin() {
  const { refreshUnreadCount } = useApp();
  const [tab, setTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState(null);
  const [usersLoading, setUsersLoading] = useState(true);

  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const loadUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const result = await api.getAdminUsers({ page, limit: 10 });
      setUsers(result.data || []);
      setUsersPagination(result.pagination);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const result = await api.getStatistics();
      setStats(result.data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, []);

  const loadAuditLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const result = await api.getAuditLogs({ page, limit: 15 });
      setLogs(result.data || []);
      setLogsPagination(result.pagination);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers(1);
    else if (tab === 'stats') loadStats();
    else if (tab === 'audit') loadAuditLogs(1);
  }, [tab, loadUsers, loadStats, loadAuditLogs]);

  const changeRole = async (id, role) => {
    try {
      await api.updateUserRole(id, role);
      showToast('Role updated', 'success');
      loadUsers(usersPagination?.page || 1);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleStatus = async (id, isActive) => {
    try {
      await api.updateUserStatus(id, isActive);
      showToast('Status updated', 'success');
      loadUsers(usersPagination?.page || 1);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`tab-btn ${tab === item.key ? 'active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'users' ? (
        <div className="tab-content">
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="loading-overlay">
                        <span className="loading-spinner" />
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id}>
                        <td data-label="Name">
                          <div className="flex gap-10" style={{ alignItems: 'center' }}>
                            <div className="avatar">{user.name.charAt(0)}</div>
                            {user.name}
                          </div>
                        </td>
                        <td data-label="Email">{user.email}</td>
                        <td data-label="Role">
                          <RoleBadge role={user.role} />
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${user.isActive ? 'badge-completed' : 'badge-cancelled'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td data-label="Last Login">{user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}</td>
                        <td data-label="Actions">
                          <div className="flex gap-10">
                            <select
                              className="form-control"
                              style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                              value={user.role}
                              onChange={(e) => changeRole(user._id, e.target.value)}
                            >
                              <option value="USER">User</option>
                              <option value="MANAGER">Manager</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <button
                              className={`btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`}
                              onClick={() => toggleStatus(user._id, !user.isActive)}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={usersPagination} onChange={(page) => loadUsers(page)} compact />
          </div>
        </div>
      ) : null}

      {tab === 'stats' ? (
        <div className="tab-content">
          {stats ? (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">👤</div>
                <div className="stat-value">{stats.totalUsers}</div>
                <div className="stat-label">Total Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">✅</div>
                <div className="stat-value">{stats.activeUsers}</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">📋</div>
                <div className="stat-value">{stats.totalTasks}</div>
                <div className="stat-label">Total Tasks</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon yellow">📁</div>
                <div className="stat-value">{stats.totalProjects}</div>
                <div className="stat-label">Total Projects</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red">👥</div>
                <div className="stat-value">{stats.totalTeams}</div>
                <div className="stat-label">Total Teams</div>
              </div>
            </div>
          ) : (
            <Spinner />
          )}
        </div>
      ) : null}

      {tab === 'audit' ? (
        <div className="tab-content">
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Description</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={5} className="loading-overlay">
                        <span className="loading-spinner" />
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="No audit logs" />
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id}>
                        <td data-label="User">{log.user ? log.user.name : 'System'}</td>
                        <td data-label="Action">
                          <span className="badge badge-todo">{log.action}</span>
                        </td>
                        <td data-label="Entity">{log.entity}</td>
                        <td data-label="Description">{log.description || ''}</td>
                        <td data-label="Time">{formatDateTime(log.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={logsPagination} onChange={(page) => loadAuditLogs(page)} compact />
          </div>
        </div>
      ) : null}
    </>
  );
}
