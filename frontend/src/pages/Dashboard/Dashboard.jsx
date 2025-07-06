import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTenant } from '../../contexts/TenantContext'
import { toast } from 'react-hot-toast'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  Activity,
  Building,
  Calendar,
  Clock,
  AlertCircle,
} from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()
  const { currentTenant } = useTenant()
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    pendingTransactions: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load dashboard statistics
      const statsResponse = await fetch('/api/dashboard/stats')
      const statsData = await statsResponse.json()
      setStats(statsData)

      // Load recent transactions
      const transactionsResponse = await fetch('/api/dashboard/recent-transactions')
      const transactionsData = await transactionsResponse.json()
      setRecentTransactions(transactionsData.transactions)

      // Load chart data
      const chartResponse = await fetch('/api/dashboard/chart-data')
      const chartData = await chartResponse.json()
      setChartData(chartData)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('خطا در بارگذاری اطلاعات داشبورد')
    } finally {
      setLoading(false)
    }
  }

  // Mock data for demonstration
  const mockStats = {
    totalTransactions: 1247,
    totalRevenue: 2450000,
    activeCustomers: 856,
    pendingTransactions: 23,
  }

  const mockRecentTransactions = [
    {
      id: 'TXN001',
      customerName: 'احمد رضایی',
      amount: 15000,
      currency: 'AED',
      type: 'buy',
      status: 'completed',
      date: '2024-01-15T10:30:00Z',
    },
    {
      id: 'TXN002',
      customerName: 'فاطمه محمدی',
      amount: 25000,
      currency: 'USD',
      type: 'sell',
      status: 'pending',
      date: '2024-01-15T09:15:00Z',
    },
    {
      id: 'TXN003',
      customerName: 'علی کریمی',
      amount: 8000,
      currency: 'EUR',
      type: 'buy',
      status: 'completed',
      date: '2024-01-15T08:45:00Z',
    },
  ]

  const mockChartData = [
    { name: 'فروردین', transactions: 120, revenue: 450000 },
    { name: 'اردیبهشت', transactions: 150, revenue: 520000 },
    { name: 'خرداد', transactions: 180, revenue: 580000 },
    { name: 'تیر', transactions: 200, revenue: 650000 },
    { name: 'مرداد', transactions: 220, revenue: 720000 },
    { name: 'شهریور', transactions: 250, revenue: 800000 },
  ]

  const currencyDistribution = [
    { name: 'دلار آمریکا', value: 45, color: '#3b82f6' },
    { name: 'یورو', value: 30, color: '#10b981' },
    { name: 'پوند', value: 15, color: '#f59e0b' },
    { name: 'سایر', value: 10, color: '#ef4444' },
  ]

  const StatCard = ({ title, value, change, icon: Icon, color, ariaLabel }) => (
    <div className="bg-white rounded-xl shadow-soft p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              change > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(change)}% نسبت به ماه گذشته
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )

  const TransactionItem = ({ transaction }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100 hover:shadow-soft transition-shadow">
      <div className="flex items-center space-x-4 space-x-reverse">
        <div className={`w-3 h-3 rounded-full ${
          transaction.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
        }`} />
        <div>
          <p className="font-medium text-gray-900">{transaction.customerName}</p>
          <p className="text-sm text-gray-600">{transaction.id}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900">
          {transaction.amount.toLocaleString()} {transaction.currency}
        </p>
        <p className={`text-sm ${
          transaction.type === 'buy' ? 'text-green-600' : 'text-red-600'
        }`}>
          {transaction.type === 'buy' ? 'خرید' : 'فروش'}
        </p>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" role="main" aria-label="داشبورد مدیریت">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8" role="banner" aria-label="سربرگ داشبورد">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            داشبورد مدیریت
          </h1>
          <p className="text-gray-600">
            خوش آمدید، {user?.name} | {currentTenant?.name}
          </p>
        </header>

        {/* Stats Cards */}
        <section aria-label="آمار کلیدی" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="تعداد تراکنش‌ها"
            value={mockStats.totalTransactions}
            change={5}
            icon={CreditCard}
            color="bg-blue-500"
            ariaLabel="تعداد کل تراکنش‌ها"
          />
          <StatCard
            title="درآمد کل"
            value={mockStats.totalRevenue.toLocaleString() + ' تومان'}
            change={8}
            icon={DollarSign}
            color="bg-green-500"
            ariaLabel="درآمد کل"
          />
          <StatCard
            title="مشتریان فعال"
            value={mockStats.activeCustomers}
            change={-2}
            icon={Users}
            color="bg-yellow-500"
            ariaLabel="تعداد مشتریان فعال"
          />
          <StatCard
            title="تراکنش‌های در انتظار"
            value={mockStats.pendingTransactions}
            change={1}
            icon={Activity}
            color="bg-red-500"
            ariaLabel="تراکنش‌های در انتظار"
          />
        </section>

        {/* Recent Transactions */}
        <section aria-label="تراکنش‌های اخیر" className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">تراکنش‌های اخیر</h2>
          <div role="list" aria-label="لیست تراکنش‌ها" className="space-y-4">
            {mockRecentTransactions.map(txn => (
              <TransactionItem key={txn.id} transaction={txn} />
            ))}
          </div>
        </section>

        {/* Chart Section */}
        <section aria-label="نمودار تراکنش‌ها و درآمد" className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">نمودار تراکنش‌ها و درآمد</h2>
          <div className="bg-white rounded-lg shadow-soft p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockChartData} role="img" aria-label="نمودار خطی تراکنش‌ها و درآمد">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="transactions" stroke="#3b82f6" name="تراکنش‌ها" />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" name="درآمد" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Currency Distribution Pie Chart */}
        <section aria-label="توزیع ارزها" className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">توزیع ارزها</h2>
          <div className="bg-white rounded-lg shadow-soft p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart role="img" aria-label="نمودار دایره‌ای توزیع ارزها">
                <Pie data={currencyDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {currencyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} aria-label={entry.name} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-soft p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            عملیات سریع
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <CreditCard className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">تراکنش جدید</span>
            </button>
            <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <Users className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">مشتری جدید</span>
            </button>
            <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <Building className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">شعبه جدید</span>
            </button>
            <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
              <Calendar className="w-8 h-8 text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">گزارش</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 