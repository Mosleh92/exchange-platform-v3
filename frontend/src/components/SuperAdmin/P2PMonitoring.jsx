import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Search,
  Download
} from 'lucide-react';
import StatCard from './StatCard';
import DataChart from './DataChart';
import DataTable from './DataTable';

const P2PMonitoring = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Mock data
  const mockTransactions = [
    {
      id: 'P2P001',
      fromTenant: 'بانک ملی ایران',
      toTenant: 'صرافی آسیا',
      fromCurrency: 'USD',
      toCurrency: 'IRR',
      amount: 10000,
      exchangeRate: 52500,
      totalValue: 525000000,
      status: 'تکمیل شده',
      priority: 'عادی',
      createdAt: '1402/09/28 14:30',
      completedAt: '1402/09/28 14:35',
      requestedBy: 'علی احمدی',
      approvedBy: 'محمد رضایی',
      notes: 'تراکنش عادی',
      riskLevel: 'کم',
      fees: 525000,
      commission: 262500
    },
    {
      id: 'P2P002',
      fromTenant: 'صرافی کوروش',
      toTenant: 'بانک پارسیان',
      fromCurrency: 'EUR',
      toCurrency: 'USD',
      amount: 5000,
      exchangeRate: 1.08,
      totalValue: 5400,
      status: 'در انتظار تأیید',
      priority: 'بالا',
      createdAt: '1402/09/28 15:20',
      completedAt: null,
      requestedBy: 'فاطمه کریمی',
      approvedBy: null,
      notes: 'نیاز به بررسی اضافی',
      riskLevel: 'متوسط',
      fees: 54,
      commission: 27
    },
    {
      id: 'P2P003',
      fromTenant: 'صرافی رضا',
      toTenant: 'بانک ملی ایران',
      fromCurrency: 'IRR',
      toCurrency: 'AED',
      amount: 100000000,
      exchangeRate: 0.000073,
      totalValue: 7300,
      status: 'رد شده',
      priority: 'عادی',
      createdAt: '1402/09/28 13:15',
      completedAt: '1402/09/28 13:45',
      requestedBy: 'حسن موسوی',
      approvedBy: 'زهرا محمدی',
      notes: 'عدم رعایت حد مجاز',
      riskLevel: 'بالا',
      fees: 730,
      commission: 365
    },
    {
      id: 'P2P004',
      fromTenant: 'بانک پارسیان',
      toTenant: 'صرافی آسیا',
      fromCurrency: 'GBP',
      toCurrency: 'IRR',
      amount: 2000,
      exchangeRate: 66250,
      totalValue: 132500000,
      status: 'در حال پردازش',
      priority: 'بالا',
      createdAt: '1402/09/28 16:00',
      completedAt: null,
      requestedBy: 'آقای موسوی',
      approvedBy: null,
      notes: 'در حال بررسی مدارک',
      riskLevel: 'کم',
      fees: 1325000,
      commission: 662500
    },
    {
      id: 'P2P005',
      fromTenant: 'صرافی آسیا',
      toTenant: 'صرافی کوروش',
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      amount: 8000,
      exchangeRate: 0.93,
      totalValue: 7440,
      status: 'تکمیل شده',
      priority: 'عادی',
      createdAt: '1402/09/27 11:20',
      completedAt: '1402/09/27 11:35',
      requestedBy: 'خانم رضایی',
      approvedBy: 'علی احمدی',
      notes: 'تراکنش موفق',
      riskLevel: 'کم',
      fees: 74.4,
      commission: 37.2
    }
  ];

  const mockStats = {
    totalTransactions: 1254,
    completedTransactions: 1156,
    pendingTransactions: 67,
    rejectedTransactions: 31,
    totalVolume: 12500000000,
    todayVolume: 850000000,
    totalCommission: 125000000,
    averageProcessingTime: 12, // minutes
    successRate: 92.3,
    riskTransactions: 15
  };

  const chartData = {
    volume: {
      labels: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'],
      datasets: [{
        label: 'حجم تراکنش (میلیارد ریال)',
        data: [1.2, 1.5, 1.8, 1.3, 1.7, 1.9, 0.85],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      }]
    },
    status: {
      labels: ['تکمیل شده', 'در انتظار تأیید', 'در حال پردازش', 'رد شده'],
      datasets: [{
        data: [1156, 67, 23, 31],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
      }]
    },
    currencies: {
      labels: ['USD/IRR', 'EUR/IRR', 'AED/IRR', 'GBP/IRR', 'USD/EUR', 'سایر'],
      datasets: [{
        data: [35, 25, 20, 10, 5, 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)'
        ],
      }]
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTransactions(mockTransactions);
        setStats(mockStats);
      } catch (error) {
        console.error('Error fetching P2P transactions:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedStatus, selectedPeriod]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'تکمیل شده':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'در انتظار تأیید':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'در حال پردازش':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'رد شده':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'بالا':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'متوسط':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'عادی':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'بالا':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'متوسط':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'کم':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const columns = [
    { 
      key: 'id', 
      label: 'شناسه تراکنش', 
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.createdAt}</div>
        </div>
      )
    },
    { 
      key: 'fromTenant', 
      label: 'از', 
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">به {row.toTenant}</div>
        </div>
      )
    },
    { 
      key: 'amount', 
      label: 'مبلغ و ارز', 
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {value.toLocaleString('fa-IR')} {row.fromCurrency}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            → {typeof row.totalValue === 'number' ? row.totalValue.toLocaleString('fa-IR') : row.totalValue} {row.toCurrency}
          </div>
        </div>
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
      key: 'priority', 
      label: 'اولویت',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(value)}`}>
          {value}
        </span>
      )
    },
    { 
      key: 'riskLevel', 
      label: 'سطح ریسک',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(value)}`}>
          {value}
        </span>
      )
    },
    { 
      key: 'requestedBy', 
      label: 'درخواست کننده'
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
          {row.status === 'در انتظار تأیید' && (
            <>
              <button
                onClick={() => handleApprove(row)}
                className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                title="تأیید"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(row)}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                title="رد"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const handleView = (transaction) => {
    console.log('View transaction:', transaction);
  };

  const handleApprove = async (transaction) => {
    try {
      // API call to approve
      setTransactions(prev => 
        prev.map(t => 
          t.id === transaction.id 
            ? { ...t, status: 'تکمیل شده', approvedBy: 'سوپر ادمین', completedAt: new Date().toLocaleString('fa-IR') }
            : t
        )
      );
    } catch (error) {
      console.error('Error approving transaction:', error);
    }
  };

  const handleReject = async (transaction) => {
    const reason = prompt('دلیل رد تراکنش را وارد کنید:');
    if (reason) {
      try {
        // API call to reject
        setTransactions(prev => 
          prev.map(t => 
            t.id === transaction.id 
              ? { ...t, status: 'رد شده', approvedBy: 'سوپر ادمین', notes: reason, completedAt: new Date().toLocaleString('fa-IR') }
              : t
          )
        );
      } catch (error) {
        console.error('Error rejecting transaction:', error);
      }
    }
  };

  const filteredTransactions = selectedStatus === 'all' 
    ? transactions 
    : transactions.filter(t => t.status === selectedStatus);

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            نظارت بر معاملات P2P
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            مشاهده و تأیید معاملات بین صرافی‌ها
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="today">امروز</option>
            <option value="week">این هفته</option>
            <option value="month">این ماه</option>
            <option value="quarter">این فصل</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            گزارش
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="کل تراکنش‌ها"
          value={stats?.totalTransactions}
          icon={ArrowLeftRight}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="تکمیل شده"
          value={stats?.completedTransactions}
          icon={CheckCircle}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="در انتظار تأیید"
          value={stats?.pendingTransactions}
          icon={Clock}
          color="yellow"
          isLoading={loading}
        />
        <StatCard
          title="رد شده"
          value={stats?.rejectedTransactions}
          icon={XCircle}
          color="red"
          isLoading={loading}
        />
      </div>

      {/* Volume and Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="حجم کل (ریال)"
          value={stats?.totalVolume}
          icon={DollarSign}
          trend="up"
          trendValue="+15%"
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="حجم امروز (ریال)"
          value={stats?.todayVolume}
          icon={TrendingUp}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="کمیسیون کل (ریال)"
          value={stats?.totalCommission}
          icon={DollarSign}
          color="purple"
          isLoading={loading}
        />
        <StatCard
          title="نرخ موفقیت (%)"
          value={stats?.successRate}
          icon={Activity}
          trend="up"
          trendValue="+2%"
          color="indigo"
          isLoading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          type="line"
          data={chartData.volume}
          title="حجم تراکنش‌های هفتگی"
          isLoading={loading}
        />
        <DataChart
          type="doughnut"
          data={chartData.status}
          title="توزیع وضعیت تراکنش‌ها"
          height={300}
          isLoading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DataChart
            type="doughnut"
            data={chartData.currencies}
            title="جفت ارزهای پرتراکنش (%)"
            height={300}
            isLoading={loading}
          />
        </div>
        
        <div className="lg:col-span-2">
          {/* High Risk Transactions Alert */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                تراکنش‌های پرریسک
              </h3>
            </div>
            <div className="space-y-3">
              {transactions.filter(t => t.riskLevel === 'بالا' || t.riskLevel === 'متوسط').slice(0, 3).map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {transaction.id} - {transaction.fromTenant}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {transaction.amount.toLocaleString('fa-IR')} {transaction.fromCurrency} - سطح ریسک: {transaction.riskLevel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      بررسی
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">فیلتر تراکنش‌ها:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">همه تراکنش‌ها</option>
            <option value="تکمیل شده">تکمیل شده</option>
            <option value="در انتظار تأیید">در انتظار تأیید</option>
            <option value="در حال پردازش">در حال پردازش</option>
            <option value="رد شده">رد شده</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <DataTable
        data={filteredTransactions}
        columns={columns}
        isLoading={loading}
        emptyMessage="هیچ تراکنشی موجود نیست"
        onRowClick={handleView}
      />
    </div>
  );
};

export default P2PMonitoring;