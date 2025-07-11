import React, { useState } from 'react';
import { useQuery } from 'react-query';
import TransactionChart from '../widgets/TransactionChart';
import CustomerStats from '../widgets/CustomerStats';
import ExchangeRateBoard from '../widgets/ExchangeRateBoard';
import ActivityFeed from '../widgets/ActivityFeed';
import QuickActions from '../widgets/QuickActions';

const BranchDashboard = () => {
  const [dateRange, setDateRange] = useState('30d');
  
  // Fetch branch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery(
    ['branchDashboard', dateRange],
    () => fetchBranchDashboardData(dateRange),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const fetchBranchDashboardData = async (range) => {
    // Mock data - replace with actual API call
    return {
      branchInfo: {
        name: 'شعبه مرکزی',
        code: 'BR001',
        manager: 'علی احمدی',
        address: 'تهران، خیابان ولیعصر، پلاک 123'
      },
      metrics: {
        dailyTransactions: 45,
        monthlyRevenue: 45000000,
        activeCustomers: 89,
        pendingRemittances: 12,
        cashBalance: {
          IRR: 500000000,
          USD: 15000,
          EUR: 8000,
          AED: 25000
        }
      },
      recentTransactions: [
        { id: 1, customer: 'محمد رضایی', type: 'خرید', currency: 'USD', amount: 1000, rate: 42500, time: '10:30' },
        { id: 2, customer: 'فاطمه کریمی', type: 'فروش', currency: 'EUR', amount: 500, rate: 46200, time: '10:15' },
        { id: 3, customer: 'حسن مرادی', type: 'حواله', currency: 'AED', amount: 2000, rate: 11580, time: '09:45' },
      ],
      pendingRemittances: [
        { id: 1, sender: 'مریم احمدی', receiver: 'John Smith', amount: 500, currency: 'USD', destination: 'کانادا', status: 'در انتظار تایید' },
        { id: 2, sender: 'رضا نوری', receiver: 'Ahmed Ali', amount: 1000, currency: 'AED', destination: 'امارات', status: 'در حال پردازش' },
      ],
      topCustomers: [
        { id: 1, name: 'شرکت بازرگانی آسیا', totalVolume: 15000000, transactionCount: 45 },
        { id: 2, name: 'علی محمدی', totalVolume: 8500000, transactionCount: 23 },
        { id: 3, name: 'مریم کریمی', totalVolume: 6200000, transactionCount: 18 },
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
          <h1 className="text-3xl font-bold text-gray-900">داشبورد {dashboardData?.branchInfo?.name}</h1>
          <p className="text-gray-600 mt-1">کد شعبه: {dashboardData?.branchInfo?.code}</p>
          <p className="text-gray-500 text-sm">مدیر: {dashboardData?.branchInfo?.manager}</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="today">امروز</option>
            <option value="7d">7 روز گذشته</option>
            <option value="30d">30 روز گذشته</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">معاملات امروز</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.metrics?.dailyTransactions}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">مشتریان فعال</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.metrics?.activeCustomers}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">درآمد ماهانه</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.metrics?.monthlyRevenue?.toLocaleString('fa-IR')} ریال
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">حواله در انتظار</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData?.metrics?.pendingRemittances}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Balance Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">موجودی نقدینگی شعبه</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(dashboardData?.metrics?.cashBalance || {}).map(([currency, amount]) => (
              <div key={currency} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {currency === 'IRR' ? amount.toLocaleString('fa-IR') : amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">{currency}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts and Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <TransactionChart dateRange={dateRange} />
          
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">آخرین معاملات</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        مشتری
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        نوع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ارز
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        مبلغ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        نرخ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        زمان
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData?.recentTransactions?.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.customer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.type === 'خرید' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.type === 'فروش'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.rate.toLocaleString('fa-IR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ExchangeRateBoard />
          <QuickActions />
          
          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">مشتریان برتر</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData?.topCustomers?.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="mr-3">
                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.transactionCount} معامله</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {customer.totalVolume.toLocaleString('fa-IR')} ریال
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Remittances */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">حواله‌های در انتظار</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    فرستنده
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    گیرنده
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    مقصد
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
                {dashboardData?.pendingRemittances?.map((remittance) => (
                  <tr key={remittance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {remittance.sender}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {remittance.receiver}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {remittance.amount.toLocaleString()} {remittance.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {remittance.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {remittance.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-green-600 hover:text-green-900 ml-2">
                        تایید
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        مشاهده
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;