import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import Modal from '../components/Modal';
import {
  Pagination,
  StatusBadge,
  PriorityBadge,
  EmptyState,
  formatDate,
  formatDateTime,
} from '../lib/format';

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
  category: '',
  assignedTo: '',
  project: '',
  reminderAt: '',
};

export default function Tasks() {
  const { refreshUnreadCount } = useApp();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // debounceSearch(): 400ms after typing
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  // Load users + projects for the dropdowns (runs once).
  useEffect(() => {
    (async () => {
      try {
        const result = await api.getUsers({ limit: 100 });
        setUsers(result.data || []);
      } catch {
        /* ignore */
      }
    })();
    (async () => {
      try {
        const result = await api.getProjects({ limit: 100 });
        setProjects(result.data || []);
      } catch {
        /* ignore */
      }
    })();
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const loadTasks = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      const params = { page, limit: 10 };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (debouncedSearch) params.search = debouncedSearch;

      try {
        const result = await api.getTasks(params);
        setTasks(result.data || []);
        setPagination(result.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [status, priority, debouncedSearch],
  );

  // Reload whenever the filters (or the debounced search) change.
  useEffect(() => {
    loadTasks(1);
  }, [loadTasks]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    try {
      const result = await api.getTask(id);
      const t = result.data.task;
      setEditingId(t._id);
      setForm({
        title: t.title || '',
        description: t.description || '',
        status: t.status || 'TODO',
        priority: t.priority || 'MEDIUM',
        dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
        category: t.category || '',
        assignedTo: t.assignedTo?._id || '',
        project: t.project?._id || '',
        reminderAt: t.reminderAt ? t.reminderAt.slice(0, 16) : '',
      });
      setModalOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const data = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      category: form.category.trim() || null,
      assignedTo: form.assignedTo || null,
      project: form.project || null,
      reminderAt: form.reminderAt || null,
    };
    try {
      if (editingId) {
        await api.updateTask(editingId, data);
        showToast('Task updated successfully', 'success');
      } else {
        await api.createTask(data);
        showToast('Task created successfully', 'success');
      }
      setModalOpen(false);
      loadTasks(pagination?.page || 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.deleteTask(deleteId);
      showToast('Task deleted successfully', 'success');
      setDeleteId(null);
      loadTasks(pagination?.page || 1);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="flex-between mb-20">
        <div className="filter-bar">
          <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <input
            type="text"
            className="form-control"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + New Task
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="loading-overlay">
                    <span className="loading-spinner" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="Error loading tasks">
                      <p>{error}</p>
                    </EmptyState>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon="📭" title="No tasks found">
                      <p>Create your first task to get started</p>
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task._id}>
                    <td data-label="Title">
                      <strong>{task.title}</strong>
                      {task.description ? (
                        <>
                          <br />
                          <small style={{ color: 'var(--text-secondary)' }}>
                            {task.description.substring(0, 80)}
                          </small>
                        </>
                      ) : null}
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={task.status} />
                    </td>
                    <td data-label="Priority">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td data-label="Assigned To">
                      {task.assignedTo ? (
                        task.assignedTo.name
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Unassigned</span>
                      )}
                    </td>
                    <td data-label="Due Date">
                      {formatDate(task.dueDate)}
                      {task.reminderAt && !task.reminderNotified ? (
                        <>
                          <br />
                          <small style={{ color: 'var(--primary)' }}>⏰ {formatDateTime(task.reminderAt)}</small>
                        </>
                      ) : null}
                    </td>
                    <td data-label="Actions">
                      <div className="flex gap-10">
                        <button className="btn btn-sm btn-outline" onClick={() => openEditModal(task._id)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(task._id)}>
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onChange={(page) => loadTasks(page)} />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Task' : 'New Task'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Task title"
              required
              minLength={2}
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              placeholder="Task description"
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select
                className="form-control"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                className="form-control"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Frontend"
                maxLength={50}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>⏰ Reminder</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.reminderAt}
                onChange={(e) => setForm({ ...form, reminderAt: e.target.value })}
              />
            </div>
            <div className="form-group" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Project</label>
              <select
                className="form-control"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Assign To</label>
              <select
                className="form-control"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {editingId ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        title="Delete Task"
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={confirmDelete}>
              Delete
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this task? This action cannot be undone.</p>
      </Modal>
    </>
  );
}
