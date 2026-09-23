import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { initSocket, registerGlobalSocketHandlers, useSocketEvent } from '../lib/socket';

const AppContext = createContext(null);

/**
 * Holds the bits of state the original pages kept in module scope / localStorage:
 * the signed-in user, the unread notification count and the socket connection.
 */
export function AppProvider({ children }) {
  const [user, setUserState] = useState(() => api.getUser());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (api.isAuthenticated()) {
      registerGlobalSocketHandlers();
      initSocket();
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await api.getNotifications({ unread: 'true', limit: 1 });
      setUnreadCount(result?.unreadCount || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (api.isAuthenticated()) refreshUnreadCount();
  }, [refreshUnreadCount]);

  useSocketEvent('notification', () => refreshUnreadCount(), [refreshUnreadCount]);

  const setUser = useCallback((nextUser) => {
    api.setUser(nextUser);
    setUserState(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setUserState(null);
    setUnreadCount(0);
    window.location.href = '/login';
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      logout,
      isAdmin: user?.role === 'ADMIN',
      unreadCount,
      refreshUnreadCount,
      setUnreadCount,
    }),
    [user, setUser, logout, unreadCount, refreshUnreadCount],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}
