// ─── Formatting + badge helpers ───────────────────────────────────────────
// The original helpers returned HTML strings; here they become plain functions
// (text) plus small React components for the badges.
import { Link } from 'react-router-dom';

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const STATUS_BADGE_CLASS = {
  TODO: 'badge-todo',
  IN_PROGRESS: 'badge-progress',
  REVIEW: 'badge-progress',
  COMPLETED: 'badge-completed',
  CANCELLED: 'badge-cancelled',
};

export const PRIORITY_BADGE_CLASS = {
  LOW: 'badge-low',
  MEDIUM: 'badge-medium',
  HIGH: 'badge-high',
  URGENT: 'badge-urgent',
};

export const ROLE_BADGE_CLASS = {
  USER: 'badge-user',
  MANAGER: 'badge-manager',
  ADMIN: 'badge-admin',
};

export function statusLabel(status) {
  return String(status || '').replace('_', ' ');
}

export function statusBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || '';
}

export function priorityBadgeClass(priority) {
  return PRIORITY_BADGE_CLASS[priority] || '';
}

export function roleBadgeClass(role) {
  return ROLE_BADGE_CLASS[role] || '';
}

export function StatusBadge({ status }) {
  return <span className={`badge ${statusBadgeClass(status)}`}>{statusLabel(status)}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge ${priorityBadgeClass(priority)}`}>{priority}</span>;
}

export function RoleBadge({ role }) {
  return <span className={`badge ${roleBadgeClass(role)}`}>{role}</span>;
}

/** Tailwind-free inline pagination identical to the original markup. */
export function Pagination({ pagination, onChange, compact = false }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {compact ? '‹' : '‹ Prev'}
      </button>
      {pages.map((i) => (
        <button key={i} className={i === page ? 'active' : ''} onClick={() => onChange(i)}>
          {i}
        </button>
      ))}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        {compact ? '›' : 'Next ›'}
      </button>
    </div>
  );
}

export function ScoreRing({ percentage }) {
  const value = Number(percentage) || 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="score-ring">
      <svg width="100" height="100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="score-ring-value">{value}%</span>
    </div>
  );
}

export function ProgressBar({ percentage, colorClass = 'green' }) {
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${Number(percentage) || 0}%` }} />
    </div>
  );
}

export function Skeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton-card mb-10" />
      ))}
    </>
  );
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="empty-state">
      {icon ? <div className="empty-icon">{icon}</div> : null}
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="loading-overlay">
      <span className="loading-spinner" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export { Link };
