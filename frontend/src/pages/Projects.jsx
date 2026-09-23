import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import Modal from '../components/Modal';
import { Pagination, Spinner, EmptyState } from '../lib/format';

const EMPTY_FORM = { name: '', description: '', status: 'PLANNED' };

export default function Projects() {
  const { refreshUnreadCount } = useApp();
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const loadProjects = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getProjects({ page, limit: 12 });
      setProjects(result.data || []);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects(1);
  }, [loadProjects]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    try {
      const result = await api.getProject(id);
      const p = result.data.project;
      setEditingId(p._id);
      setForm({ name: p.name, description: p.description || '', status: p.status });
      setModalOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
    };
    try {
      if (editingId) {
        await api.updateProject(editingId, data);
        showToast('Project updated', 'success');
      } else {
        await api.createProject(data);
        showToast('Project created', 'success');
      }
      setModalOpen(false);
      loadProjects(pagination?.page || 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.deleteProject(deleteId);
      showToast('Project deleted successfully', 'success');
      setDeleteId(null);
      loadProjects(pagination?.page || 1);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const statusClass = (status) =>
    status === 'ACTIVE' ? 'badge-progress' : status === 'COMPLETED' ? 'badge-completed' : 'badge-todo';

  return (
    <>
      <div className="flex-between mb-20">
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
          {pagination ? `${pagination.total} project${pagination.total !== 1 ? 's' : ''}` : ''}
        </h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + New Project
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1' }}>
            <Spinner />
          </div>
        ) : error ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">📁</div>
            <h3>No projects yet</h3>
            <p>Create your first project</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              className="card"
              style={{ cursor: 'pointer' }}
              key={project._id}
              onClick={() => showToast('Project detail view coming soon', 'info')}
            >
              <div className="flex-between mb-10">
                <span className={`badge ${statusClass(project.status)}`}>{project.status}</span>
                <div className="flex gap-10">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(project._id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(project._id);
                    }}
                  >
                    Del
                  </button>
                </div>
              </div>
              <h3 style={{ marginBottom: 6 }}>{project.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                {project.description || 'No description'}
              </p>
              <div style={{ background: 'var(--border)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${project.taskStats?.completionPercentage || 0}%`,
                    height: '100%',
                    background: 'var(--primary)',
                    borderRadius: 3,
                  }}
                />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                {project.taskStats?.completed || 0}/{project.taskStats?.total || 0} tasks completed ·{' '}
                {project.taskStats?.completionPercentage || 0}%
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination pagination={pagination} onChange={(page) => loadProjects(page)} />

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Project' : 'New Project'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Project name"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              placeholder="Project description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="PLANNED">Planned</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {editingId ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        title="Delete Project"
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
        <p>Are you sure you want to delete this project? Tasks will be unassigned but not deleted.</p>
      </Modal>
    </>
  );
}
