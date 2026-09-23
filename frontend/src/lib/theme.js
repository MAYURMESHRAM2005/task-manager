// ─── Theme handling ───────────────────────────────────────────────────────
import { STORAGE_KEYS } from '../config';

/** Applies the persisted theme (called once on boot, as initTheme() did). */
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  return saved;
}

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || '';
}

export function setTheme(theme) {
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem(STORAGE_KEYS.theme);
  }
  // Pages re-render their charts when the theme changes.
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  return theme;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

/** Resolves CSS custom properties used by the Chart.js theme. */
export function getChartTheme() {
  const isDark = getTheme() === 'dark';
  if (isDark) {
    return {
      textColor: '#A3A3A3',
      legendColor: '#E5E5E5',
      gridColor: '#242424',
      borderColor: '#333333',
      axisColor: '#525252',
      tooltipBg: '#0D0D0D',
      tooltipBorder: '#333333',
      tooltipTitle: '#FFFFFF',
      tooltipBody: '#D4D4D4',
      remainingColor: '#262626',
    };
  }
  const styles = getComputedStyle(document.documentElement);
  return {
    textColor: styles.getPropertyValue('--text').trim() || '#1e293b',
    legendColor: styles.getPropertyValue('--text').trim() || '#1e293b',
    gridColor: styles.getPropertyValue('--border').trim() || '#e2e8f0',
    borderColor: styles.getPropertyValue('--border').trim() || '#e2e8f0',
    axisColor: '#e2e8f0',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipTitle: '#1e293b',
    tooltipBody: '#475569',
    remainingColor: '#e2e8f0',
  };
}

export function getChartScales(t) {
  return {
    x: { ticks: { color: t.textColor }, grid: { color: t.gridColor }, border: { color: t.borderColor } },
    y: { ticks: { color: t.textColor, stepSize: 1 }, grid: { color: t.gridColor }, border: { color: t.borderColor } },
  };
}

export function getChartPlugins(t) {
  return {
    legend: { labels: { color: t.legendColor, usePointStyle: true, padding: 16 } },
    tooltip: {
      backgroundColor: t.tooltipBg,
      titleColor: t.tooltipTitle,
      bodyColor: t.tooltipBody,
      borderColor: t.tooltipBorder,
      borderWidth: 1,
    },
  };
}

/** Shared tooltip options used by the dashboard/analytics chart configs. */
export function tooltipOptions(t) {
  return {
    backgroundColor: t.tooltipBg,
    titleColor: t.tooltipTitle,
    bodyColor: t.tooltipBody,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
  };
}
