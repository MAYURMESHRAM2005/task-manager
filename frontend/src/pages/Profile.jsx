import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';

export default function Profile() {
  const { setUser, refreshUnreadCount } = useApp();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const loadProfile = async () => {
    try {
      const result = await api.getProfile();
      const user = result.data.user;
      setProfile(user);
      setName(user.name);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const result = await api.updateProfile({ name: name.trim() });
      setUser(result.data.user);
      showToast('Profile updated', 'success');
      loadProfile();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    try {
      await api.changePassword({ currentPassword, newPassword });
      showToast('Password changed. Please log in again.', 'success');
      setTimeout(() => {
        api.clearTokens();
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="card" style={{ maxWidth: 600 }}>
        <div className="flex gap-10 mb-20" style={{ alignItems: 'center' }}>
          <div className="avatar avatar-lg" style={{ fontSize: '1.5rem' }}>
            {profile?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>{profile ? profile.name : 'Loading...'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{profile?.email || ''}</p>
          </div>
        </div>

        <h3 style={{ marginBottom: 15, fontSize: '0.95rem' }}>Edit Profile</h3>
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              className="form-control"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </form>
      </div>

      <div className="card mt-20" style={{ maxWidth: 600 }}>
        <h3 style={{ marginBottom: 15, fontSize: '0.95rem' }}>Change Password</h3>
        <form onSubmit={changePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              className="form-control"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              className="form-control"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Update Password
          </button>
        </form>
      </div>
    </>
  );
}
