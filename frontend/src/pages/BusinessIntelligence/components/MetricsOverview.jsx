// Metrics Overview Component - Key Business Metrics
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

const MetricsOverview = ({ data, loading, dateRange }) => {
  // Mock data for demonstration
  const revenueData = [
    { date: '۱۴۰۳/۰۹/۰۱', revenue: 125000, transactions: 45 },
    { date: '۱۴۰۳/۰۹/۰۲', revenue: 135000, transactions: 52 },
    { date: '۱۴۰۳/۰۹/۰۳', revenue: 142000, transactions: 48 },
    { date: '۱۴۰۳/۰۹/۰۴', revenue: 128000, transactions: 41 },
    { date: '۱۴۰۳/۰۹/۰۵', revenue: 156000, transactions: 63 },
    { date: '۱۴۰۳/۰۹/۰۶', revenue: 149000, transactions: 57 },
    { date: '۱۴۰۳/۰۹/۰۷', revenue: 165000, transactions: 68 }
  ];

  const customerBehaviorData = [
    { segment: 'کاربران جدید', value: 35, color: '#8B5CF6' },
    { segment: 'کاربران فعال', value: 45, color: '#06B6D4' },
    { segment: 'کاربران VIP', value: 20, color: '#F59E0B' }
  ];

  const performanceMetrics = [
    {
      title: 'میانگین ارزش تراکنش',
      value: '۲,۸۵۰,۰۰۰',
      unit: 'تومان',
      change: '+۱۲.۳%',
      trend: 'up',
      icon: DollarSign
    },
    {
      title: 'نرخ تبدیل',
      value: '۴.۷',
      unit: '%',
      change: '+۰.۸%',
      trend: 'up',
      icon: Percent
    },
    {
      title: 'ارزش زندگی مشتری',
      value: '۱۸,۵۰۰,۰۰۰',
      unit: 'تومان',
      change: '+۲۵.۱%',
      trend: 'up',
      icon: TrendingUp
    }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fa-IR').format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue and Transaction Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">روند درآمد</h3>
            <div className="flex items-center text-green-600 text-sm">
              <TrendingUp className="w-4 h-4 ml-1" />
              <span>+۱۵.۳% نسبت به دوره قبل</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.split('/')[2]}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${formatCurrency(value / 1000)}K`}
              />
              <Tooltip 
                formatter={(value, name) => [
                  `${formatCurrency(value)} تومان`,
                  name === 'revenue' ? 'درآمد' : 'تراکنش'
                ]}
                labelFormatter={(label) => `تاریخ: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#06B6D4" 
                fill="#06B6D4" 
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Volume Chart */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">حجم تراکنش‌ها</h3>
            <div className="flex items-center text-blue-600 text-sm">
              <TrendingUp className="w-4 h-4 ml-1" />
              <span>+۸.۷% افزایش</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.split('/')[2]}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value, name) => [
                  `${value} تراکنش`,
                  'تعداد تراکنش'
                ]}
                labelFormatter={(label) => `تاریخ: ${label}`}
              />
              <Bar 
                dataKey="transactions" 
                fill="#8B5CF6" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {performanceMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.trend === 'up';
          
          return (
            <div key={index} className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Icon className={`w-6 h-6 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="w-4 h-4 ml-1" /> : <TrendingDown className="w-4 h-4 ml-1" />}
                  <span>{metric.change}</span>
                </div>
              </div>
              <div>
                <h4 className="text-gray-600 text-sm mb-1">{metric.title}</h4>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value} <span className="text-sm font-normal text-gray-500">{metric.unit}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Behavior Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Segments Pie Chart */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">تحلیل رفتار مشتریان</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={customerBehaviorData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ segment, value }) => `${segment}: ${value}%`}
              >
                {customerBehaviorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'درصد']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ROI Analysis */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">تحلیل بازگشت سرمایه</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-gray-700">ROI کل</span>
              <span className="text-xl font-bold text-green-600">+۲۸.۵%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <span className="text-gray-700">ROI ماهانه</span>
              <span className="text-xl font-bold text-blue-600">+۴.۲%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <span className="text-gray-700">ROI هفتگی</span>
              <span className="text-xl font-bold text-purple-600">+۱.۱%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsOverview;