import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import Modal from '../components/Modal';
import { Pagination, EmptyState, formatDate } from '../lib/format';

const EMPTY_FORM = { name: '', description: '' };

export default function Teams() {
  const { refreshUnreadCount } = useApp();
  const [teams, setTeams] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const loadTeams = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getTeams({ page, limit: 10 });
      setTeams(result.data || []);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams(1);
  }, [loadTeams]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    try {
      const result = await api.getTeam(id);
      const t = result.data.team;
      setEditingId(t._id);
      setForm({ name: t.name, description: t.description || '' });
      setModalOpen(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const data = { name: form.name.trim(), description: form.description.trim() };
    try {
      if (editingId) {
        await api.updateTeam(editingId, data);
        showToast('Team updated', 'success');
      } else {
        await api.createTeam(data);
        showToast('Team created', 'success');
      }
      setModalOpen(false);
      loadTeams(pagination?.page || 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async (id) => {
    if (!window.confirm('Delete this team?')) return;
    try {
      await api.deleteTeam(id);
      showToast('Team deleted', 'success');
      loadTeams(pagination?.page || 1);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="flex-between mb-20">
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
          {pagination ? `${pagination.total} team${pagination.total !== 1 ? 's' : ''}` : ''}
        </h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + New Team
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Team Name</th>
                <th>Members</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="loading-overlay">
                    <span className="loading-spinner" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="Error">
                      <p>{error}</p>
                    </EmptyState>
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState icon="👥" title="No teams yet">
                      <p>Create your first team</p>
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team._id}>
                    <td data-label="Team">
                      <strong>{team.name}</strong>
                      <br />
                      <small style={{ color: 'var(--text-secondary)' }}>{team.description || ''}</small>
                    </td>
                    <td data-label="Members">
                      {team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''}
                    </td>
                    <td data-label="Created">{formatDate(team.createdAt)}</td>
                    <td data-label="Actions">
                      <div className="flex gap-10">
                        <button className="btn btn-sm btn-outline" onClick={() => openEditModal(team._id)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteTeam(team._id)}>
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
        <Pagination pagination={pagination} onChange={(page) => loadTeams(page)} />
      </div>

      <Modal open={modalOpen} title={editingId ? 'Edit Team' : 'New Team'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Team Name *</label>
            <input
              type="text"
              className="form-control"
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
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {editingId ? 'Update Team' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
