// ─── Real-time client (native WebSocket -> Spring Boot /ws) ───────────────
// Same protocol as the original frontend/js/api.js: a singleton connection that
// emits `{ event, data }` frames to registered listeners.
import api from './api';
import { resolveWsUrl } from '../config';
import { showToast } from './toast';
import { useEffect } from 'react';

const listeners = {};
let socket = null;

function emit(event, data) {
  (listeners[event] || []).forEach((handler) => {
    try {
      handler(data);
    } catch (e) {
      console.error('[Socket] Handler error:', e);
    }
  });
}

export function initSocket() {
  if (socket || !api.isAuthenticated()) return socket;
  try {
    const ws = new WebSocket(`${resolveWsUrl()}?token=${encodeURIComponent(api.getToken())}`);
    socket = { ws };
    ws.onopen = () => {
      console.log('[Socket] Connected');
      emit('connect');
    };
    ws.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data);
        if (payload && payload.event) emit(payload.event, payload.data);
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => {
      console.log('[Socket] Disconnected');
      socket = null;
      emit('disconnect');
    };
    ws.onerror = () => emit('connect_error', { message: 'WebSocket error' });
    return socket;
  } catch (e) {
    console.error('[Socket] Init error:', e);
    return null;
  }
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    try {
      socket.ws.close();
    } catch {
      /* ignore */
    }
    socket = null;
  }
}

/** Subscribes to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler, deps = []) {
  useEffect(() => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(handler);
    return () => {
      listeners[event] = (listeners[event] || []).filter((h) => h !== handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Global handler kept from the original client: every incoming notification
// raises a toast. Pages can subscribe on top of this.
export function registerGlobalSocketHandlers() {
  const handler = (data) => {
    if (data?.message) showToast(data.message, 'info');
  };
  listeners.notification = listeners.notification || [];
  if (!listeners.notification.includes(handler)) listeners.notification.push(handler);
}
