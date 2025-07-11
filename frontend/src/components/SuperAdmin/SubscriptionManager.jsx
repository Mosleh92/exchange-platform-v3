import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  CreditCard,
  Bell,
  Eye,
  RefreshCw
} from 'lucide-react';
import StatCard from './StatCard';
import DataChart from './DataChart';
import DataTable from './DataTable';

const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock data
  const mockSubscriptions = [
    {
      id: 1,
      tenantName: 'بانک ملی ایران',
      tenantCode: 'BMI001',
      plan: 'Enterprise',
      status: 'فعال',
      startDate: '1402/01/15',
      endDate: '1403/01/15',
      price: 50000000,
      paymentStatus: 'پرداخت شده',
      daysRemaining: 95,
      autoRenewal: true,
      features: ['نامحدود کاربر', 'گزارشات پیشرفته', 'پشتیبانی 24/7', 'API کامل'],
      lastPayment: '1402/01/15',
      nextPayment: '1403/01/15',
      contactEmail: 'admin@bmi.ir'
    },
    {
      id: 2,
      tenantName: 'صرافی آسیا',
      tenantCode: 'ASA002',
      plan: 'Professional',
      status: 'فعال',
      startDate: '1402/02/10',
      endDate: '1402/11/10',
      price: 25000000,
      paymentStatus: 'پرداخت شده',
      daysRemaining: 12,
      autoRenewal: false,
      features: ['تا 100 کاربر', 'گزارشات استاندارد', 'پشتیبانی عادی'],
      lastPayment: '1402/02/10',
      nextPayment: '1402/11/10',
      contactEmail: 'info@asia-exchange.ir'
    },
    {
      id: 3,
      tenantName: 'صرافی کوروش',
      tenantCode: 'KOR003',
      plan: 'Basic',
      status: 'منقضی شده',
      startDate: '1402/03/05',
      endDate: '1402/09/05',
      price: 10000000,
      paymentStatus: 'پرداخت نشده',
      daysRemaining: -23,
      autoRenewal: false,
      features: ['تا 25 کاربر', 'گزارشات پایه'],
      lastPayment: '1402/03/05',
      nextPayment: '1402/09/05',
      contactEmail: 'support@korosh.com'
    },
    {
      id: 4,
      tenantName: 'بانک پارسیان',
      tenantCode: 'PAR004',
      plan: 'Enterprise',
      status: 'در انتظار تمدید',
      startDate: '1402/04/20',
      endDate: '1402/10/20',
      price: 50000000,
      paymentStatus: 'در انتظار پرداخت',
      daysRemaining: 2,
      autoRenewal: true,
      features: ['نامحدود کاربر', 'گزارشات پیشرفته', 'پشتیبانی 24/7', 'API کامل'],
      lastPayment: '1402/04/20',
      nextPayment: '1402/10/20',
      contactEmail: 'admin@parsian-bank.ir'
    },
    {
      id: 5,
      tenantName: 'صرافی رضا',
      tenantCode: 'REZ005',
      plan: 'Professional',
      status: 'فعال',
      startDate: '1402/05/12',
      endDate: '1403/02/12',
      price: 25000000,
      paymentStatus: 'پرداخت شده',
      daysRemaining: 135,
      autoRenewal: true,
      features: ['تا 100 کاربر', 'گزارشات استاندارد', 'پشتیبانی عادی'],
      lastPayment: '1402/05/12',
      nextPayment: '1403/02/12',
      contactEmail: 'info@reza-exchange.ir'
    }
  ];

  const mockStats = {
    totalSubscriptions: 156,
    activeSubscriptions: 142,
    expiredSubscriptions: 8,
    pendingRenewal: 6,
    monthlyRevenue: 1250000000,
    projectedRevenue: 1450000000,
    renewalRate: 89.5,
    averageSubscriptionValue: 28000000
  };

  const chartData = {
    revenue: {
      labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
      datasets: [{
        label: 'درآمد اشتراکها (میلیون ریال)',
        data: [1100, 1200, 1150, 1300, 1250, 1350],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      }]
    },
    plans: {
      labels: ['Basic', 'Professional', 'Enterprise'],
      datasets: [{
        data: [45, 68, 43],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)'
        ],
      }]
    },
    renewals: {
      labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
      datasets: [{
        label: 'نرخ تمدید (%)',
        data: [85, 87, 89, 91, 88, 90],
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
      }]
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSubscriptions(mockSubscriptions);
        setStats(mockStats);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'فعال':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'منقضی شده':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'در انتظار تمدید':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'Enterprise':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Professional':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Basic':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getDaysRemainingColor = (days) => {
    if (days < 0) return 'text-red-600 dark:text-red-400';
    if (days <= 7) return 'text-red-600 dark:text-red-400';
    if (days <= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const columns = [
    { 
      key: 'tenantName', 
      label: 'نام صرافی/بانک', 
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.tenantCode}</div>
        </div>
      )
    },
    { 
      key: 'plan', 
      label: 'پلن', 
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(value)}`}>
          {value}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'وضعیت',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value}
        </span>
      )
    },
    { 
      key: 'price', 
      label: 'قیمت', 
      sortable: true,
      render: (value) => `${(value / 1000000).toLocaleString('fa-IR')} میلیون ریال`
    },
    { 
      key: 'daysRemaining', 
      label: 'روزهای باقیمانده',
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${getDaysRemainingColor(value)}`}>
          {value < 0 ? `${Math.abs(value)} روز گذشته` : `${value} روز`}
        </span>
      )
    },
    { 
      key: 'endDate', 
      label: 'تاریخ انقضا'
    },
    { 
      key: 'autoRenewal', 
      label: 'تمدید خودکار',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        }`}>
          {value ? 'فعال' : 'غیرفعال'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(row)}
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            title="مشاهده جزئیات"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRenew(row)}
            className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
            title="تمدید اشتراک"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNotify(row)}
            className="p-1 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400"
            title="ارسال یادآوری"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const handleView = (subscription) => {
    console.log('View subscription:', subscription);
  };

  const handleRenew = (subscription) => {
    console.log('Renew subscription:', subscription);
  };

  const handleNotify = (subscription) => {
    console.log('Send notification:', subscription);
  };

  const expiringSubscriptions = subscriptions.filter(sub => 
    sub.daysRemaining >= 0 && sub.daysRemaining <= 30
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            مدیریت اشتراکها
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            نظارت بر اشتراکها و مدیریت تمدیدها
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="month">این ماه</option>
            <option value="quarter">این فصل</option>
            <option value="year">امسال</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="کل اشتراکها"
          value={stats?.totalSubscriptions}
          icon={CreditCard}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="اشتراکهای فعال"
          value={stats?.activeSubscriptions}
          icon={CheckCircle}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="منقضی شده"
          value={stats?.expiredSubscriptions}
          icon={AlertTriangle}
          color="red"
          isLoading={loading}
        />
        <StatCard
          title="در انتظار تمدید"
          value={stats?.pendingRenewal}
          icon={Clock}
          color="yellow"
          isLoading={loading}
        />
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="درآمد ماهانه (ریال)"
          value={stats?.monthlyRevenue}
          icon={DollarSign}
          trend="up"
          trendValue="+12%"
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="درآمد پیش‌بینی شده"
          value={stats?.projectedRevenue}
          icon={TrendingUp}
          color="purple"
          isLoading={loading}
        />
        <StatCard
          title="نرخ تمدید (%)"
          value={stats?.renewalRate}
          icon={RefreshCw}
          trend="up"
          trendValue="+5%"
          color="indigo"
          isLoading={loading}
        />
        <StatCard
          title="متوسط ارزش اشتراک"
          value={stats?.averageSubscriptionValue}
          icon={Calendar}
          color="yellow"
          isLoading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          type="bar"
          data={chartData.revenue}
          title="درآمد ماهانه اشتراکها"
          isLoading={loading}
        />
        <DataChart
          type="line"
          data={chartData.renewals}
          title="نرخ تمدید اشتراکها"
          isLoading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DataChart
            type="doughnut"
            data={chartData.plans}
            title="توزیع پلن‌های اشتراک"
            height={300}
            isLoading={loading}
          />
        </div>
        
        <div className="lg:col-span-2">
          {/* Expiring Subscriptions Alert */}
          {expiringSubscriptions.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                  اشتراکهای در حال انقضا
                </h3>
              </div>
              <div className="space-y-3">
                {expiringSubscriptions.slice(0, 5).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {sub.tenantName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        پلن {sub.plan} - {sub.daysRemaining} روز باقیمانده
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                        تمدید
                      </button>
                      <button className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                        یادآوری
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscriptions Table */}
      <DataTable
        data={subscriptions}
        columns={columns}
        isLoading={loading}
        emptyMessage="هیچ اشتراکی ثبت نشده است"
        onRowClick={handleView}
      />
    </div>
  );
};

export default SubscriptionManager;