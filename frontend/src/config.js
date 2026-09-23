// ─── TaskFlow frontend runtime configuration ──────────────────────────────
// Defaults are same-origin so the app works through the Vite dev proxy
// (vite.config.js) and through nginx in production. Override with
// VITE_API_BASE_URL / VITE_WS_URL (e.g. to hit the backend directly).
const env = import.meta.env || {};

export const API_BASE_URL = env.VITE_API_BASE_URL || '/api/v1';

/** Absolute WebSocket endpoint, derived from VITE_WS_URL or the page origin. */
export function resolveWsUrl() {
  if (env.VITE_WS_URL) return env.VITE_WS_URL;
  if (API_BASE_URL.startsWith('http')) {
    return API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') + '/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export const STORAGE_KEYS = {
  token: 'taskflow_token',
  refresh: 'taskflow_refresh',
  user: 'taskflow_user',
  theme: 'taskflow_theme',
};
