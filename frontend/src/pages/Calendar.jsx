import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import { useSocketEvent } from '../lib/socket';
import Modal from '../components/Modal';
import { StatusBadge, PriorityBadge, formatDate, formatDateTime } from '../lib/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date) {
  return date.toISOString().split('T')[0];
}

export default function Calendar() {
  const { refreshUnreadCount } = useApp();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [gridError, setGridError] = useState('');

  const [dayTasks, setDayTasks] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [createdTasks, setCreatedTasks] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    project: '',
  });

  const [detailTask, setDetailTask] = useState(null);

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

  const loadCalendar = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Range includes the padding days from the neighbouring months.
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    endDate.setHours(23, 59, 59);

    try {
      const result = await api.getCalendarData({
        dateFrom: startDate.toISOString(),
        dateTo: endDate.toISOString(),
      });
      setTasks(result.data || []);
      setGridError('');
    } catch (err) {
      setGridError(err.message);
    }
  }, [currentDate]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  // Real-time: refresh the calendar when a notification arrives.
  useSocketEvent('notification', (data) => {
    if (data?.message) loadCalendar();
  }, [loadCalendar]);

  const gridRange = (() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    endDate.setHours(23, 59, 59);
    return { year, month, startDate, endDate };
  })();

  const showDayTasks = async (dateStr) => {
    setSelectedDate(dateStr);
    const dueTasks = tasks.filter((t) => t.dueDate && t.dueDate.split('T')[0] === dateStr);

    let created = [];
    try {
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      const result = await api.getTasks({
        createdFrom: startOfDay.toISOString(),
        createdTo: endOfDay.toISOString(),
        limit: 50,
      });
      created = (result.data?.tasks || []).filter((t) => !dueTasks.find((d) => d._id === t._id));
    } catch {
      /* ignore */
    }

    setCreatedTasks(created);
    setDayTasks(dueTasks);
  };

  const showTaskDetail = async (taskId) => {
    try {
      const result = await api.getTask(taskId);
      setDetailTask(result.data.task);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    try {
      await api.createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        priority: form.priority,
        project: form.project || null,
      });
      showToast('Task created', 'success');
      setCreateOpen(false);
      loadCalendar();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openCreateModal = (dateStr) => {
    setForm({
      title: '',
      description: '',
      dueDate: dateStr || toDateKey(new Date()),
      priority: 'MEDIUM',
      project: '',
    });
    setCreateOpen(true);
  };

  const todayStr = toDateKey(new Date());
  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const renderDayTaskItem = (task, type) => (
    <li className="day-task-item" key={`${type}-${task._id}`} onClick={() => showTaskDetail(task._id)}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className={`day-task-type ${type}`}>{type}</span>
          <span className="day-task-title">{task.title}</span>
        </div>
        <div className="day-task-meta">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.project ? (
            <span style={{ color: 'var(--text-muted)' }}>📁 {task.project.name || ''}</span>
          ) : null}
          {task.assignedTo ? (
            <span style={{ color: 'var(--text-muted)' }}>👤 {task.assignedTo.name || ''}</span>
          ) : null}
        </div>
      </div>
    </li>
  );

  const cells = [];
  const cursor = new Date(gridRange.startDate);
  while (cursor <= gridRange.endDate) {
    const dateStr = toDateKey(cursor);
    const dayTasksForCell = tasks.filter((t) => t.dueDate && t.dueDate.split('T')[0] === dateStr);
    cells.push({
      dateStr,
      day: cursor.getDate(),
      isToday: dateStr === todayStr,
      isOtherMonth: cursor.getMonth() !== gridRange.month,
      tasks: dayTasksForCell,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <>
      <div className="flex-between mb-20">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          >
            ‹ Prev
          </button>
          <h2 style={{ fontSize: '1.1rem', minWidth: 180, textAlign: 'center' }}>
            {currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </h2>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          >
            Next ›
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => openCreateModal()}>
          + New Task
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="calendar-grid">
          {DAYS.map((d) => (
            <div className="calendar-header-cell" key={d}>
              {d}
            </div>
          ))}
          {gridError ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <h3>Error</h3>
              <p>{gridError}</p>
            </div>
          ) : (
            cells.map((cell) => (
              <div
                className={`calendar-cell ${cell.isToday ? 'today' : ''} ${
                  cell.isOtherMonth ? 'other-month' : ''
                }`}
                key={cell.dateStr}
                onClick={() => showDayTasks(cell.dateStr)}
              >
                <div className="calendar-date">{cell.day}</div>
                {cell.tasks.slice(0, 3).map((task) => (
                  <div
                    className={`calendar-event ${task.status.toLowerCase().replace('_', '-')}`}
                    title={task.title}
                    key={task._id}
                  >
                    {task.title}
                  </div>
                ))}
                {cell.tasks.length > 3 ? (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    +{cell.tasks.length - 3} more
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        open={!!dayTasks}
        title={selectedLabel}
        maxWidth={600}
        onClose={() => setDayTasks(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDayTasks(null)}>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setDayTasks(null);
                openCreateModal(selectedDate);
              }}
            >
              + Add Task
            </button>
          </>
        }
      >
        {dayTasks && dayTasks.length === 0 && createdTasks.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <div className="empty-icon">📅</div>
            <h3>No tasks for this day</h3>
            <p>Create a new task or check other dates.</p>
          </div>
        ) : (
          <>
            {dayTasks?.length > 0 ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    📌 Due on this day ({dayTasks.length})
                  </strong>
                </div>
                <ul className="day-tasks-list">{dayTasks.map((t) => renderDayTaskItem(t, 'due'))}</ul>
              </>
            ) : null}
            {createdTasks.length > 0 ? (
              <>
                <div style={{ marginTop: 16, marginBottom: 12 }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    ✨ Created on this day ({createdTasks.length})
                  </strong>
                </div>
                <ul className="day-tasks-list">{createdTasks.map((t) => renderDayTaskItem(t, 'created'))}</ul>
              </>
            ) : null}
          </>
        )}
      </Modal>

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
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
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
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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
          </>
        ) : null}
      </Modal>
    </>
  );
}
