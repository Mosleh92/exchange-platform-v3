import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Users, Lock, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Button from '../common/Button';
import { LoadingSpinner } from '../common/Loading';

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'failed_login' | 'suspicious_activity' | 'data_access' | 'system_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  user?: string;
  ip?: string;
  location?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  failedLogins: number;
  activeUsers: number;
  securityScore: number;
  lastUpdated: string;
}

interface SecurityDashboardProps {
  tenantId?: string;
  className?: string;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ tenantId, className }) => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [tenantId, selectedTimeRange]);

  const loadSecurityData = async (): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMetrics: SecurityMetrics = {
        totalEvents: 1247,
        criticalEvents: 3,
        failedLogins: 12,
        activeUsers: 89,
        securityScore: 94,
        lastUpdated: new Date().toISOString(),
      };

      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          type: 'failed_login',
          severity: 'medium',
          description: 'تلاش ناموفق ورود از IP: 192.168.1.100',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          user: 'user@example.com',
          ip: '192.168.1.100',
          location: 'تهران، ایران',
        },
        {
          id: '2',
          type: 'login',
          severity: 'low',
          description: 'ورود موفق کاربر',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          user: 'admin@example.com',
          ip: '192.168.1.50',
          location: 'تهران، ایران',
        },
        {
          id: '3',
          type: 'suspicious_activity',
          severity: 'high',
          description: 'فعالیت مشکوک در دسترسی به داده‌های حساس',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          user: 'user@example.com',
          ip: '192.168.1.100',
          location: 'تهران، ایران',
        },
      ];

      setMetrics(mockMetrics);
      setRecentEvents(mockEvents);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    const colors = {
      low: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      high: 'text-orange-600 bg-orange-50',
      critical: 'text-red-600 bg-red-50',
    };
    return colors[severity as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const getEventIcon = (type: string): React.ReactNode => {
    const icons = {
      login: <CheckCircle className="w-4 h-4" />,
      logout: <XCircle className="w-4 h-4" />,
      failed_login: <AlertTriangle className="w-4 h-4" />,
      suspicious_activity: <AlertTriangle className="w-4 h-4" />,
      data_access: <Eye className="w-4 h-4" />,
      system_change: <Activity className="w-4 h-4" />,
    };
    return icons[type as keyof typeof icons] || <Activity className="w-4 h-4" />;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const chartData = [
    { name: 'ورود موفق', value: 89, color: '#10b981' },
    { name: 'ورود ناموفق', value: 12, color: '#f59e0b' },
    { name: 'فعالیت مشکوک', value: 3, color: '#ef4444' },
  ];

  const timeRangeOptions = [
    { value: '1h', label: '1 ساعت' },
    { value: '24h', label: '24 ساعت' },
    { value: '7d', label: '7 روز' },
    { value: '30d', label: '30 روز' },
  ];

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              داشبورد امنیت
            </h1>
            <p className="text-gray-600">
              نظارت بر فعالیت‌های امنیتی و رویدادهای سیستم
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="form-input w-32"
            >
              {timeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <Button
              onClick={loadSecurityData}
              variant="outline"
              size="sm"
            >
              بروزرسانی
            </Button>
          </div>
        </div>
      </div>

      {/* Security Score */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">
                {metrics.securityScore}%
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">امتیاز امنیت</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">
                {metrics.totalEvents}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">کل رویدادها</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <span className="text-2xl font-bold text-gray-900">
                {metrics.criticalEvents}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">رویدادهای بحرانی</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">
                {metrics.activeUsers}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">کاربران فعال</h3>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Event Distribution Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            توزیع رویدادها
          </h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Security Events Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            رویدادهای اخیر
          </h3>
          
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div className={`p-2 rounded-full ${getSeverityColor(event.severity)}`}>
                  {getEventIcon(event.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {event.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    {event.user && (
                      <span>کاربر: {event.user}</span>
                    )}
                    {event.ip && (
                      <span>IP: {event.ip}</span>
                    )}
                    <span>{formatTimestamp(event.timestamp)}</span>
                  </div>
                </div>
                
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                  {event.severity === 'low' && 'کم'}
                  {event.severity === 'medium' && 'متوسط'}
                  {event.severity === 'high' && 'زیاد'}
                  {event.severity === 'critical' && 'بحرانی'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          اقدامات امنیتی
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            <Lock className="w-4 h-4" />
            <span>تغییر رمز عبور</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>فعال‌سازی 2FA</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>مشاهده لاگ‌ها</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard; 