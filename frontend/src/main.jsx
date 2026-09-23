import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ToastContainer from './components/ToastContainer';
import { AppProvider } from './context/AppContext';
import { initTheme } from './lib/theme';

// Same boot steps as the original pages: apply the saved theme and register the
// service worker.
initTheme();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
        <ToastContainer />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
