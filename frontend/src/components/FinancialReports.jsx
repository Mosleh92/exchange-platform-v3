import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useRBAC, PERMISSIONS } from '../contexts/RBACContext';
import PersianUtils from '../utils/persian';
import PersianCalendar from '../utils/persianCalendar';
import '../styles/rtl.css';

const FinancialReports = () => {
  const { hasPermission } = useRBAC();
  const [dateRange, setDateRange] = useState('month'); // today, week, month, quarter, year, custom
  const [reportType, setReportType] = useState('overview'); // overview, profit-loss, currency, customer
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'transactions', 'profit']);

  const chartColors = ['#1746A2', '#D4AF37', '#059669', '#DC2626', '#D97706', '#7C3AED', '#0891B2'];

  const availableMetrics = [
    { key: 'revenue', label: 'درآمد', color: '#1746A2' },
    { key: 'transactions', label: 'تعداد تراکنش', color: '#D4AF37' },
    { key: 'profit', label: 'سود', color: '#059669' },
    { key: 'commission', label: 'کارمزد', color: '#DC2626' },
    { key: 'customers', label: 'مشتریان جدید', color: '#D97706' },
    { key: 'exchanges', label: 'تبدیل ارز', color: '#7C3AED' }
  ];

  const reportTypes = [
    { key: 'overview', label: 'نمای کلی', description: 'آمار کلی عملکرد' },
    { key: 'profit-loss', label: 'سود و زیان', description: 'گزارش مالی تفصیلی' },
    { key: 'currency', label: 'تحلیل ارزی', description: 'عملکرد بر اساس ارز' },
    { key: 'customer', label: 'تحلیل مشتری', description: 'رفتار و عملکرد مشتریان' },
    { key: 'branch', label: 'تحلیل شعبه', description: 'مقایسه عملکرد شعبات' }
  ];

  useEffect(() => {
    // Apply RTL styling
    document.body.classList.add('rtl-container');
    document.documentElement.dir = 'rtl';
    
    generateReportData();
    
    return () => {
      document.body.classList.remove('rtl-container');
    };
  }, [dateRange, reportType, customDateRange]);

  const generateReportData = () => {
    setLoading(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      const data = generateSampleReportData();
      setReportData(data);
      setLoading(false);
    }, 1000);
  };

  const generateSampleReportData = () => {
    const days = dateRange === 'today' ? 1 : 
                 dateRange === 'week' ? 7 : 
                 dateRange === 'month' ? 30 : 
                 dateRange === 'quarter' ? 90 : 
                 dateRange === 'year' ? 365 : 30;

    const dailyData = [];
    const currencyData = [];
    const customerSegments = [];
    const branchData = [];

    // Generate daily data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      dailyData.push({
        date: PersianCalendar.format(date, 'jMM/jDD'),
        fullDate: date,
        revenue: Math.floor(Math.random() * 50000000) + 10000000,
        transactions: Math.floor(Math.random() * 100) + 20,
        profit: Math.floor(Math.random() * 10000000) + 2000000,
        commission: Math.floor(Math.random() * 5000000) + 1000000,
        customers: Math.floor(Math.random() * 20) + 5,
        exchanges: Math.floor(Math.random() * 50) + 10
      });
    }

    // Generate currency data
    const currencies = ['USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD'];
    currencies.forEach(currency => {
      currencyData.push({
        currency,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        transactions: Math.floor(Math.random() * 500) + 50,
        profit: Math.floor(Math.random() * 5000000) + 500000,
        profitMargin: (Math.random() * 3 + 1).toFixed(2)
      });
    });

    // Generate customer segments
    customerSegments.push(
      { name: 'مشتریان VIP', value: 25, amount: 150000000 },
      { name: 'مشتریان عادی', value: 65, amount: 80000000 },
      { name: 'مشتریان جدید', value: 10, amount: 20000000 }
    );

    // Generate branch data
    const branches = ['شعبه مرکزی', 'شعبه شمال', 'شعبه جنوب', 'شعبه غرب'];
    branches.forEach(branch => {
      branchData.push({
        name: branch,
        revenue: Math.floor(Math.random() * 100000000) + 20000000,
        transactions: Math.floor(Math.random() * 200) + 50,
        profit: Math.floor(Math.random() * 20000000) + 5000000,
        customers: Math.floor(Math.random() * 100) + 30
      });
    });

    return {
      daily: dailyData,
      currency: currencyData,
      customerSegments,
      branches: branchData,
      summary: {
        totalRevenue: dailyData.reduce((sum, day) => sum + day.revenue, 0),
        totalTransactions: dailyData.reduce((sum, day) => sum + day.transactions, 0),
        totalProfit: dailyData.reduce((sum, day) => sum + day.profit, 0),
        totalCommission: dailyData.reduce((sum, day) => sum + day.commission, 0),
        totalCustomers: dailyData.reduce((sum, day) => sum + day.customers, 0),
        avgDailyRevenue: dailyData.reduce((sum, day) => sum + day.revenue, 0) / dailyData.length,
        profitMargin: ((dailyData.reduce((sum, day) => sum + day.profit, 0) / 
                       dailyData.reduce((sum, day) => sum + day.revenue, 0)) * 100).toFixed(2)
      }
    };
  };

  const getDateRangeText = () => {
    switch (dateRange) {
      case 'today': return 'امروز';
      case 'week': return 'هفته گذشته';
      case 'month': return 'ماه گذشته';
      case 'quarter': return 'سه ماه گذشته';
      case 'year': return 'سال گذشته';
      case 'custom': return `${customDateRange.start} تا ${customDateRange.end}`;
      default: return 'ماه گذشته';
    }
  };

  const exportReport = (format) => {
    if (!reportData) return;
    
    // Simulate export functionality
    const fileName = `گزارش_${reportType}_${getDateRangeText()}.${format}`;
    alert(`در حال دانلود ${fileName}`);
  };

  const formatPersianNumber = (num) => {
    return PersianUtils.formatNumber(num, true);
  };

  const formatCurrency = (amount) => {
    return PersianUtils.currency.formatAdvanced(amount, 'IRR', { abbreviated: true });
  };

  if (!hasPermission(PERMISSIONS.VIEW_FINANCIAL_REPORTS)) {
    return (
      <div className="rtl-container min-h-screen bg-gray-50 flex items-center justify-center font-persian">
        <div className="persian-card p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-bold text-red-600 mb-2">دسترسی محدود</h3>
          <p className="text-gray-600">شما دسترسی مشاهده گزارشات مالی را ندارید.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rtl-container min-h-screen bg-gray-50 font-persian">
      <div className="container mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-primary-persian mb-2">گزارشات مالی</h1>
              <p className="text-gray-600">تحلیل عملکرد مالی و آماری</p>
            </div>
            <div className="flex space-x-3 space-x-reverse">
              <button
                onClick={() => exportReport('pdf')}
                className="btn-persian-secondary"
                disabled={loading || !reportData}
              >
                📄 خروجی PDF
              </button>
              <button
                onClick={() => exportReport('excel')}
                className="btn-persian-primary"
                disabled={loading || !reportData}
              >
                📊 خروجی اکسل
              </button>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="persian-card mb-6"
        >
          <div className="persian-card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع گزارش</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {reportTypes.map(type => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">بازه زمانی</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="today">امروز</option>
                  <option value="week">هفته گذشته</option>
                  <option value="month">ماه گذشته</option>
                  <option value="quarter">سه ماه گذشته</option>
                  <option value="year">سال گذشته</option>
                  <option value="custom">دلخواه</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">از تاریخ</label>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تا تاریخ</label>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Refresh Button */}
              <div className="flex items-end">
                <button
                  onClick={generateReportData}
                  disabled={loading}
                  className="w-full btn-persian-primary disabled:opacity-50"
                >
                  {loading ? 'در حال بارگذاری...' : '🔄 تازه‌سازی'}
                </button>
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نمایش معیارها</label>
              <div className="flex flex-wrap gap-2">
                {availableMetrics.map(metric => (
                  <button
                    key={metric.key}
                    onClick={() => {
                      setSelectedMetrics(prev => 
                        prev.includes(metric.key) 
                          ? prev.filter(m => m !== metric.key)
                          : [...prev, metric.key]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedMetrics.includes(metric.key)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="persian-card mb-6"
          >
            <div className="persian-card-body text-center py-12">
              <div className="persian-loading mx-auto mb-4"></div>
              <p className="text-gray-600">در حال تولید گزارش...</p>
            </div>
          </motion.div>
        )}

        {/* Report Content */}
        {!loading && reportData && (
          <AnimatePresence>
            {/* Summary Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              <div className="persian-stat-card">
                <div className="persian-stat-icon">💰</div>
                <div className="persian-stat-value">{formatCurrency(reportData.summary.totalRevenue)}</div>
                <div className="persian-stat-label">کل درآمد</div>
              </div>
              
              <div className="persian-stat-card">
                <div className="persian-stat-icon">💱</div>
                <div className="persian-stat-value">{formatPersianNumber(reportData.summary.totalTransactions)}</div>
                <div className="persian-stat-label">تعداد تراکنش</div>
              </div>
              
              <div className="persian-stat-card">
                <div className="persian-stat-icon">📈</div>
                <div className="persian-stat-value">{formatCurrency(reportData.summary.totalProfit)}</div>
                <div className="persian-stat-label">کل سود</div>
              </div>
              
              <div className="persian-stat-card">
                <div className="persian-stat-icon">📊</div>
                <div className="persian-stat-value">{reportData.summary.profitMargin}%</div>
                <div className="persian-stat-label">حاشیه سود</div>
              </div>
            </motion.div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Main Trend Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="persian-card"
              >
                <div className="persian-card-header">
                  <h3 className="text-lg font-semibold">روند عملکرد - {getDateRangeText()}</h3>
                </div>
                <div className="persian-card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={reportData.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => `تاریخ: ${value}`}
                        formatter={(value, name) => [
                          name === 'revenue' ? formatCurrency(value) : formatPersianNumber(value),
                          name === 'revenue' ? 'درآمد' : 
                          name === 'transactions' ? 'تراکنش' : 
                          name === 'profit' ? 'سود' : name
                        ]}
                      />
                      {selectedMetrics.map((metric, index) => (
                        <Area
                          key={metric}
                          type="monotone"
                          dataKey={metric}
                          stroke={chartColors[index % chartColors.length]}
                          fill={chartColors[index % chartColors.length]}
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Currency Performance */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="persian-card"
              >
                <div className="persian-card-header">
                  <h3 className="text-lg font-semibold">عملکرد ارزها</h3>
                </div>
                <div className="persian-card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.currency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="currency" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'volume' ? formatCurrency(value, 'USD') : formatPersianNumber(value),
                          name === 'volume' ? 'حجم معاملات' : 
                          name === 'transactions' ? 'تعداد تراکنش' : 
                          name === 'profit' ? 'سود' : name
                        ]}
                      />
                      <Bar dataKey="volume" fill="#1746A2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Customer Segments */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="persian-card"
              >
                <div className="persian-card-header">
                  <h3 className="text-lg font-semibold">بخش‌بندی مشتریان</h3>
                </div>
                <div className="persian-card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.customerSegments}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {reportData.customerSegments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Branch Comparison */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="persian-card"
              >
                <div className="persian-card-header">
                  <h3 className="text-lg font-semibold">مقایسه شعبات</h3>
                </div>
                <div className="persian-card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.branches} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar dataKey="revenue" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Currency Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="persian-card"
              >
                <div className="persian-card-header">
                  <h3 className="text-lg font-semibold">جزئیات عملکرد ارزها</h3>
                </div>
                <div className="persian-card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full rtl-table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-right">ارز</th>
                          <th className="px-4 py-3 text-right">حجم</th>
                          <th className="px-4 py-3 text-right">تراکنش</th>
                          <th className="px-4 py-3 text-right">سود</th>
                          <th className="px-4 py-3 text-right">حاشیه</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.currency.map((curr) => (
                          <tr key={curr.currency}>
                            <td className="px-4 py-3 font-medium">{curr.currency}</td>
                            <td className="px-4 py-3">{formatCurrency(curr.volume, curr.currency)}</td>
                            <td className="px-4 py-3">{formatPersianNumber(curr.transactions)}</td>
                            <td className="px-4 py-3">{formatCurrency(curr.profit)}</td>
                            <td className="px-4 py-3">{curr.profitMargin}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>

              {/* Branch Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="persian-card"
              >
                <div className="persian-card-header">
                  <h3 className="text-lg font-semibold">جزئیات عملکرد شعبات</h3>
                </div>
                <div className="persian-card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full rtl-table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-right">شعبه</th>
                          <th className="px-4 py-3 text-right">درآمد</th>
                          <th className="px-4 py-3 text-right">تراکنش</th>
                          <th className="px-4 py-3 text-right">مشتری</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.branches.map((branch) => (
                          <tr key={branch.name}>
                            <td className="px-4 py-3 font-medium">{branch.name}</td>
                            <td className="px-4 py-3">{formatCurrency(branch.revenue)}</td>
                            <td className="px-4 py-3">{formatPersianNumber(branch.transactions)}</td>
                            <td className="px-4 py-3">{formatPersianNumber(branch.customers)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default FinancialReports;