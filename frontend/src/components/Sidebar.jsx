import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const LINKS = [
  { section: 'Main' },
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/tasks', icon: '✅', label: 'My Tasks' },
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

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin } = useApp();
  const links = [...LINKS];
  if (isAdmin) {
    links.push({ section: 'Admin' }, { href: '/admin', icon: '🛡️', label: 'Admin Panel' });
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} id="sidebar">
      <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
        ✕
      </button>
      <div className="sidebar-header">
        <h1>
          ⚡ Task<span>Flow</span>
        </h1>
      </div>
      <nav className="sidebar-nav">
        {links.map((link, index) =>
          link.section ? (
            <div className="nav-section" key={`section-${index}`}>
              {link.section}
            </div>
          ) : (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ),
        )}
      </nav>
      <div style={{ padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="user-info" style={{ color: 'var(--text-sidebar)' }}>
          <div className="avatar">{user?.name?.charAt(0) || 'U'}</div>
          <div>
            <div className="user-name" style={{ color: '#fff', fontSize: '0.85rem' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>{user?.role || 'USER'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
