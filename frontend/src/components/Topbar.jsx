import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { toggleTheme } from '../lib/theme';

export default function Topbar({ title, onToggleSidebar }) {
  const navigate = useNavigate();
  const { unreadCount, logout } = useApp();
  const label = title ? title.charAt(0).toUpperCase() + title.slice(1) : '';

  return (
    <header className="topbar" id="topbar">
      <div className="topbar-left">
        <div className="menu-toggle-wrapper">
          <button className="menu-toggle" onClick={onToggleSidebar} aria-label="Toggle menu">
            ☰
          </button>
        </div>
        <h2 style={{ fontSize: '1.1rem' }}>{label}</h2>
      </div>
      <div className="topbar-right">
        <div className="notification-bell" onClick={() => navigate('/notifications')}>
          🔔
          <span
            className="notification-badge"
            id="notifCount"
            style={{ display: unreadCount > 0 ? 'flex' : 'none' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => toggleTheme()} title="Toggle theme">
          🌓
        </button>
        <button className="btn btn-outline btn-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
