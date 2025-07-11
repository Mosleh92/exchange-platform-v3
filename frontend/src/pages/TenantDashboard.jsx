import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import io from 'socket.io-client';
import PersianUtils from '../utils/persian';
import PersianCalendar from '../utils/persianCalendar';
import '../styles/rtl.css';

// Icons (you can replace with your preferred icon library)
const icons = {
  building: '🏢',
  users: '👥',
  transactions: '💱',
  money: '💰',
  chart: '📊',
  notification: '🔔',
  refresh: '🔄',
  settings: '⚙️'
};

const TenantDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeData, setRealtimeData] = useState({});
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const socketRef = useRef(null);

  const links = [
    { to: '/management/branches', label: 'مدیریت شعب', icon: icons.building, color: 'bg-blue-500', description: 'مدیریت شعبات و کارکرد آنها' },
    { to: '/customers', label: 'مدیریت مشتریان', icon: icons.users, color: 'bg-green-500', description: 'ثبت و مدیریت اطلاعات مشتریان' },
    { to: '/transactions', label: 'مدیریت معاملات', icon: icons.transactions, color: 'bg-purple-500', description: 'پیگیری و کنترل معاملات' },
    { to: '/remittances', label: 'مدیریت حواله‌ها', icon: icons.money, color: 'bg-orange-500', description: 'حواله‌های داخلی و بین‌المللی' },
    { to: '/reports', label: 'گزارشات مالی', icon: icons.chart, color: 'bg-red-500', description: 'گزارشات و تحلیل‌های مالی' },
    { to: '/settings', label: 'تنظیمات سیستم', icon: icons.settings, color: 'bg-gray-500', description: 'تنظیمات عمومی سیستم' },
  ];

  // Colors for charts
  const chartColors = ['#1746A2', '#D4AF37', '#059669', '#DC2626', '#D97706', '#7C3AED'];

  useEffect(() => {
    // Apply RTL styling
    document.body.classList.add('rtl-container');
    document.documentElement.dir = 'rtl';
    
    return () => {
      document.body.classList.remove('rtl-container');
    };
  }, []);

  useEffect(() => {
    fetchStats();
    setupWebSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/dashboard/tenant-stats');
      setStats(res.data);
      
      // Generate sample chart data for demonstration
      generateChartData();
      
    } catch (err) {
      console.error('Dashboard stats error:', err);
      setError('خطا در دریافت آمار داشبورد');
      
      // Fallback data for development
      setStats({
        branches: 5,
        customers: 1250,
        transactions: 8420,
        totalBalance: 45000000000,
        dailyTransactions: 156,
        monthlyGrowth: 12.5,
        activeUsers: 89,
        pendingApprovals: 23
      });
      generateChartData();
    }
    setLoading(false);
  };

  const setupWebSocket = () => {
    try {
      socketRef.current = io('/dashboard');
      
      socketRef.current.on('stats-update', (data) => {
        setRealtimeData(prev => ({ ...prev, ...data }));
        setLastUpdate(new Date());
      });
      
      socketRef.current.on('new-alert', (alert) => {
        setAlerts(prev => [alert, ...prev.slice(0, 4)]);
      });
      
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
  };

  const generateChartData = () => {
    // Generate sample data for the last 7 days
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: PersianCalendar.format(date, 'jMM/jDD'),
        transactions: Math.floor(Math.random() * 100) + 50,
        revenue: Math.floor(Math.random() * 10000000) + 5000000,
        customers: Math.floor(Math.random() * 20) + 10
      });
    }
    setChartData(data);
  };

  const formatPersianNumber = (num) => {
    return PersianUtils.formatNumber(num, true);
  };

  const formatCurrency = (amount) => {
    return PersianUtils.currency.formatAdvanced(amount, 'IRR', { abbreviated: true });
  };

  if (loading) {
    return (
      <div className="rtl-container min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="persian-loading mx-auto mb-4"></div>
          <p className="text-gray-600 font-persian">در حال بارگذاری داشبورد...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="rtl-container min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="persian-card p-8 text-center"
        >
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-600 mb-2 font-persian">خطا در بارگذاری</h3>
          <p className="text-gray-600 mb-4 font-persian">{error}</p>
          <button 
            onClick={fetchStats}
            className="btn-persian-primary"
          >
            تلاش مجدد
          </button>
        </motion.div>
      </div>
    );
  }

  const effectiveStats = { ...stats, ...realtimeData };

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
              <h1 className="text-3xl font-bold text-primary-persian mb-2">داشبورد مدیریت صرافی</h1>
              <p className="text-gray-600">نمای کلی عملکرد سیستم و شعبات</p>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-500">آخرین بروزرسانی</div>
              <div className="text-sm font-medium">
                {PersianCalendar.formatWithTime(lastUpdate)}
              </div>
            </div>
          </div>
          
          {/* Alerts */}
          <AnimatePresence>
            {alerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"
              >
                <div className="flex items-center text-yellow-800">
                  <span className="ml-2">{icons.notification}</span>
                  <span className="font-medium">اعلان‌های جدید</span>
                </div>
                <div className="mt-2 text-sm text-yellow-700">
                  {alerts[0]?.message || 'اعلان جدیدی دریافت شد'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="persian-stat-card">
            <div className="persian-stat-icon">🏢</div>
            <div className="persian-stat-value">{formatPersianNumber(effectiveStats.branches || 0)}</div>
            <div className="persian-stat-label">تعداد شعب</div>
          </div>
          
          <div className="persian-stat-card">
            <div className="persian-stat-icon">👥</div>
            <div className="persian-stat-value">{formatPersianNumber(effectiveStats.customers || 0)}</div>
            <div className="persian-stat-label">تعداد مشتریان</div>
          </div>
          
          <div className="persian-stat-card">
            <div className="persian-stat-icon">💱</div>
            <div className="persian-stat-value">{formatPersianNumber(effectiveStats.transactions || 0)}</div>
            <div className="persian-stat-label">تعداد معاملات</div>
          </div>
          
          <div className="persian-stat-card">
            <div className="persian-stat-icon">💰</div>
            <div className="persian-stat-value">{formatCurrency(effectiveStats.totalBalance || 0)}</div>
            <div className="persian-stat-label">کل موجودی</div>
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Transaction Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="persian-card"
          >
            <div className="persian-card-header">
              <h3 className="text-lg font-semibold">نمودار معاملات هفتگی</h3>
            </div>
            <div className="persian-card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `تاریخ: ${value}`}
                    formatter={(value, name) => [formatPersianNumber(value), name === 'transactions' ? 'تعداد معاملات' : 'درآمد']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="transactions" 
                    stroke="#1746A2" 
                    strokeWidth={3}
                    dot={{ fill: '#1746A2', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="persian-card"
          >
            <div className="persian-card-header">
              <h3 className="text-lg font-semibold">نمودار درآمد هفتگی</h3>
            </div>
            <div className="persian-card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `تاریخ: ${value}`}
                    formatter={(value) => [formatCurrency(value), 'درآمد']}
                  />
                  <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Management Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {links.map((link, index) => (
            <motion.a
              key={link.to}
              href={link.to}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="block no-underline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className="persian-card h-full">
                <div className="persian-card-body">
                  <div className="flex items-start space-x-4 space-x-reverse">
                    <div className={`w-12 h-12 ${link.color} rounded-lg flex items-center justify-center text-white text-2xl`}>
                      {link.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{link.label}</h3>
                      <p className="text-sm text-gray-600 mb-3">{link.description}</p>
                      <div className="flex items-center text-primary-persian font-medium">
                        <span>مشاهده و مدیریت</span>
                        <span className="mr-2">←</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 persian-card"
        >
          <div className="persian-card-header">
            <h3 className="text-lg font-semibold">آمار سریع</h3>
          </div>
          <div className="persian-card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatPersianNumber(effectiveStats.dailyTransactions || 0)}</div>
                <div className="text-sm text-gray-600">معاملات امروز</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatPersianNumber(effectiveStats.monthlyGrowth || 0)}%</div>
                <div className="text-sm text-gray-600">رشد ماهانه</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatPersianNumber(effectiveStats.activeUsers || 0)}</div>
                <div className="text-sm text-gray-600">کاربران فعال</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{formatPersianNumber(effectiveStats.pendingApprovals || 0)}</div>
                <div className="text-sm text-gray-600">در انتظار تایید</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TenantDashboard;
