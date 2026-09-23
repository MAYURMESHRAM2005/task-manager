// ─── Toast notifications ──────────────────────────────────────────────────
// Replaces the original global showToast() DOM helper with a tiny emitter that
// the <ToastContainer /> component subscribes to.
const listeners = new Set();

export function showToast(message, type = 'info') {
  if (!message) return;
  listeners.forEach((listener) => listener({ id: `${Date.now()}-${Math.random()}`, message, type }));
}

export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
