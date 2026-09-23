import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import { showToast } from '../lib/toast';
import ChartCanvas from '../components/ChartCanvas';
import { ScoreRing, Spinner, StatusBadge, PriorityBadge, formatDate } from '../lib/format';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
  const { refreshUnreadCount } = useApp();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.getDashboardStats();
        const data = result.data.stats;
        if (cancelled) return;
        setStats(data);

        if (data.upcomingTasks > 0) {
          const tasksResult = await api.getTasks({ sortBy: 'dueDate', sortOrder: 'asc', limit: 10 });
          const list = (tasksResult.data || []).filter(
            (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED',
          );
          if (!cancelled) setUpcoming(list);
        }
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
        plugins: {
          ...plugins,
          legend: { position: 'bottom', labels: { color: t.legendColor, usePointStyle: true, padding: 16 } },
        },
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

  const monthlyChart = useCallback(
    (t, _scales, plugins) => {
      const monthlyData = new Array(30).fill(0);
      (stats?.monthlyCompleted || []).forEach((m) => {
        monthlyData[m._id - 1] = m.count;
      });
      return {
        type: 'bar',
        data: {
          labels: Array.from({ length: 30 }, (_, i) => i + 1),
          datasets: [{ label: 'Completed', data: monthlyData, backgroundColor: '#6366f1' }],
        },
        options: {
          plugins: { ...plugins, legend: { display: false } },
          scales: {
            x: {
              ticks: { color: t.textColor, maxTicksLimit: 10 },
              grid: { color: t.gridColor },
              border: { color: t.borderColor },
            },
            y: {
              ticks: { color: t.textColor, stepSize: 1 },
              grid: { color: t.gridColor },
              border: { color: t.borderColor },
            },
          },
        },
      };
    },
    [stats],
  );

  if (loading) return <Spinner />;
  if (!stats) return null;

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing percentage={stats.productivityScore} />
          <div>
            <div className="stat-label">Productivity Score</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Based on completion rate</div>
          </div>
        </div>
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
          <div className="stat-icon red">⚠️</div>
          <div className="stat-value">{stats.overdueTasks}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📅</div>
          <div className="stat-value">{stats.todayTasks}</div>
          <div className="stat-label">Due Today</div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-container">
          <h3>Tasks by Status</h3>
          <ChartCanvas factory={statusChart} />
        </div>
        <div className="chart-container">
          <h3>Tasks by Priority</h3>
          <ChartCanvas factory={priorityChart} />
        </div>
        <div className="chart-container">
          <h3>Weekly Completions</h3>
          <ChartCanvas factory={weeklyChart} />
        </div>
        <div className="chart-container">
          <h3>Completion Trend (30 days)</h3>
          <ChartCanvas factory={monthlyChart} />
        </div>
      </div>

      <div className="card mt-20">
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>📅 Upcoming Tasks (This Week)</h3>
        {upcoming.length > 0 ? (
          upcoming.map((task) => (
            <div className="activity-item" key={task._id}>
              <div
                className="activity-dot"
                style={{
                  background:
                    task.priority === 'URGENT'
                      ? 'var(--danger)'
                      : task.priority === 'HIGH'
                        ? 'var(--warning)'
                        : 'var(--info)',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{task.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {formatDate(task.dueDate)} · {task.assignedTo ? task.assignedTo.name : 'Unassigned'}
                </div>
              </div>
              <StatusBadge status={task.status} /> <PriorityBadge priority={task.priority} />
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>No upcoming tasks</p>
          </div>
        )}
      </div>
    </>
  );
}
