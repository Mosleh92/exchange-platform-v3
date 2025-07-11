import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  FileText,
  Download,
  Calendar,
  Filter,
  Eye,
  Activity
} from 'lucide-react';
import StatCard from './StatCard';
import DataChart from './DataChart';
import DataTable from './DataTable';

const SystemReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReportType, setSelectedReportType] = useState('all');

  // Mock data
  const mockStats = {
    totalRevenue: 12847526000,
    monthlyRevenue: 1250000000,
    totalProfit: 2847526000,
    monthlyProfit: 287526000,
    totalTransactions: 1254789,
    monthlyTransactions: 125478,
    averageTransactionValue: 1024000,
    systemCommission: 142750000,
    revenueGrowth: 15.7,
    profitGrowth: 12.3,
    transactionGrowth: 18.9
  };

  const mockReports = [
    {
      id: 1,
      title: 'گزارش درآمد ماهانه',
      type: 'revenue',
      period: '1402/09',
      generatedAt: '1402/09/28',
      size: '2.5 MB',
      format: 'PDF',
      status: 'آماده',
      description: 'گزارش کامل درآمدهای ماه شهریور'
    },
    {
      id: 2,
      title: 'گزارش تراکنش‌های سیستم',
      type: 'transactions',
      period: '1402/09',
      generatedAt: '1402/09/27',
      size: '8.1 MB',
      format: 'Excel',
      status: 'آماده',
      description: 'آمار کامل تراکنش‌های تمام صرافی‌ها'
    },
    {
      id: 3,
      title: 'گزارش سود و زیان فصلی',
      type: 'profit-loss',
      period: 'Q2 1402',
      generatedAt: '1402/09/25',
      size: '1.8 MB',
      format: 'PDF',
      status: 'آماده',
      description: 'تحلیل سود و زیان سه ماه دوم سال'
    },
    {
      id: 4,
      title: 'گزارش عملکرد صرافی‌ها',
      type: 'performance',
      period: '1402/09',
      generatedAt: '1402/09/26',
      size: '4.3 MB',
      format: 'Excel',
      status: 'در حال پردازش',
      description: 'رنکینگ و عملکرد صرافی‌ها'
    },
    {
      id: 5,
      title: 'گزارش کمیسیون‌های سیستم',
      type: 'commission',
      period: '1402/09',
      generatedAt: '1402/09/24',
      size: '1.2 MB',
      format: 'PDF',
      status: 'آماده',
      description: 'جزئیات کمیسیون‌های دریافتی از تراکنش‌ها'
    }
  ];

  // Chart data
  const revenueData = {
    labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
    datasets: [
      {
        label: 'درآمد کل (میلیارد ریال)',
        data: [1.1, 1.3, 1.5, 1.7, 1.4, 1.25],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'سود خالص (میلیارد ریال)',
        data: [0.22, 0.26, 0.30, 0.34, 0.28, 0.25],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const transactionData = {
    labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
    datasets: [{
      label: 'تعداد تراکنش‌ها',
      data: [95000, 108000, 125000, 142000, 135000, 125478],
      backgroundColor: 'rgba(168, 85, 247, 0.8)',
    }]
  };

  const revenueByTenantData = {
    labels: ['بانک ملی', 'صرافی آسیا', 'بانک پارسیان', 'صرافی کوروش', 'صرافی رضا', 'سایر'],
    datasets: [{
      data: [28, 22, 18, 15, 12, 5],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ],
    }]
  };

  const commissionData = {
    labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
    datasets: [{
      label: 'کمیسیون (میلیون ریال)',
      data: [85, 95, 112, 128, 118, 142],
      backgroundColor: 'rgba(251, 191, 36, 0.8)',
    }]
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setReports(mockReports);
        setStats(mockStats);
      } catch (error) {
        console.error('Error fetching reports:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedPeriod, selectedReportType]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'آماده':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'در حال پردازش':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'خطا':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'revenue':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'transactions':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'profit-loss':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'performance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'commission':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      revenue: 'درآمد',
      transactions: 'تراکنش',
      'profit-loss': 'سود و زیان',
      performance: 'عملکرد',
      commission: 'کمیسیون'
    };
    return labels[type] || type;
  };

  const columns = [
    { 
      key: 'title', 
      label: 'عنوان گزارش', 
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.description}</div>
        </div>
      )
    },
    { 
      key: 'type', 
      label: 'نوع گزارش', 
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(value)}`}>
          {getTypeLabel(value)}
        </span>
      )
    },
    { 
      key: 'period', 
      label: 'دوره', 
      sortable: true
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
      key: 'size', 
      label: 'حجم فایل'
    },
    { 
      key: 'format', 
      label: 'فرمت'
    },
    { 
      key: 'generatedAt', 
      label: 'تاریخ تولید', 
      sortable: true
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(row)}
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            title="مشاهده گزارش"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDownload(row)}
            disabled={row.status !== 'آماده'}
            className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            title="دانلود گزارش"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const handleView = (report) => {
    console.log('View report:', report);
  };

  const handleDownload = (report) => {
    console.log('Download report:', report);
  };

  const handleGenerateReport = () => {
    console.log('Generate new report');
  };

  const filteredReports = selectedReportType === 'all' 
    ? reports 
    : reports.filter(report => report.type === selectedReportType);

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            گزارشات مالی سیستم
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            گزارشات مالی کامل و تحلیل عملکرد سیستم
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="week">این هفته</option>
            <option value="month">این ماه</option>
            <option value="quarter">این فصل</option>
            <option value="year">امسال</option>
          </select>
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FileText className="w-4 h-4" />
            تولید گزارش جدید
          </button>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="کل درآمد (ریال)"
          value={stats?.totalRevenue}
          icon={DollarSign}
          trend="up"
          trendValue={`+${stats?.revenueGrowth}%`}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="سود خالص (ریال)"
          value={stats?.totalProfit}
          icon={TrendingUp}
          trend="up"
          trendValue={`+${stats?.profitGrowth}%`}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="کل تراکنش‌ها"
          value={stats?.totalTransactions}
          icon={Activity}
          trend="up"
          trendValue={`+${stats?.transactionGrowth}%`}
          color="purple"
          isLoading={loading}
        />
        <StatCard
          title="کمیسیون سیستم (ریال)"
          value={stats?.systemCommission}
          icon={BarChart3}
          color="yellow"
          isLoading={loading}
        />
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="درآمد ماهانه (ریال)"
          value={stats?.monthlyRevenue}
          icon={DollarSign}
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="سود ماهانه (ریال)"
          value={stats?.monthlyProfit}
          icon={TrendingUp}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="متوسط ارزش تراکنش"
          value={stats?.averageTransactionValue}
          icon={Activity}
          color="indigo"
          isLoading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          type="line"
          data={revenueData}
          title="روند درآمد و سود"
          isLoading={loading}
        />
        <DataChart
          type="bar"
          data={transactionData}
          title="تعداد تراکنش‌های ماهانه"
          isLoading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          type="doughnut"
          data={revenueByTenantData}
          title="توزیع درآمد بر اساس صرافی‌ها (%)"
          height={300}
          isLoading={loading}
        />
        <DataChart
          type="bar"
          data={commissionData}
          title="کمیسیون ماهانه سیستم"
          isLoading={loading}
        />
      </div>

      {/* Reports Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">فیلتر گزارشات:</span>
          </div>
          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">همه گزارشات</option>
            <option value="revenue">گزارشات درآمد</option>
            <option value="transactions">گزارشات تراکنش</option>
            <option value="profit-loss">سود و زیان</option>
            <option value="performance">عملکرد</option>
            <option value="commission">کمیسیون</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <DataTable
        data={filteredReports}
        columns={columns}
        isLoading={loading}
        emptyMessage="هیچ گزارشی موجود نیست"
        onRowClick={handleView}
      />
    </div>
  );
};

export default SystemReports;