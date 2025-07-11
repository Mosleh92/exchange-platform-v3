import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const DataChart = ({
  type = 'line',
  data,
  options = {},
  title,
  height = 300,
  className = '',
  isLoading = false
}) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          font: {
            family: 'Vazir, sans-serif',
            size: 12
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          family: 'Vazir, sans-serif',
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        titleFont: {
          family: 'Vazir, sans-serif'
        },
        bodyFont: {
          family: 'Vazir, sans-serif'
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('fa-IR').format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: type !== 'doughnut' ? {
      x: {
        ticks: {
          font: {
            family: 'Vazir, sans-serif'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        ticks: {
          font: {
            family: 'Vazir, sans-serif'
          },
          callback: function(value) {
            return new Intl.NumberFormat('fa-IR').format(value);
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    } : undefined,
    ...options
  };

  const chartComponents = {
    line: Line,
    bar: Bar,
    doughnut: Doughnut
  };

  const ChartComponent = chartComponents[type] || Line;

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>
        )}
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>داده‌ای برای نمایش وجود ندارد</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div style={{ height: `${height}px` }}>
        <ChartComponent data={data} options={defaultOptions} />
      </div>
    </div>
  );
};

export default DataChart;