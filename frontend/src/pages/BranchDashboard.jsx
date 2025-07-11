import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import io from 'socket.io-client';
import PersianUtils from '../utils/persian';
import PersianCalendar from '../utils/persianCalendar';
import '../styles/rtl.css';

const BranchDashboard = () => {
  const [stats, setStats] = useState({
    todayTransactions: 45,
    todayRevenue: 125000000,
    activeCustomers: 23,
    pendingRequests: 8,
    cashBalance: 50000000,
    availableStaff: 5,
    todayGrowth: 8.5,
    customerSatisfaction: 4.7
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const socketRef = useRef(null);

  const quickActions = [
    { 
      id: 'new-customer', 
      label: 'ثبت مشتری جدید', 
      icon: '👤', 
      color: 'bg-blue-500',
      action: () => window.location.href = '/customers/new'
    },
    { 
      id: 'new-transaction', 
      label: 'معامله جدید', 
      icon: '💱', 
      color: 'bg-green-500',
      action: () => window.location.href = '/transactions/new'
    },
    { 
      id: 'send-remittance', 
      label: 'ارسال حواله', 
      icon: '📤', 
      color: 'bg-purple-500',
      action: () => window.location.href = '/remittances/send'
    },
    { 
      id: 'check-rates', 
      label: 'بررسی نرخ ارز', 
      icon: '📊', 
      color: 'bg-orange-500',
      action: () => window.location.href = '/rates'
    },
  ];

  useEffect(() => {
    // Apply RTL styling
    document.body.classList.add('rtl-container');
    document.documentElement.dir = 'rtl';
    
    // Load sample data
    generateSampleData();
    setupWebSocket();
    
    return () => {
      document.body.classList.remove('rtl-container');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const generateSampleData = () => {
    // Generate chart data for today's hourly transactions
    const hours = [];
    for (let i = 8; i <= 18; i++) {
      hours.push({
        time: `${i}:00`,
        transactions: Math.floor(Math.random() * 10) + 2,
        revenue: Math.floor(Math.random() * 5000000) + 1000000
      });
    }
    setChartData(hours);

    // Generate recent transactions
    const transactions = [
      { id: 'TXN001', customer: 'احمد محمدی', type: 'خرید USD', amount: 2500000, status: 'تکمیل شده', time: '14:30' },
      { id: 'TXN002', customer: 'فاطمه احمدی', type: 'فروش EUR', amount: 1800000, status: 'در انتظار', time: '14:15' },
      { id: 'TXN003', customer: 'علی رضایی', type: 'حواله AED', amount: 3200000, status: 'تکمیل شده', time: '13:45' },
      { id: 'TXN004', customer: 'مریم صادقی', type: 'خرید GBP', amount: 950000, status: 'تکمیل شده', time: '13:20' },
      { id: 'TXN005', customer: 'حسن کریمی', type: 'تبدیل ارز', amount: 4100000, status: 'در حال پردازش', time: '12:50' },
    ];
    setRecentTransactions(transactions);

    // Generate recent customers
    const customers = [
      { id: 'CUST001', name: 'زهرا موسوی', phone: '09123456789', type: 'VIP', status: 'فعال', joinDate: 'امروز' },
      { id: 'CUST002', name: 'محمد جوادی', phone: '09187654321', type: 'عادی', status: 'در انتظار تایید', joinDate: 'امروز' },
      { id: 'CUST003', name: 'نرگس احمدی', phone: '09354567890', type: 'عادی', status: 'فعال', joinDate: 'دیروز' },
    ];
    setRecentCustomers(customers);

    // Generate alerts
    setAlerts([
      { id: 1, type: 'warning', message: 'موجودی نقدی به حد آستانه نزدیک شده است', time: '10 دقیقه پیش' },
      { id: 2, type: 'info', message: 'نرخ دلار بروزرسانی شد', time: '25 دقیقه پیش' },
      { id: 3, type: 'success', message: 'تراکنش بزرگ با موفقیت تکمیل شد', time: '1 ساعت پیش' },
    ]);
  };

  const setupWebSocket = () => {
    try {
      socketRef.current = io('/branch');
      
      socketRef.current.on('transaction-update', (data) => {
        setStats(prev => ({
          ...prev,
          todayTransactions: prev.todayTransactions + 1,
          todayRevenue: prev.todayRevenue + data.amount
        }));
      });
      
      socketRef.current.on('new-alert', (alert) => {
        setAlerts(prev => [alert, ...prev.slice(0, 4)]);
      });
      
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
  };

  const formatPersianNumber = (num) => {
    return PersianUtils.formatNumber(num, true);
  };

  const formatCurrency = (amount) => {
    return PersianUtils.currency.formatAdvanced(amount, 'IRR', { abbreviated: true });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'تکمیل شده': return 'text-green-600 bg-green-50';
      case 'در انتظار': return 'text-yellow-600 bg-yellow-50';
      case 'در حال پردازش': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'warning': return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      case 'error': return 'border-red-300 bg-red-50 text-red-800';
      case 'success': return 'border-green-300 bg-green-50 text-green-800';
      default: return 'border-blue-300 bg-blue-50 text-blue-800';
    }
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
          <p className="text-gray-600 font-persian">در حال بارگذاری داشبورد شعبه...</p>
        </motion.div>
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
              <h1 className="text-3xl font-bold text-primary-persian mb-2">داشبورد شعبه</h1>
              <p className="text-gray-600">مدیریت عملیات روزانه و خدمات مشتریان</p>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-500">امروز</div>
              <div className="text-sm font-medium">
                {PersianCalendar.format(new Date(), 'jYYYY/jMM/jDD')}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Alerts */}
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              {alerts.slice(0, 2).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`border rounded-lg p-4 mb-2 ${getAlertColor(alert.type)}`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium">{alert.message}</p>
                    <span className="text-xs">{alert.time}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="persian-stat-card">
            <div className="persian-stat-icon">💱</div>
            <div className="persian-stat-value">{formatPersianNumber(stats.todayTransactions)}</div>
            <div className="persian-stat-label">معاملات امروز</div>
          </div>
          
          <div className="persian-stat-card">
            <div className="persian-stat-icon">💰</div>
            <div className="persian-stat-value">{formatCurrency(stats.todayRevenue)}</div>
            <div className="persian-stat-label">درآمد امروز</div>
          </div>
          
          <div className="persian-stat-card">
            <div className="persian-stat-icon">👥</div>
            <div className="persian-stat-value">{formatPersianNumber(stats.activeCustomers)}</div>
            <div className="persian-stat-label">مشتریان فعال</div>
          </div>
          
          <div className="persian-stat-card">
            <div className="persian-stat-icon">📝</div>
            <div className="persian-stat-value">{formatPersianNumber(stats.pendingRequests)}</div>
            <div className="persian-stat-label">درخواست‌های در انتظار</div>
          </div>
        </motion.div>

        {/* Charts and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Transaction Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 persian-card"
          >
            <div className="persian-card-header">
              <h3 className="text-lg font-semibold">نمودار معاملات امروز</h3>
            </div>
            <div className="persian-card-body">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `ساعت: ${value}`}
                    formatter={(value, name) => [formatPersianNumber(value), name === 'transactions' ? 'تعداد معاملات' : 'درآمد']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="transactions" 
                    stroke="#1746A2" 
                    fill="#1746A2" 
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="persian-card"
          >
            <div className="persian-card-header">
              <h3 className="text-lg font-semibold">عملیات سریع</h3>
            </div>
            <div className="persian-card-body">
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <motion.button
                    key={action.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={action.action}
                    className="w-full flex items-center space-x-3 space-x-reverse p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white`}>
                      {action.icon}
                    </div>
                    <span className="font-medium text-gray-800">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="persian-card"
          >
            <div className="persian-card-header">
              <h3 className="text-lg font-semibold">آخرین معاملات</h3>
            </div>
            <div className="persian-card-body">
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">{transaction.customer}</span>
                        <span className="text-sm text-gray-500">{transaction.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{transaction.type}</span>
                        <span className="text-sm font-medium">{formatCurrency(transaction.amount)}</span>
                      </div>
                    </div>
                    <div className={`mr-3 px-2 py-1 rounded-full text-xs ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Recent Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="persian-card"
          >
            <div className="persian-card-header">
              <h3 className="text-lg font-semibold">مشتریان جدید</h3>
            </div>
            <div className="persian-card-body">
              <div className="space-y-3">
                {recentCustomers.map((customer) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{customer.name}</div>
                        <div className="text-sm text-gray-600">{customer.phone}</div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className={`text-xs px-2 py-1 rounded-full ${customer.type === 'VIP' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {customer.type}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{customer.joinDate}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;
