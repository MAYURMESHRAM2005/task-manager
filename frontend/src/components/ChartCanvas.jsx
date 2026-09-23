import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { getChartTheme, getChartScales, getChartPlugins } from '../lib/theme';

/**
 * Chart.js wrapper. Replaces the original `new Chart(canvas, config)` calls and
 * automatically re-renders when the theme changes.
 *
 * `factory(chartTheme, scales, plugins)` returns a Chart.js config.
 */
export default function ChartCanvas({ factory, height = 220, className = 'chart-container' }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const render = () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const t = getChartTheme();
      const config = factory(t, getChartScales(t), getChartPlugins(t));
      chartRef.current = new Chart(canvas, {
        responsive: true,
        maintainAspectRatio: false,
        ...config,
      });
    };

    render();
    window.addEventListener('themechange', render);
    return () => {
      window.removeEventListener('themechange', render);
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [factory]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height }} />
    </div>
  );
}
