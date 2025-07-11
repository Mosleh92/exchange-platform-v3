// Business Intelligence Dashboard Main Component
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  BarChart3, 
  Download,
  Calendar,
  Filter
} from 'lucide-react';

// Import existing components to maintain consistency
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

// BI Components
import MetricsOverview from './components/MetricsOverview';
import AnalyticsGrid from './components/AnalyticsGrid';
import ReportsSection from './components/ReportsSection';
import BIService from '../../services/BusinessIntelligenceService';

const BIDashboard = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d, 1y

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, currentTenant]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await BIService.getDashboardAnalytics({
        tenantId: currentTenant?.id,
        dateRange
      });
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading BI dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  return (
    <div className="bi-dashboard min-h-screen bg-gray-50 p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 داشبورد هوش تجاری
            </h1>
            <p className="text-gray-600">
              آنالیز پیشرفته و گزارشگیری سیستم صرافی
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-2 space-x-reverse bg-white rounded-lg border shadow-sm">
              <Calendar className="w-5 h-5 text-gray-500 mr-2" />
              <select 
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="p-2 border-none outline-none bg-transparent"
              >
                <option value="7d">۷ روز گذشته</option>
                <option value="30d">۳۰ روز گذشته</option>
                <option value="90d">۹۰ روز گذشته</option>
                <option value="1y">یک سال گذشته</option>
              </select>
            </div>

            {/* Export Button */}
            <button className="flex items-center space-x-2 space-x-reverse bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>خروجی گزارش</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">درآمد امروز</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? '...' : '۱۲۵,۰۰۰'} <span className="text-sm">تومان</span>
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">تراکنش‌های امروز</p>
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? '...' : '۸۷'}
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">کاربران فعال</p>
                <p className="text-2xl font-bold text-purple-600">
                  {loading ? '...' : '۲۳۴'}
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">رشد هفتگی</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? '...' : '+۱۵.۳%'}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-8">
        {/* Key Metrics Overview */}
        <MetricsOverview 
          data={dashboardData?.metrics} 
          loading={loading}
          dateRange={dateRange}
        />

        {/* Analytics Grid */}
        <AnalyticsGrid 
          data={dashboardData?.analytics} 
          loading={loading}
          dateRange={dateRange}
        />

        {/* Reports Section */}
        <ReportsSection 
          data={dashboardData?.reports} 
          loading={loading}
          onGenerateReport={(config) => {
            // Handle custom report generation
            console.log('Generating report with config:', config);
          }}
        />
      </div>
    </div>
  );
};

export default BIDashboard;