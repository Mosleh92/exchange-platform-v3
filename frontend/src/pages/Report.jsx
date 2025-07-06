// src/pages/Report.jsx - Enhanced version
import React, { useState, useEffect } from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
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

const Report = () => {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('last7days');
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [reportData, setReportData] = useState({});

  const currencies = ['USD', 'AED', 'EUR', 'CNY', 'TRY', 'CAD'];

  useEffect(() => {
    generateReportData();
  }, [reportType, dateRange, selectedCurrency]);

  const generateReportData = () => {
    // Generate mock data for demo
    const mockData = {
      overview: {
        totalTransactions: 1250,
        totalVolume: 2500000,
        totalCustomers: 348,
        totalRemittances: 89,
        profitMargin: 12.5,
        
        dailyTransactions: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Transactions',
            data: [45, 52, 38, 61, 55, 42, 67],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
          }]
        },

        currencyDistribution: {
          labels: ['USD', 'AED', 'EUR', 'CNY', 'IRR'],
          datasets: [{
            data: [35, 25, 15, 15, 10],
            backgroundColor: [
              '#3B82F6',
              '#10B981',
              '#F59E0B',
              '#EF4444',
              '#8B5CF6'
            ]
          }]
        },

        monthlyRevenue: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue ($)',
            data: [45000, 52000, 48000, 61000, 55000, 67000],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
          }]
        }
      },

      customers: {
        totalCustomers: 348,
        activeCustomers: 245,
        newCustomers: 23,
        topCustomers: [
          { name: 'احمد محمدی', transactions: 45, volume: 125000 },
          { name: 'فاطمه رضایی', transactions: 38, volume: 98000 },
          { name: 'علی احمدی', transactions: 32, volume: 87000 },
        ],
        
        customerGrowth: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          datasets: [{
            label: 'New Customers',
            data: [12, 19, 15, 23],
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
          }]
        }
      },

      financial: {
        totalRevenue: 328000,
        totalExpenses: 45000,
        netProfit: 283000,
        profitMargin: 86.3,
        
        revenueByService: {
          labels: ['Exchange', 'Remittance', 'P2P Commission', 'Other'],
          datasets: [{
            data: [65, 20, 10, 5],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
          }]
        },

        monthlyProfit: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              label: 'Revenue',
              data: [45000, 52000, 48000, 61000, 55000, 67000],
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
            },
            {
              label: 'Expenses',
              data: [8000, 9500, 7200, 12000, 8800, 9200],
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
            }
          ]
        }
      }
    };

    setReportData(mockData[reportType] || {});
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Reports & Analytics</h1>
              <p className="text-gray-600">Comprehensive business insights and analytics</p>
            </div>
            <div className="flex space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="last3months">Last 3 Months</option>
                <option value="last6months">Last 6 Months</option>
                <option value="lastyear">Last Year</option>
              </select>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700">
                📤 Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex space-x-4">
            {[
              { key: 'overview', label: 'Overview', icon: '📈' },
              { key: 'customers', label: 'Customers', icon: '👥' },
              { key: 'financial', label: 'Financial', icon: '💰' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setReportType(tab.key)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-colors ${
                  reportType === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Report */}
        {reportType === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Transactions</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.totalTransactions?.toLocaleString()}</p>
                    <p className="text-xs text-green-600">↗ +12% vs last period</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                    📊
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Volume</p>
                    <p className="text-2xl font-bold text-green-600">${reportData.totalVolume?.toLocaleString()}</p>
                    <p className="text-xs text-green-600">↗ +8% vs last period</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                    💰
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Customers</p>
                    <p className="text-2xl font-bold text-purple-600">{reportData.totalCustomers}</p>
                    <p className="text-xs text-green-600">↗ +5% vs last period</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                    👥
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Profit Margin</p>
                    <p className="text-2xl font-bold text-orange-600">{reportData.profitMargin}%</p>
                    <p className="text-xs text-red-600">↘ -2% vs last period</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                    📈
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Daily Transactions</h3>
                <Line data={reportData.dailyTransactions || {}} options={chartOptions} />
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Currency Distribution</h3>
                <Doughnut data={reportData.currencyDistribution || {}} />
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6 lg:col-span-2">
                <h3 className="text-xl font-semibold mb-4">Monthly Revenue</h3>
                <Bar data={reportData.monthlyRevenue || {}} options={chartOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Customer Report */}
        {reportType === 'customers' && (
          <div className="space-y-6">
            {/* Customer KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Customers</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.totalCustomers}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                    👥
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Customers</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.activeCustomers}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                    🟢
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">New This Month</p>
                    <p className="text-2xl font-bold text-purple-600">{reportData.newCustomers}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                    ⭐
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Customers */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Top Customers</h3>
                <div className="space-y-3">
                  {reportData.topCustomers?.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.transactions} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${customer.volume.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">volume</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Growth */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Customer Growth</h3>
                <Line data={reportData.customerGrowth || {}} options={chartOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Financial Report */}
        {reportType === 'financial' && (
          <div className="space-y-6">
            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">${reportData.totalRevenue?.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                    💰
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">${reportData.totalExpenses?.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
                    📉
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Net Profit</p>
                    <p className="text-2xl font-bold text-blue-600">${reportData.netProfit?.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                    📈
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Profit Margin</p>
                    <p className="text-2xl font-bold text-purple-600">{reportData.profitMargin}%</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                    📊
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Service */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Revenue by Service</h3>
                <Pie data={reportData.revenueByService || {}} />
              </div>

              {/* Monthly Profit */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Monthly Profit vs Expenses</h3>
                <Bar data={reportData.monthlyProfit || {}} options={chartOptions} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;