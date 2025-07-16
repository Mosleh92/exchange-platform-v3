import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  date: string;
  value: number;
}

interface DashboardStatsProps {
  tenantId?: string;
  className?: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ tenantId, className }) => {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, [tenantId]);

  const loadDashboardStats = async (): Promise<void> => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockStats: StatCard[] = [
        {
          id: 'total-transactions',
          title: 'کل معاملات',
          value: '1,234',
          change: 12.5,
          changeType: 'increase',
          icon: <Activity className="w-5 h-5" />,
          color: 'bg-blue-500'
        },
        {
          id: 'total-volume',
          title: 'حجم معاملات',
          value: '₺45.2M',
          change: 8.3,
          changeType: 'increase',
          icon: <DollarSign className="w-5 h-5" />,
          color: 'bg-green-500'
        },
        {
          id: 'active-users',
          title: 'کاربران فعال',
          value: '892',
          change: -2.1,
          changeType: 'decrease',
          icon: <Users className="w-5 h-5" />,
          color: 'bg-purple-500'
        },
        {
          id: 'security-score',
          title: 'امنیت سیستم',
          value: '98.5%',
          change: 1.2,
          changeType: 'increase',
          icon: <Shield className="w-5 h-5" />,
          color: 'bg-orange-500'
        }
      ];

      const mockChartData: ChartData[] = [
        { date: 'شنبه', value: 120 },
        { date: 'یکشنبه', value: 145 },
        { date: 'دوشنبه', value: 132 },
        { date: 'سه‌شنبه', value: 168 },
        { date: 'چهارشنبه', value: 189 },
        { date: 'پنج‌شنبه', value: 156 },
        { date: 'جمعه', value: 142 }
      ];

      setStats(mockStats);
      setChartData(mockChartData);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="w-24 h-6 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                {stat.icon}
              </div>
              <div className="flex items-center space-x-1">
                {stat.changeType === 'increase' ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatChange(stat.change)}
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {stat.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          روند معاملات هفتگی
        </h3>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats; 