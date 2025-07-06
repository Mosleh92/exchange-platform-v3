import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ExchangeDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    transactions: { total: 0, today: 0, pending: 0 },
    remittances: { total: 0, today: 0, pending: 0 },
    accounts: { total: 0, active: 0 },
    balance: { total: 0, currencies: [] }
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentRemittances, setRecentRemittances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch transaction stats
      const transactionResponse = await fetch('/api/transactions/stats/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const transactionData = await transactionResponse.json();

      // Fetch remittance stats
      const remittanceResponse = await fetch('/api/remittances/stats/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const remittanceData = await remittanceResponse.json();

      // Fetch recent transactions
      const recentTransactionsResponse = await fetch('/api/transactions/my-transactions?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const recentTransactionsData = await recentTransactionsResponse.json();

      // Fetch recent remittances
      const recentRemittancesResponse = await fetch('/api/remittances/my-remittances?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const recentRemittancesData = await recentRemittancesResponse.json();

      setStats({
        transactions: {
          total: transactionData.data?.stats?.totalTransactions || 0,
          today: 0, // Calculate from recent data
          pending: transactionData.data?.stats?.byStatus?.filter(s => s.status === 'pending').length || 0
        },
        remittances: {
          total: remittanceData.data?.stats?.totalRemittances || 0,
          today: 0, // Calculate from recent data
          pending: remittanceData.data?.stats?.byStatus?.filter(s => s.status === 'pending').length || 0
        },
        accounts: { total: 0, active: 0 },
        balance: { total: 0, currencies: [] }
      });

      setRecentTransactions(recentTransactionsData.data?.transactions || []);
      setRecentRemittances(recentRemittancesData.data?.remittances || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('خطا در دریافت اطلاعات داشبورد');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'تکمیل شده';
      case 'pending':
        return 'در انتظار';
      case 'cancelled':
        return 'لغو شده';
      case 'processing':
        return 'در حال پردازش';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-6">
        <h1 className="text-2xl font-bold mb-2">
          خوش آمدید، {user?.name || 'کاربر'}
        </h1>
        <p className="text-blue-100">
          به پنل مدیریت ارز و حواله خوش آمدید
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">کل تراکنش‌ها</p>
              <p className="text-2xl font-bold text-gray-900">{stats.transactions.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">کل حواله‌ها</p>
              <p className="text-2xl font-bold text-gray-900">{stats.remittances.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">در انتظار</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.transactions.pending + stats.remittances.pending}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">موجودی کل</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.balance.total, 'IRR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">آخرین تراکنش‌ها</h3>
          </div>
          <div className="p-6">
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.type === 'currency_buy' ? 'خرید' : 'فروش'} {transaction.fromCurrency}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(transaction.amount, transaction.fromCurrency)}
                      </p>
                    </div>
                    <div className="text-left">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(transaction.createdAt).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">هیچ تراکنشی یافت نشد</p>
            )}
          </div>
        </div>

        {/* Recent Remittances */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">آخرین حواله‌ها</h3>
          </div>
          <div className="p-6">
            {recentRemittances.length > 0 ? (
              <div className="space-y-4">
                {recentRemittances.map((remittance) => (
                  <div key={remittance._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        حواله {remittance.type === 'inter_branch' ? 'بین شعبه‌ای' : 'بین‌المللی'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {remittance.receiverInfo?.name} - {formatCurrency(remittance.amount, remittance.fromCurrency)}
                      </p>
                    </div>
                    <div className="text-left">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(remittance.status)}`}>
                        {getStatusText(remittance.status)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(remittance.createdAt).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">هیچ حواله‌ای یافت نشد</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">عملیات سریع</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/exchange'}
            className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            خرید و فروش ارز
          </button>
          
          <button
            onClick={() => window.location.href = '/remittance'}
            className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            ایجاد حواله
          </button>
          
          <button
            onClick={() => window.location.href = '/transactions'}
            className="flex items-center justify-center p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            مشاهده تراکنش‌ها
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeDashboard; 