import React, { useEffect, useState } from 'react';
import axios from 'axios';

const links = [
  { to: '/management/branches', label: 'مدیریت شعب' },
  { to: '/customers', label: 'مدیریت مشتریان' },
  { to: '/transactions', label: 'مدیریت معاملات' },
  { to: '/remittances', label: 'مدیریت حواله‌ها' },
  { to: '/reports', label: 'گزارشات مالی' },
];

const TenantDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/dashboard/tenant-stats');
        setStats(res.data);
      } catch (err) {
        setError('خطا در دریافت آمار داشبورد');
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">داشبورد صرافی/بانک</h2>
      {/* کارت‌های آمار */}
      {loading ? (
        <div>در حال بارگذاری...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <span className="text-3xl font-bold text-blue-700">{stats.branches?.toLocaleString() || 0}</span>
            <span className="text-gray-600 mt-2">تعداد شعب</span>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <span className="text-3xl font-bold text-blue-700">{stats.customers?.toLocaleString() || 0}</span>
            <span className="text-gray-600 mt-2">تعداد مشتریان</span>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <span className="text-3xl font-bold text-blue-700">{stats.transactions?.toLocaleString() || 0}</span>
            <span className="text-gray-600 mt-2">تعداد معاملات</span>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <span className="text-3xl font-bold text-blue-700">{stats.totalBalance ? (stats.totalBalance / 1e9).toLocaleString() : 0}</span>
            <span className="text-gray-600 mt-2">مانده کل (میلیارد ریال)</span>
          </div>
        </div>
      ) : null}
      {/* کارت‌های مدیریتی */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {links.map(link => (
          <a key={link.to} href={link.to} className="bg-blue-50 hover:bg-blue-100 rounded shadow p-6 flex flex-col items-center transition">
            <span className="text-lg font-semibold text-blue-800 mb-2">{link.label}</span>
            <span className="text-blue-500">مشاهده و مدیریت</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default TenantDashboard;
