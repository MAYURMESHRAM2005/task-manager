import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import { getTheme, setTheme, toggleTheme } from '../lib/theme';

export default function Settings() {
  const { refreshUnreadCount } = useApp();
  const theme = getTheme();

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h3 style={{ marginBottom: 20 }}>Application Settings</h3>

      <div className="form-group">
        <label>Theme</label>
        <div className="flex gap-10">
          <button className="btn btn-outline" onClick={() => { setTheme('light'); showToast('Theme updated', 'success'); }}>
            ☀️ Light
          </button>
          <button className="btn btn-outline" onClick={() => { setTheme('dark'); showToast('Theme updated', 'success'); }}>
            🌙 Dark
          </button>
          <button className="btn btn-outline" onClick={() => { setTheme(''); showToast('Theme updated', 'success'); }}>
            System
          </button>
        </div>
        <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Current theme: {theme || 'system'} · <button className="btn btn-sm btn-outline" onClick={toggleTheme}>Toggle</button>
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 15, marginTop: 15 }}>
        <h4 style={{ marginBottom: 10 }}>Account</h4>
        <button
          className="btn btn-danger"
          onClick={() => showToast('Account deactivation is managed by administrators.', 'info')}
        >
          Deactivate Account
        </button>
      </div>
    </div>
  );
}
