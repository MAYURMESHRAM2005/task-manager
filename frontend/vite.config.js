import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app talks to the Spring Boot backend. In development the API and
// WebSocket calls are proxied so the app can also run same-origin, exactly like
// the nginx setup used in production. Set VITE_API_BASE_URL / VITE_WS_URL to
// bypass the proxy and hit an absolute backend URL instead.
const BACKEND = process.env.BACKEND_ORIGIN || 'http://localhost:8080';

const proxy = {
  '/api': { target: BACKEND, changeOrigin: true },
  '/ws': { target: BACKEND, changeOrigin: true, ws: true },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
    proxy,
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
    proxy,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
