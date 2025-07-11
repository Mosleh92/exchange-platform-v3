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

// Register Chart.js components
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

/**
 * Daily/Monthly Transaction Chart Component
 */
export const TransactionChart = ({ data, timeframe = 'daily' }) => {
  const chartData = {
    labels: data?.labels || [],
    datasets: [
      {
        label: `${timeframe === 'daily' ? 'Daily' : 'Monthly'} Transactions`,
        data: data?.values || [],
        borderColor: '#1746A2',
        backgroundColor: 'rgba(23, 70, 162, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${timeframe === 'daily' ? 'Daily' : 'Monthly'} Transaction Volume`,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('fa-IR').format(value);
          },
        },
      },
      x: {
        ticks: {
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Line data={chartData} options={options} />
    </div>
  );
};

/**
 * User Activity Chart Component
 */
export const UserActivityChart = ({ data }) => {
  const chartData = {
    labels: data?.labels || ['فعال', 'غیرفعال', 'جدید'],
    datasets: [
      {
        label: 'تعداد کاربران',
        data: data?.values || [0, 0, 0],
        backgroundColor: [
          '#10B981', // Green for active
          '#EF4444', // Red for inactive
          '#3B82F6', // Blue for new
        ],
        borderColor: [
          '#059669',
          '#DC2626',
          '#2563EB',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
      title: {
        display: true,
        text: 'فعالیت کاربران',
        font: {
          size: 16,
          weight: 'bold',
          family: 'Vazir, sans-serif',
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

/**
 * Branch Revenue Chart Component
 */
export const BranchRevenueChart = ({ data }) => {
  const chartData = {
    labels: data?.labels || [],
    datasets: [
      {
        label: 'درآمد (تومان)',
        data: data?.values || [],
        backgroundColor: 'rgba(23, 70, 162, 0.7)',
        borderColor: '#1746A2',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
      title: {
        display: true,
        text: 'درآمد شعبات',
        font: {
          size: 16,
          weight: 'bold',
          family: 'Vazir, sans-serif',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
          },
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
      x: {
        ticks: {
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Bar data={chartData} options={options} />
    </div>
  );
};

/**
 * Exchange Rate Trend Chart
 */
export const ExchangeRateChart = ({ data, currency = 'USD' }) => {
  const chartData = {
    labels: data?.labels || [],
    datasets: [
      {
        label: `نرخ ${currency}/IRR`,
        data: data?.values || [],
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
      title: {
        display: true,
        text: `روند نرخ ارز ${currency}`,
        font: {
          size: 16,
          weight: 'bold',
          family: 'Vazir, sans-serif',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('fa-IR').format(value);
          },
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
      x: {
        ticks: {
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Line data={chartData} options={options} />
    </div>
  );
};

/**
 * Profit/Loss Analytics Chart
 */
export const ProfitLossChart = ({ data }) => {
  const chartData = {
    labels: data?.labels || [],
    datasets: [
      {
        label: 'سود',
        data: data?.profit || [],
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: '#10B981',
        borderWidth: 1,
      },
      {
        label: 'زیان',
        data: data?.loss || [],
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: '#EF4444',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
      title: {
        display: true,
        text: 'تحلیل سود و زیان',
        font: {
          size: 16,
          weight: 'bold',
          family: 'Vazir, sans-serif',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
          },
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
      x: {
        ticks: {
          font: {
            family: 'Vazir, sans-serif',
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Bar data={chartData} options={options} />
    </div>
  );
};

/**
 * Dashboard Analytics Component
 * Combines multiple charts for management overview
 */
export const DashboardAnalytics = ({ 
  transactionData, 
  userActivityData, 
  branchRevenueData, 
  exchangeRateData,
  profitLossData 
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransactionChart data={transactionData} timeframe="daily" />
        <UserActivityChart data={userActivityData} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BranchRevenueChart data={branchRevenueData} />
        <ExchangeRateChart data={exchangeRateData} currency="USD" />
      </div>
      
      <div className="w-full">
        <ProfitLossChart data={profitLossData} />
      </div>
    </div>
  );
};

export default {
  TransactionChart,
  UserActivityChart,
  BranchRevenueChart,
  ExchangeRateChart,
  ProfitLossChart,
  DashboardAnalytics,
};