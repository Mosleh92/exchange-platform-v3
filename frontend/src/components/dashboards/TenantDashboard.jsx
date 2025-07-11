import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import TransactionChart from '../widgets/TransactionChart';
import CurrencyWidget from '../widgets/CurrencyWidget';
import CustomerStats from '../widgets/CustomerStats';
import RevenueChart from '../widgets/RevenueChart';
import AlertsWidget from '../widgets/AlertsWidget';
import QuickActions from '../widgets/QuickActions';
import ExchangeRateBoard from '../widgets/ExchangeRateBoard';
import ActivityFeed from '../widgets/ActivityFeed';

const TenantDashboard = () => {
  const [dateRange, setDateRange] = useState('30d');
  
  // Fetch tenant dashboard data
  const { data: dashboardData, isLoading, error } = useQuery(
    ['tenantDashboard', dateRange],
    () => fetchTenantDashboardData(dateRange),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const fetchTenantDashboardData = async (range) => {
    // Mock data - replace with actual API call
    return {
      totalBranches: 5,
      totalStaff: 20,
      totalCustomers: 300,
      monthlyRevenue: 120000000,
      branches: [
        { id: 1, name: 'شعبه مرکزی', code: 'BR001', manager: 'مدیر الف', status: 'فعال', revenue: 45000000 },
        { id: 2, name: 'شعبه غرب', code: 'BR002', manager: 'مدیر ب', status: 'فعال', revenue: 35000000 },
        { id: 3, name: 'شعبه شرق', code: 'BR003', manager: 'مدیر ج', status: 'فعال', revenue: 25000000 },
        { id: 4, name: 'شعبه شمال', code: 'BR004', manager: 'مدیر د', status: 'غیرفعال', revenue: 15000000 },
      ],
      recentActivity: [
        { id: 1, message: 'ثبت تراکنش جدید در شعبه مرکزی', time: '2 دقیقه پیش', type: 'transaction' },
        { id: 2, message: 'افزودن کارمند جدید در شعبه غرب', time: '15 دقیقه پیش', type: 'staff' },
        { id: 3, message: 'تایید حواله بین‌المللی', time: '30 دقیقه پیش', type: 'remittance' },
      ],
      alerts: [
        { id: 1, message: 'موجودی ارز دلار در شعبه شرق پایین است', type: 'warning', priority: 'high' },
        { id: 2, message: 'تراکنش مشکوک در شعبه شمال', type: 'danger', priority: 'urgent' },
      ]
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        خطا در بارگذاری داده‌ها: {error.message}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">داشبورد صرافی اصلی</h1>
          <p className="text-gray-600 mt-2">نمای کلی عملکرد تمام شعبات</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="7d">7 روز گذشته</option>
            <option value="30d">30 روز گذشته</option>
            <option value="90d">90 روز گذشته</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">تعداد شعبات</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.totalBranches}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">تعداد کارمندان</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.totalStaff}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.239" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">تعداد مشتریان</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.totalCustomers}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">درآمد ماهانه</p>
              <p className="text-3xl font-bold text-gray-900">
                {dashboardData?.monthlyRevenue?.toLocaleString('fa-IR')} ریال
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <TransactionChart dateRange={dateRange} />
          <RevenueChart dateRange={dateRange} />
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <ExchangeRateBoard />
          <AlertsWidget alerts={dashboardData?.alerts} />
          <QuickActions />
        </div>
      </div>

      {/* Branch Management Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">مدیریت شعبات</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نام شعبه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کد شعبه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مدیر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    درآمد ماهانه
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData?.branches?.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {branch.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branch.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branch.manager}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branch.revenue.toLocaleString('fa-IR')} ریال
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        branch.status === 'فعال' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {branch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 ml-2">
                        مشاهده
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        ویرایش
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomerStats />
        <ActivityFeed activities={dashboardData?.recentActivity} />
      </div>
    </div>
  );
};

export default TenantDashboard;