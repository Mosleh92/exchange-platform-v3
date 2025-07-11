import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Activity, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Shield,
  Zap,
  Globe,
  RefreshCw
} from 'lucide-react';
import StatCard from '../components/SuperAdmin/StatCard';
import DataChart from '../components/SuperAdmin/DataChart';
import DataTable from '../components/SuperAdmin/DataTable';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - in real implementation, these would come from API
  const mockStats = {
    totalTenants: 156,
    totalUsers: 12847,
    totalTransactions: 1254789,
    totalRevenue: 2847526000,
    systemStatus: 'فعال',
    activeSubscriptions: 142,
    pendingApprovals: 23,
    securityAlerts: 5,
    systemUptime: 99.8,
    trends: {
      tenants: { value: '+12%', direction: 'up' },
      users: { value: '+8.5%', direction: 'up' },
      transactions: { value: '+15.2%', direction: 'up' },
      revenue: { value: '+22.7%', direction: 'up' }
    }
  };

  const mockChartData = {
    transactions: {
      labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
      datasets: [{
        label: 'تعداد تراکنش‌ها',
        data: [12000, 15000, 18000, 22000, 25000, 28000],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    },
    revenue: {
      labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
      datasets: [{
        label: 'درآمد (میلیون ریال)',
        data: [450, 520, 680, 750, 820, 950],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      }]
    },
    tenantTypes: {
      labels: ['صرافی‌های کوچک', 'صرافی‌های متوسط', 'صرافی‌های بزرگ', 'بانک‌ها'],
      datasets: [{
        data: [65, 45, 32, 14],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
      }]
    }
  };

  const recentActivities = [
    { id: 1, tenant: 'صرافی آسیا', action: 'ایجاد تراکنش جدید', time: '۵ دقیقه پیش', status: 'success' },
    { id: 2, tenant: 'بانک پارسیان', action: 'تمدید اشتراک', time: '۱۵ دقیقه پیش', status: 'info' },
    { id: 3, tenant: 'صرافی کوروش', action: 'درخواست افزایش سقف', time: '۳۰ دقیقه پیش', status: 'warning' },
    { id: 4, tenant: 'صرافی رضا', action: 'ورود مشکوک شناسایی شد', time: '۱ ساعت پیش', status: 'error' },
    { id: 5, tenant: 'بانک ملی', action: 'بروزرسانی پروفایل', time: '۲ ساعت پیش', status: 'success' },
  ];

  const topTenants = [
    { name: 'بانک ملی ایران', transactions: 45000, revenue: 950000000, growth: '+15%', status: 'فعال' },
    { name: 'صرافی آسیا', transactions: 32000, revenue: 680000000, growth: '+22%', status: 'فعال' },
    { name: 'بانک پارسیان', transactions: 28000, revenue: 620000000, growth: '+8%', status: 'فعال' },
    { name: 'صرافی کوروش', transactions: 25000, revenue: 580000000, growth: '+12%', status: 'تعلیق' },
    { name: 'صرافی رضا', transactions: 22000, revenue: 520000000, growth: '+18%', status: 'فعال' },
  ];

  const tableColumns = [
    { key: 'name', label: 'نام صرافی', sortable: true },
    { 
      key: 'transactions', 
      label: 'تعداد تراکنش', 
      sortable: true,
      render: (value) => value?.toLocaleString('fa-IR')
    },
    { 
      key: 'revenue', 
      label: 'درآمد (ریال)', 
      sortable: true,
      render: (value) => value?.toLocaleString('fa-IR')
    },
    { 
      key: 'growth', 
      label: 'رشد ماهانه', 
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value?.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'وضعیت',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'فعال' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value}
        </span>
      )
    },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStats(mockStats);
      setError(null);
    } catch (err) {
      setError('خطا در دریافت آمار داشبورد');
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            داشبورد سوپر ادمین
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            نمای کلی سیستم مدیریت صرافی‌ها
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          بروزرسانی
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="تعداد صرافی‌ها"
          value={stats?.totalTenants}
          icon={Building2}
          trend={stats?.trends?.tenants?.direction}
          trendValue={stats?.trends?.tenants?.value}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="کاربران کل"
          value={stats?.totalUsers}
          icon={Users}
          trend={stats?.trends?.users?.direction}
          trendValue={stats?.trends?.users?.value}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="تراکنش‌های کل"
          value={stats?.totalTransactions}
          icon={Activity}
          trend={stats?.trends?.transactions?.direction}
          trendValue={stats?.trends?.transactions?.value}
          color="purple"
          isLoading={loading}
        />
        <StatCard
          title="درآمد کل (ریال)"
          value={stats?.totalRevenue}
          icon={DollarSign}
          trend={stats?.trends?.revenue?.direction}
          trendValue={stats?.trends?.revenue?.value}
          color="yellow"
          isLoading={loading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="وضعیت سیستم"
          value={stats?.systemStatus}
          icon={Globe}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="اشتراکهای فعال"
          value={stats?.activeSubscriptions}
          icon={Zap}
          color="indigo"
          isLoading={loading}
        />
        <StatCard
          title="درخواست‌های در انتظار"
          value={stats?.pendingApprovals}
          icon={TrendingUp}
          color="yellow"
          isLoading={loading}
        />
        <StatCard
          title="هشدارهای امنیتی"
          value={stats?.securityAlerts}
          icon={Shield}
          color="red"
          isLoading={loading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          type="line"
          data={mockChartData.transactions}
          title="روند تراکنش‌ها"
          isLoading={loading}
        />
        <DataChart
          type="bar"
          data={mockChartData.revenue}
          title="روند درآمد ماهانه"
          isLoading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DataChart
            type="doughnut"
            data={mockChartData.tenantTypes}
            title="توزیع انواع صرافی‌ها"
            height={300}
            isLoading={loading}
          />
        </div>
        
        <div className="lg:col-span-2">
          {/* Recent Activities */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              آخرین فعالیت‌ها
            </h3>
            <div className="space-y-3">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' :
                        activity.status === 'warning' ? 'bg-yellow-500' :
                        activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {activity.tenant}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mr-5">
                      {activity.action}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Tenants Table */}
      <DataTable
        data={topTenants}
        columns={tableColumns}
        title="صرافی‌های برتر"
        isLoading={loading}
        onRowClick={(row) => console.log('Clicked tenant:', row)}
      />
    </div>
  );
};

export default SuperAdminDashboard; 