import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Unlock,
  User,
  Activity,
  Globe,
  Clock,
  Filter,
  Download,
  Search,
  Bell,
  FileText
} from 'lucide-react';
import StatCard from './StatCard';
import DataChart from './DataChart';
import DataTable from './DataTable';

const SecurityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Mock data
  const mockLogs = [
    {
      id: 'SEC001',
      type: 'ورود ناموفق',
      severity: 'متوسط',
      user: 'admin@example.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: '1402/09/28 14:30:25',
      description: 'تلاش ورود با رمز عبور اشتباه',
      action: 'ورود',
      resource: 'داشبورد ادمین',
      status: 'رد شده',
      location: 'تهران، ایران',
      riskScore: 6.5,
      resolved: false
    },
    {
      id: 'SEC002',
      type: 'دسترسی غیرمجاز',
      severity: 'بالا',
      user: 'unknown',
      ipAddress: '45.123.45.67',
      userAgent: 'curl/7.68.0',
      timestamp: '1402/09/28 14:25:12',
      description: 'تلاش دسترسی به API بدون احراز هویت',
      action: 'API Call',
      resource: '/api/admin/users',
      status: 'رد شده',
      location: 'ناشناخته',
      riskScore: 9.2,
      resolved: false
    },
    {
      id: 'SEC003',
      type: 'تغییر رمز عبور',
      severity: 'کم',
      user: 'z.mohammadi@example.com',
      ipAddress: '192.168.1.150',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      timestamp: '1402/09/28 13:45:30',
      description: 'تغییر رمز عبور توسط کاربر',
      action: 'تغییر رمز',
      resource: 'پروفایل کاربری',
      status: 'موفق',
      location: 'تهران، ایران',
      riskScore: 2.1,
      resolved: true
    },
    {
      id: 'SEC004',
      type: 'ورود مشکوک',
      severity: 'بالا',
      user: 'm.rezaei@example.com',
      ipAddress: '203.45.123.89',
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
      timestamp: '1402/09/28 12:30:45',
      description: 'ورود از مکان جغرافیایی غیرعادی',
      action: 'ورود',
      resource: 'پنل مدیریت',
      status: 'موفق',
      location: 'دبی، امارات',
      riskScore: 8.7,
      resolved: false
    },
    {
      id: 'SEC005',
      type: 'حذف داده',
      severity: 'بالا',
      user: 'admin@example.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: '1402/09/28 11:15:20',
      description: 'حذف تراکنش توسط ادمین',
      action: 'حذف',
      resource: 'تراکنش P2P001',
      status: 'موفق',
      location: 'تهران، ایران',
      riskScore: 7.3,
      resolved: true
    },
    {
      id: 'SEC006',
      type: 'فعال‌سازی 2FA',
      severity: 'کم',
      user: 'f.karimi@example.com',
      ipAddress: '192.168.1.200',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      timestamp: '1402/09/28 10:45:15',
      description: 'فعال‌سازی احراز هویت دو مرحله‌ای',
      action: 'تنظیمات امنیتی',
      resource: 'پروفایل کاربری',
      status: 'موفق',
      location: 'اصفهان، ایران',
      riskScore: 1.0,
      resolved: true
    }
  ];

  const mockStats = {
    totalLogs: 15847,
    todayLogs: 234,
    criticalAlerts: 12,
    resolvedIssues: 142,
    failedLogins: 67,
    suspiciousActivities: 23,
    blockedIPs: 8,
    averageRiskScore: 5.2,
    securityIncidents: 5,
    systemUptime: 99.8
  };

  const chartData = {
    severity: {
      labels: ['کم', 'متوسط', 'بالا', 'بحرانی'],
      datasets: [{
        data: [145, 89, 34, 12],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(127, 29, 29, 0.8)'
        ],
      }]
    },
    timeline: {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      datasets: [{
        label: 'تعداد رویدادهای امنیتی',
        data: [12, 8, 15, 25, 20, 18],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      }]
    },
    riskScore: {
      labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
      datasets: [{
        label: 'میانگین امتیاز ریسک',
        data: [4.2, 3.8, 5.1, 6.3, 4.9, 5.2],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
      }]
    },
    eventTypes: {
      labels: ['ورود ناموفق', 'دسترسی غیرمجاز', 'تغییر داده', 'ورود مشکوک', 'سایر'],
      datasets: [{
        data: [67, 34, 23, 18, 15],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(59, 130, 246, 0.8)',
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
        setLogs(mockLogs);
        setStats(mockStats);
      } catch (error) {
        console.error('Error fetching security logs:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedType, selectedSeverity, selectedPeriod]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'بحرانی':
        return 'bg-red-900 text-red-100 dark:bg-red-900 dark:text-red-100';
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'موفق':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'رد شده':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRiskScoreColor = (score) => {
    if (score >= 8) return 'text-red-600 dark:text-red-400 font-bold';
    if (score >= 6) return 'text-orange-600 dark:text-orange-400 font-medium';
    if (score >= 4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const columns = [
    { 
      key: 'timestamp', 
      label: 'زمان', 
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.id}</div>
        </div>
      )
    },
    { 
      key: 'type', 
      label: 'نوع رویداد', 
      sortable: true
    },
    { 
      key: 'severity', 
      label: 'شدت',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(value)}`}>
          {value}
        </span>
      )
    },
    { 
      key: 'user', 
      label: 'کاربر', 
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.ipAddress}</div>
        </div>
      )
    },
    { 
      key: 'action', 
      label: 'عملیات'
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
      key: 'riskScore', 
      label: 'امتیاز ریسک',
      sortable: true,
      render: (value) => (
        <span className={getRiskScoreColor(value)}>
          {value.toFixed(1)}
        </span>
      )
    },
    { 
      key: 'location', 
      label: 'مکان'
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
          {!row.resolved && (
            <button
              onClick={() => handleResolve(row)}
              className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
              title="حل شده"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleBlock(row)}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            title="مسدود کردن IP"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const handleView = (log) => {
    console.log('View log:', log);
  };

  const handleResolve = async (log) => {
    try {
      // API call to mark as resolved
      setLogs(prev => 
        prev.map(l => 
          l.id === log.id ? { ...l, resolved: true } : l
        )
      );
    } catch (error) {
      console.error('Error resolving log:', error);
    }
  };

  const handleBlock = async (log) => {
    if (window.confirm(`آیا از مسدود کردن IP ${log.ipAddress} اطمینان دارید؟`)) {
      try {
        // API call to block IP
        console.log('Block IP:', log.ipAddress);
      } catch (error) {
        console.error('Error blocking IP:', error);
      }
    }
  };

  const filteredLogs = logs.filter(log => {
    if (selectedType !== 'all' && log.type !== selectedType) return false;
    if (selectedSeverity !== 'all' && log.severity !== selectedSeverity) return false;
    return true;
  });

  const criticalLogs = logs.filter(log => 
    (log.severity === 'بالا' || log.severity === 'بحرانی') && !log.resolved
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            گزارشات امنیتی و لاگها
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            نظارت بر رویدادهای امنیتی و تحلیل تهدیدات
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
            گزارش امنیتی
          </button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="رویدادهای امنیتی"
          value={stats?.totalLogs}
          icon={Shield}
          color="blue"
          isLoading={loading}
        />
        <StatCard
          title="هشدارهای بحرانی"
          value={stats?.criticalAlerts}
          icon={AlertTriangle}
          color="red"
          isLoading={loading}
        />
        <StatCard
          title="ورودهای ناموفق"
          value={stats?.failedLogins}
          icon={Lock}
          color="yellow"
          isLoading={loading}
        />
        <StatCard
          title="فعالیت‌های مشکوک"
          value={stats?.suspiciousActivities}
          icon={Eye}
          color="purple"
          isLoading={loading}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="مسائل حل شده"
          value={stats?.resolvedIssues}
          icon={Shield}
          trend="up"
          trendValue="+8%"
          color="green"
          isLoading={loading}
        />
        <StatCard
          title="IPهای مسدود شده"
          value={stats?.blockedIPs}
          icon={Lock}
          color="red"
          isLoading={loading}
        />
        <StatCard
          title="میانگین امتیاز ریسک"
          value={stats?.averageRiskScore}
          icon={Activity}
          color="indigo"
          isLoading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          type="line"
          data={chartData.timeline}
          title="روند رویدادهای امنیتی (24 ساعت گذشته)"
          isLoading={loading}
        />
        <DataChart
          type="doughnut"
          data={chartData.severity}
          title="توزیع شدت رویدادها"
          height={300}
          isLoading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataChart
          type="bar"
          data={chartData.riskScore}
          title="روند امتیاز ریسک ماهانه"
          isLoading={loading}
        />
        <DataChart
          type="doughnut"
          data={chartData.eventTypes}
          title="انواع رویدادهای امنیتی"
          height={300}
          isLoading={loading}
        />
      </div>

      {/* Critical Alerts */}
      {criticalLogs.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              هشدارهای بحرانی و فوری
            </h3>
          </div>
          <div className="space-y-3">
            {criticalLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {log.type} - {log.user}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {log.description} | IP: {log.ipAddress} | ریسک: {log.riskScore}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    بررسی
                  </button>
                  <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                    مسدود
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">فیلتر لاگها:</span>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">همه انواع</option>
            <option value="ورود ناموفق">ورود ناموفق</option>
            <option value="دسترسی غیرمجاز">دسترسی غیرمجاز</option>
            <option value="ورود مشکوک">ورود مشکوک</option>
            <option value="تغییر رمز عبور">تغییر رمز عبور</option>
            <option value="حذف داده">حذف داده</option>
          </select>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">همه سطوح</option>
            <option value="بحرانی">بحرانی</option>
            <option value="بالا">بالا</option>
            <option value="متوسط">متوسط</option>
            <option value="کم">کم</option>
          </select>
        </div>
      </div>

      {/* Security Logs Table */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        isLoading={loading}
        emptyMessage="هیچ لاگ امنیتی موجود نیست"
        onRowClick={handleView}
      />
    </div>
  );
};

export default SecurityLogs;