import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const TITLES = {
  '/dashboard': 'dashboard',
  '/tasks': 'tasks',
  '/kanban': 'kanban',
  '/calendar': 'calendar',
  '/projects': 'projects',
  '/teams': 'teams',
  '/notifications': 'notifications',
  '/analytics': 'analytics',
  '/profile': 'profile',
  '/settings': 'settings',
  '/admin': 'admin',
};

/**
 * Authenticated shell: `.app-layout` > sidebar + `.main-content` > topbar + page.
 * Replaces renderSidebar()/renderTopbar()/ensureSidebarOverlay().
 */
export default function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = TITLES[location.pathname] || location.pathname.replace('/', '') || 'taskflow';

  // Close the mobile drawer when navigating (the original called closeSidebar()).
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open (original toggleSidebar behavior).
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        <Topbar title={title} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
