import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import { useSocketEvent } from '../lib/socket';
import { Pagination, Spinner, timeAgo } from '../lib/format';

const ICONS = {
  TASK_ASSIGNED: '📋',
  TASK_REASSIGNED: '🔄',
  TASK_COMPLETED: '✅',
  TASK_DUE_SOON: '⏰',
  TASK_OVERDUE: '⚠️',
  TASK_REMINDER: '🔔',
  PROJECT_MEMBER_ADDED: '📁',
  TEAM_INVITATION: '👥',
  COMMENT_ADDED: '💬',
  ROLE_CHANGED: '🔑',
  ACCOUNT_DEACTIVATED: '🚫',
};

export default function Notifications() {
  const { refreshUnreadCount, setUnreadCount } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageRef = useRef(1);

  const loadNotifications = useCallback(
    async (page = 1) => {
      pageRef.current = page;
      setLoading(true);
      setError('');
      try {
        const result = await api.getNotifications({ page, limit: 20 });
        setNotifications(result.data || []);
        setPagination(result.pagination);
        setUnread(result.unreadCount || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  // Real-time: reload the list and toast on new notifications.
  useSocketEvent(
    'notification',
    () => {
      loadNotifications(pageRef.current);
    },
    [loadNotifications],
  );

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((current) =>
        current.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnread((current) => (current > 0 ? current - 1 : 0));
      refreshUnreadCount();
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      showToast('All notifications marked as read', 'success');
      setUnread(0);
      setUnreadCount(0);
      loadNotifications(pageRef.current);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="flex-between mb-20">
        <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
          {pagination ? `${unread} unread · ${pagination.total} total` : ''}
        </h2>
        <button className="btn btn-outline" onClick={markAllRead}>
          Mark All as Read
        </button>
      </div>

      <div className="card">
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="empty-state">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications</h3>
            <p>You are all caught up!</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              className={`notification-item ${notification.isRead ? '' : 'unread'}`}
              key={notification._id}
              onClick={() => markRead(notification._id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 2 }}>
                  {ICONS[notification.type] || '📌'}
                </span>
                <div style={{ flex: 1 }}>
                  <div>{notification.message}</div>
                  <div className="notif-time">
                    {timeAgo(notification.createdAt)} · {notification.type.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination pagination={pagination} onChange={(page) => loadNotifications(page)} />
    </>
  );
}
