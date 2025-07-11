import React, { useState, useEffect } from 'react';
import { DashboardAnalytics } from '../../components/charts';

/**
 * Management Dashboard Component
 * Comprehensive dashboard with analytics, security monitoring, and system overview
 */
const ManagementDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    transactions: null,
    userActivity: null,
    branchRevenue: null,
    exchangeRates: null,
    profitLoss: null,
    securityAlerts: [],
    systemHealth: null,
    recentActivities: []
  });

  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('daily');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe, selectedCurrency]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API calls - replace with actual API endpoints
      const [
        transactionData,
        userActivityData,
        branchData,
        exchangeData,
        profitData,
        securityData,
        systemData,
        activityData
      ] = await Promise.all([
        fetchTransactionData(),
        fetchUserActivityData(),
        fetchBranchRevenueData(),
        fetchExchangeRateData(),
        fetchProfitLossData(),
        fetchSecurityAlerts(),
        fetchSystemHealth(),
        fetchRecentActivities()
      ]);

      setDashboardData({
        transactions: transactionData,
        userActivity: userActivityData,
        branchRevenue: branchData,
        exchangeRates: exchangeData,
        profitLoss: profitData,
        securityAlerts: securityData,
        systemHealth: systemData,
        recentActivities: activityData
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock API functions - replace with actual API calls
  const fetchTransactionData = async () => ({
    labels: ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه', 'یکشنبه'],
    values: [45000, 52000, 48000, 61000, 55000, 67000, 58000]
  });

  const fetchUserActivityData = async () => ({
    labels: ['فعال', 'غیرفعال', 'جدید'],
    values: [156, 24, 18]
  });

  const fetchBranchRevenueData = async () => ({
    labels: ['تهران مرکز', 'تهران شمال', 'اصفهان', 'مشهد', 'شیراز'],
    values: [2400000, 1890000, 1650000, 1420000, 1280000]
  });

  const fetchExchangeRateData = async () => ({
    labels: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'],
    values: [42100, 42250, 42180, 42320, 42280, 42450, 42380]
  });

  const fetchProfitLossData = async () => ({
    labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
    profit: [1200000, 1450000, 1380000, 1620000, 1580000, 1720000],
    loss: [200000, 180000, 220000, 150000, 190000, 160000]
  });

  const fetchSecurityAlerts = async () => [
    {
      id: 1,
      type: 'warning',
      message: 'تلاش ورود ناموفق از IP مشکوک',
      timestamp: new Date(),
      severity: 'medium'
    },
    {
      id: 2,
      type: 'info',
      message: 'به‌روزرسانی سیستم امنیتی انجام شد',
      timestamp: new Date(Date.now() - 3600000),
      severity: 'low'
    }
  ];

  const fetchSystemHealth = async () => ({
    cpu: 68,
    memory: 72,
    disk: 45,
    database: 'healthy',
    cache: 'healthy',
    api: 'healthy'
  });

  const fetchRecentActivities = async () => [
    {
      id: 1,
      user: 'احمد محمدی',
      action: 'ایجاد معامله جدید',
      amount: '50,000 دلار',
      timestamp: new Date()
    },
    {
      id: 2,
      user: 'فاطمه کریمی',
      action: 'تأیید پرداخت',
      amount: '25,000 یورو',
      timestamp: new Date(Date.now() - 1800000)
    },
    {
      id: 3,
      user: 'علی رضایی',
      action: 'ایجاد کاربر جدید',
      details: 'نقش: کاربر شعبه',
      timestamp: new Date(Date.now() - 3600000)
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 font-persian">
                داشبورد مدیریت
              </h1>
              <div className="flex items-center space-x-4 space-x-reverse">
                {/* Timeframe Selector */}
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="daily">روزانه</option>
                  <option value="weekly">هفتگی</option>
                  <option value="monthly">ماهانه</option>
                </select>

                {/* Currency Selector */}
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="USD">دلار آمریکا</option>
                  <option value="EUR">یورو</option>
                  <option value="GBP">پوند انگلیس</option>
                  <option value="AED">درهم امارات</option>
                </select>

                {/* Refresh Button */}
                <button
                  onClick={fetchDashboardData}
                  className="bg-brand-900 text-white px-4 py-2 rounded-md text-sm hover:bg-brand-800 transition-colors"
                >
                  بازخوانی
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="کل معاملات امروز"
            value="387"
            change="+12.5%"
            changeType="increase"
            icon="📊"
          />
          <MetricCard
            title="حجم معاملات"
            value="2.4M تومان"
            change="+8.2%"
            changeType="increase"
            icon="💰"
          />
          <MetricCard
            title="کاربران فعال"
            value="156"
            change="+5.1%"
            changeType="increase"
            icon="👥"
          />
          <MetricCard
            title="سود خالص"
            value="184K تومان"
            change="-2.3%"
            changeType="decrease"
            icon="📈"
          />
        </div>

        {/* Charts Section */}
        <div className="mb-8">
          <DashboardAnalytics
            transactionData={dashboardData.transactions}
            userActivityData={dashboardData.userActivity}
            branchRevenueData={dashboardData.branchRevenue}
            exchangeRateData={dashboardData.exchangeRates}
            profitLossData={dashboardData.profitLoss}
          />
        </div>

        {/* Bottom Section: Security Alerts & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Alerts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-persian">
              هشدارهای امنیتی
            </h3>
            <div className="space-y-3">
              {dashboardData.securityAlerts.map((alert) => (
                <SecurityAlert key={alert.id} alert={alert} />
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-persian">
              آخرین فعالیت‌ها
            </h3>
            <div className="space-y-3">
              {dashboardData.recentActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="mt-6">
          <SystemHealth health={dashboardData.systemHealth} />
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, change, changeType, icon }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 font-persian">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className={`text-sm ${
          changeType === 'increase' ? 'text-green-600' : 'text-red-600'
        }`}>
          {change}
        </p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

// Security Alert Component
const SecurityAlert = ({ alert }) => (
  <div className={`p-3 rounded-md border-l-4 ${
    alert.severity === 'high' ? 'border-red-500 bg-red-50' :
    alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
    'border-blue-500 bg-blue-50'
  }`}>
    <div className="flex items-start">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
        <p className="text-xs text-gray-500 mt-1">
          {alert.timestamp.toLocaleString('fa-IR')}
        </p>
      </div>
      <div className={`text-xs px-2 py-1 rounded ${
        alert.severity === 'high' ? 'bg-red-100 text-red-800' :
        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
        'bg-blue-100 text-blue-800'
      }`}>
        {alert.severity === 'high' ? 'بالا' :
         alert.severity === 'medium' ? 'متوسط' : 'پایین'}
      </div>
    </div>
  </div>
);

// Activity Item Component
const ActivityItem = ({ activity }) => (
  <div className="flex items-start space-x-3 space-x-reverse">
    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
      <div className="w-3 h-3 bg-brand-600 rounded-full"></div>
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900">
        {activity.user} - {activity.action}
      </p>
      {activity.amount && (
        <p className="text-sm text-gray-600">{activity.amount}</p>
      )}
      {activity.details && (
        <p className="text-sm text-gray-600">{activity.details}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">
        {activity.timestamp.toLocaleString('fa-IR')}
      </p>
    </div>
  </div>
);

// System Health Component
const SystemHealth = ({ health }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 font-persian">
      وضعیت سیستم
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <HealthMetric label="CPU" value={health.cpu} unit="%" />
      <HealthMetric label="حافظه" value={health.memory} unit="%" />
      <HealthMetric label="دیسک" value={health.disk} unit="%" />
      <HealthStatus label="دیتابیس" status={health.database} />
      <HealthStatus label="کش" status={health.cache} />
      <HealthStatus label="API" status={health.api} />
    </div>
  </div>
);

const HealthMetric = ({ label, value, unit }) => (
  <div className="text-center">
    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-sm font-bold ${
      value > 80 ? 'bg-red-100 text-red-800' :
      value > 60 ? 'bg-yellow-100 text-yellow-800' :
      'bg-green-100 text-green-800'
    }`}>
      {value}{unit}
    </div>
    <p className="text-xs text-gray-600 mt-2">{label}</p>
  </div>
);

const HealthStatus = ({ label, status }) => (
  <div className="text-center">
    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
      status === 'healthy' ? 'bg-green-100' :
      status === 'warning' ? 'bg-yellow-100' :
      'bg-red-100'
    }`}>
      <div className={`w-4 h-4 rounded-full ${
        status === 'healthy' ? 'bg-green-500' :
        status === 'warning' ? 'bg-yellow-500' :
        'bg-red-500'
      }`}></div>
    </div>
    <p className="text-xs text-gray-600 mt-2">{label}</p>
  </div>
);

export default ManagementDashboard;