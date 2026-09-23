import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import Modal from '../components/Modal';
import {
  ProgressBar,
  Spinner,
  StatusBadge,
  PriorityBadge,
  formatDate,
  formatDateTime,
} from '../lib/format';

const COLUMNS = [
  { key: 'TODO', label: '📋 TODO', color: '#3b82f6' },
  { key: 'IN_PROGRESS', label: '🔄 In Progress', color: '#f59e0b' },
  { key: 'REVIEW', label: '👁️ Review', color: '#8b5cf6' },
  { key: 'COMPLETED', label: '✅ Done', color: '#22c55e' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
  project: '',
  reminderAt: '',
  labels: '',
};

export default function Kanban() {
  const { refreshUnreadCount } = useApp();
  const [board, setBoard] = useState({});
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailTask, setDetailTask] = useState(null);
  const [subtasks, setSubtasks] = useState(null);

  useEffect(() => {
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

  const loadKanban = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (projectFilter) params.project = projectFilter;
      const data = await api.getKanbanBoard(params);
      setBoard(data || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    loadKanban();
  }, [loadKanban]);

  const openDetail = async (taskId) => {
    try {
      const result = await api.getTask(taskId);
      setDetailTask(result.data.task);
      const subs = await api.getSubtasks(taskId);
      setSubtasks(subs);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const refreshDetail = async (taskId) => {
    try {
      const result = await api.getTask(taskId);
      setDetailTask(result.data.task);
      setSubtasks(await api.getSubtasks(taskId));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDrop = async (event, newStatus) => {
    event.preventDefault();
    setDragOver(null);
    const taskId = event.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Optimistic local move (mirrors the original boardData mutation).
    let movedTask = null;
    const next = { ...board };
    Object.keys(next).forEach((status) => {
      next[status] = [...(next[status] || [])];
      const idx = next[status].findIndex((t) => t._id === taskId);
      if (idx !== -1 && !movedTask) {
        movedTask = next[status].splice(idx, 1)[0];
      }
    });

    if (!movedTask) return;
    movedTask = { ...movedTask, status: newStatus };
    next[newStatus] = [...(next[newStatus] || []), movedTask];
    setBoard(next);

    try {
      await api.reorderTasks([{ taskId, status: newStatus, position: next[newStatus].length - 1 }]);
      showToast(`Task moved to ${newStatus.replace('_', ' ')}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      loadKanban();
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || null,
        project: form.project || null,
        reminderAt: form.reminderAt || null,
        labels: form.labels
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
      });
      showToast('Task created', 'success');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      loadKanban();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addSubtask = async (taskId) => {
    const title = prompt('Subtask title:');
    if (!title || !title.trim()) return;
    try {
      await api.createSubtask(taskId, { title: title.trim() });
      showToast('Subtask added', 'success');
      await refreshDetail(taskId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleSubtask = async (subtask, completed, taskId) => {
    try {
      await api.updateSubtask(subtask._id, { completed });
      await refreshDetail(taskId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const deleteSubtask = async (subtaskId, taskId) => {
    try {
      await api.deleteSubtask(subtaskId);
      showToast('Subtask deleted', 'success');
      await refreshDetail(taskId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="flex-between mb-20">
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <select
            className="form-control"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreateOpen(true);
          }}
        >
          + New Task
        </button>
      </div>

      {loading ? (
        <Spinner label="Loading board..." />
      ) : error ? (
        <div className="empty-state" style={{ width: '100%' }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const tasks = board[col.key] || [];
            return (
              <div className="kanban-column" data-status={col.key} key={col.key}>
                <div className="kanban-column-header">
                  <span>{col.label}</span>
                  <span className="kanban-column-count">{tasks.length}</span>
                </div>
                <div
                  className={`kanban-cards ${dragOver === col.key ? 'drag-over' : ''}`}
                  data-status={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(col.key);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {tasks.map((task) => {
                    const isOverdue =
                      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
                    return (
                      <div
                        className="kanban-card"
                        draggable
                        key={task._id}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', task._id);
                        }}
                        onClick={() => openDetail(task._id)}
                      >
                        <div className="kanban-card-title">{task.title}</div>
                        <div className="kanban-card-meta">
                          <PriorityBadge priority={task.priority} />
                          {task.assignedTo ? <span>👤 {task.assignedTo.name}</span> : null}
                        </div>
                        {task.labels?.length ? (
                          <div className="kanban-card-meta mt-10">
                            {task.labels.map((label, i) => (
                              <span className="kanban-label" key={i}>
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="kanban-card-footer">
                          <span
                            style={{
                              color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)',
                              fontSize: '0.75rem',
                            }}
                          >
                            {task.dueDate ? (isOverdue ? '⚠️ ' : '') + formatDate(task.dueDate) : ''}
                          </span>
                          {task.dependsOn?.length > 0 ? (
                            <span className="dep-badge">🔗 {task.dependsOn.length}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} title="New Task" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Task title"
              required
              minLength={2}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              placeholder="Description"
              rows={2}
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
                <option value="REVIEW">Review</option>
                <option value="COMPLETED">Completed</option>
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
            <div className="form-group">
              <label>Labels (comma-separated)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. bug, frontend"
                value={form.labels}
                onChange={(e) => setForm({ ...form, labels: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!detailTask}
        title={detailTask?.title || 'Task Details'}
        maxWidth={650}
        onClose={() => setDetailTask(null)}
      >
        {detailTask ? (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <StatusBadge status={detailTask.status} /> <PriorityBadge priority={detailTask.priority} />
              {(detailTask.labels || []).map((label, i) => (
                <span className="kanban-label" key={i}>
                  {label}
                </span>
              ))}
            </div>
            {detailTask.description ? (
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{detailTask.description}</p>
            ) : null}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 16,
                fontSize: '0.85rem',
              }}
            >
              <div>
                <strong>Assignee:</strong> {detailTask.assignedTo ? detailTask.assignedTo.name : 'Unassigned'}
              </div>
              <div>
                <strong>Due:</strong> {formatDate(detailTask.dueDate)}
              </div>
              <div>
                <strong>Project:</strong> {detailTask.project ? detailTask.project.name : '—'}
              </div>
              <div>
                <strong>Created:</strong> {formatDateTime(detailTask.createdAt)}
              </div>
            </div>
            {detailTask.dependsOn?.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <strong>Dependencies:</strong>
                {detailTask.dependsOn.map((dep) => (
                  <span className="badge badge-progress" style={{ margin: 2 }} key={dep._id}>
                    {dep.title} ({dep.status})
                  </span>
                ))}
              </div>
            ) : null}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div className="flex-between mb-10">
                <strong>
                  Subtasks ({subtasks?.completed || 0}/{subtasks?.total || 0})
                </strong>
                <button className="btn btn-sm btn-outline" onClick={() => addSubtask(detailTask._id)}>
                  + Add
                </button>
              </div>
              <ProgressBar percentage={subtasks?.percentage || 0} />
              <ul className="subtask-list mt-10">
                {(subtasks?.data || []).map((subtask) => (
                  <li className={`subtask-item ${subtask.completed ? 'completed' : ''}`} key={subtask._id}>
                    <input
                      type="checkbox"
                      checked={!!subtask.completed}
                      onChange={(e) => toggleSubtask(subtask, e.target.checked, detailTask._id)}
                    />
                    <span style={{ flex: 1 }}>{subtask.title}</span>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ padding: '2px 8px', minHeight: 24 }}
                      onClick={() => deleteSubtask(subtask._id, detailTask._id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
