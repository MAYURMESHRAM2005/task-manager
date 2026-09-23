import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import { useSocketEvent } from '../lib/socket';
import ChartCanvas from '../components/ChartCanvas';
import { ScoreRing, Spinner, StatusBadge, PriorityBadge, timeAgo } from '../lib/format';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { refreshUnreadCount } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.getDashboardStats();
        if (!cancelled) setStats(result.data.stats);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useSocketEvent('notification', () => refreshUnreadCount(), [refreshUnreadCount]);

  const statusChart = useCallback(
    (t, _scales, plugins) => ({
      type: 'doughnut',
      data: {
        labels: ['TODO', 'In Progress', 'Review', 'Completed', 'Cancelled'],
        datasets: [
          {
            data: [
              stats?.statusBreakdown?.TODO || 0,
              stats?.statusBreakdown?.IN_PROGRESS || 0,
              stats?.statusBreakdown?.REVIEW || 0,
              stats?.statusBreakdown?.COMPLETED || 0,
              stats?.statusBreakdown?.CANCELLED || 0,
            ],
            backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#22c55e', '#ef4444'],
          },
        ],
      },
      options: {
        plugins: { ...plugins, legend: { position: 'bottom', labels: { color: t.legendColor, usePointStyle: true, padding: 16 } } },
      },
    }),
    [stats],
  );

  const priorityChart = useCallback(
    (t, scales, plugins) => ({
      type: 'bar',
      data: {
        labels: ['Low', 'Medium', 'High', 'Urgent'],
        datasets: [
          {
            label: 'Tasks',
            data: [
              stats?.priorityBreakdown?.LOW || 0,
              stats?.priorityBreakdown?.MEDIUM || 0,
              stats?.priorityBreakdown?.HIGH || 0,
              stats?.priorityBreakdown?.URGENT || 0,
            ],
            backgroundColor: ['#22c55e', '#f59e0b', '#f97316', '#ef4444'],
          },
        ],
      },
      options: { plugins: { ...plugins, legend: { display: false } }, scales },
    }),
    [stats],
  );

  const weeklyChart = useCallback(
    (t, scales, plugins) => {
      const weeklyData = new Array(7).fill(0);
      (stats?.weeklyCompleted || []).forEach((w) => {
        weeklyData[w._id - 1] = w.count;
      });
      return {
        type: 'line',
        data: {
          labels: DAY_LABELS,
          datasets: [
            {
              label: 'Completed',
              data: weeklyData,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#6366f1',
              pointBorderColor: '#6366f1',
            },
          ],
        },
        options: { plugins: { ...plugins, legend: { display: false } }, scales },
      };
    },
    [stats],
  );

  const completionChart = useCallback(
    (t, _scales, plugins) => ({
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Remaining'],
        datasets: [
          {
            data: [stats?.completionPercentage || 0, 100 - (stats?.completionPercentage || 0)],
            backgroundColor: ['#22c55e', t.remainingColor],
          },
        ],
      },
      options: {
        cutout: '70%',
        plugins: { ...plugins, legend: { position: 'bottom', labels: { color: t.legendColor, usePointStyle: true, padding: 16 } } },
      },
    }),
    [stats],
  );

  if (loading) return <Spinner />;
  if (!stats) return null;

  const activity = stats.recentActivity || [];

  return (
    <>
      <div className="quick-actions">
        <button className="quick-action-btn" onClick={() => navigate('/tasks')}>
          ✅ My Tasks
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/calendar')}>
          📅 Calendar
        </button>
        <button className="quick-action-btn" onClick={() => navigate('/analytics')}>
          📈 Analytics
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div className="stat-value">{stats.totalTasks}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{stats.completedTasks}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">⏳</div>
          <div className="stat-value">{stats.pendingTasks}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🔄</div>
          <div className="stat-value">{stats.inProgressTasks}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⚠️</div>
          <div className="stat-value">{stats.overdueTasks}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      <div className="dashboard-dual-grid">
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>🎯 Productivity</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ScoreRing percentage={stats.productivityScore} />
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Tasks completed today: <strong>{stats.todayTasks}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Due this week: <strong>{stats.upcomingTasks}</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>📅 Upcoming</h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div>
              {stats.overdueTasks} overdue · {stats.todayTasks} due today · {stats.upcomingTasks} due this week
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Tasks by Status</h3>
          <ChartCanvas factory={statusChart} />
        </div>
        <div className="chart-container">
          <h3>Tasks by Priority</h3>
          <ChartCanvas factory={priorityChart} />
        </div>
        <div className="chart-container">
          <h3>Weekly Completed Tasks</h3>
          <ChartCanvas factory={weeklyChart} />
        </div>
        <div className="chart-container">
          <h3>Completion Rate</h3>
          <ChartCanvas factory={completionChart} />
        </div>
      </div>

      <div className="card mt-20">
        <h3 style={{ fontSize: '0.95rem', marginBottom: 12 }}>🕐 Recent Activity</h3>
        <ul className="activity-feed">
          {activity.length > 0 ? (
            activity.map((task) => {
              const color =
                task.status === 'COMPLETED'
                  ? 'var(--success)'
                  : task.status === 'IN_PROGRESS'
                    ? 'var(--warning)'
                    : 'var(--info)';
              return (
                <li className="activity-item" key={task._id}>
                  <div className="activity-dot" style={{ background: color }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{task.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <StatusBadge status={task.status} /> · <PriorityBadge priority={task.priority} /> ·{' '}
                      {timeAgo(task.updatedAt)}
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="activity-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)' }}>
              No recent activity
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
