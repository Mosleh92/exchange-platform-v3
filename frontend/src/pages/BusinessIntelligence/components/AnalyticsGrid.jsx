// Analytics Grid Component - Advanced Analytics Visualizations
import React, { useState } from 'react';
import { 
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  Target,
  Users,
  Globe,
  Smartphone,
  Desktop
} from 'lucide-react';

const AnalyticsGrid = ({ data, loading, dateRange }) => {
  const [activeTab, setActiveTab] = useState('performance');

  // Mock analytics data
  const systemPerformanceData = [
    { time: '00:00', responseTime: 120, throughput: 850, errors: 2 },
    { time: '04:00', responseTime: 95, throughput: 620, errors: 1 },
    { time: '08:00', responseTime: 180, throughput: 1200, errors: 5 },
    { time: '12:00', responseTime: 145, throughput: 1450, errors: 3 },
    { time: '16:00', responseTime: 165, throughput: 1380, errors: 4 },
    { time: '20:00', responseTime: 135, throughput: 980, errors: 2 }
  ];

  const userActivityHeatmap = [
    { hour: '00-02', mobile: 120, desktop: 45, tablet: 15 },
    { hour: '02-04', mobile: 85, desktop: 28, tablet: 8 },
    { hour: '04-06', mobile: 95, desktop: 35, tablet: 12 },
    { hour: '06-08', mobile: 180, desktop: 85, tablet: 25 },
    { hour: '08-10', mobile: 245, desktop: 150, tablet: 45 },
    { hour: '10-12', mobile: 320, desktop: 220, tablet: 65 },
    { hour: '12-14', mobile: 280, desktop: 195, tablet: 55 },
    { hour: '14-16', mobile: 350, desktop: 280, tablet: 75 },
    { hour: '16-18', mobile: 380, desktop: 320, tablet: 85 },
    { hour: '18-20', mobile: 290, desktop: 245, tablet: 65 },
    { hour: '20-22', mobile: 220, desktop: 180, tablet: 45 },
    { hour: '22-00', mobile: 165, desktop: 120, tablet: 30 }
  ];

  const riskAssessmentData = [
    { metric: 'امنیت تراکنش', value: 95, fullMark: 100 },
    { metric: 'کیفیت داده', value: 88, fullMark: 100 },
    { metric: 'عملکرد سیستم', value: 92, fullMark: 100 },
    { metric: 'رضایت مشتری', value: 86, fullMark: 100 },
    { metric: 'پایداری مالی', value: 91, fullMark: 100 },
    { metric: 'انطباق قوانین', value: 97, fullMark: 100 }
  ];

  const conversionFunnelData = [
    { stage: 'بازدید سایت', value: 10000, fill: '#8B5CF6' },
    { stage: 'ثبت نام', value: 4500, fill: '#06B6D4' },
    { stage: 'تأیید هویت', value: 3200, fill: '#10B981' },
    { stage: 'اولین واریز', value: 2100, fill: '#F59E0B' },
    { stage: 'اولین معامله', value: 1650, fill: '#EF4444' }
  ];

  const geographicData = [
    { city: 'تهران', transactions: 8500, revenue: 125000000 },
    { city: 'اصفهان', transactions: 3200, revenue: 48000000 },
    { city: 'مشهد', transactions: 2800, revenue: 42000000 },
    { city: 'شیراز', transactions: 2100, revenue: 31500000 },
    { city: 'تبریز', transactions: 1900, revenue: 28500000 },
    { city: 'کرج', transactions: 1650, revenue: 24750000 }
  ];

  const tabs = [
    { id: 'performance', label: 'عملکرد سیستم', icon: Activity },
    { id: 'users', label: 'فعالیت کاربران', icon: Users },
    { id: 'risk', label: 'ارزیابی ریسک', icon: AlertTriangle },
    { id: 'conversion', label: 'قیف تبدیل', icon: Target },
    { id: 'geographic', label: 'تحلیل جغرافیایی', icon: Globe }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fa-IR').format(value);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex space-x-4 space-x-reverse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded w-24"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8 space-x-reverse px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 space-x-reverse py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">نظارت بر عملکرد سیستم</h3>
            
            {/* System Performance Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Activity className="w-6 h-6 text-green-600 ml-2" />
                  <div>
                    <p className="text-gray-600 text-sm">میانگین زمان پاسخ</p>
                    <p className="text-2xl font-bold text-green-600">۱۳۵ms</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Clock className="w-6 h-6 text-blue-600 ml-2" />
                  <div>
                    <p className="text-gray-600 text-sm">میزان توان عملیاتی</p>
                    <p className="text-2xl font-bold text-blue-600">۱,۱۲۰/ثانیه</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 ml-2" />
                  <div>
                    <p className="text-gray-600 text-sm">نرخ خطا</p>
                    <p className="text-2xl font-bold text-red-600">۰.۲۳%</p>
                  </div>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={systemPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="left" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'responseTime') return [`${value}ms`, 'زمان پاسخ'];
                    if (name === 'throughput') return [`${value}/ثانیه`, 'توان عملیاتی'];
                    if (name === 'errors') return [`${value}`, 'تعداد خطا'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="throughput" fill="#06B6D4" name="توان عملیاتی" />
                <Line yAxisId="right" type="monotone" dataKey="responseTime" stroke="#10B981" strokeWidth={2} name="زمان پاسخ" />
                <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={2} name="خطاها" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">نقشه حرارتی فعالیت کاربران</h3>
            
            {/* Device Usage Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <Smartphone className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">موبایل</p>
                <p className="text-xl font-bold text-purple-600">۶۸%</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <Desktop className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">دسکتاپ</p>
                <p className="text-xl font-bold text-blue-600">۲۸%</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">تبلت</p>
                <p className="text-xl font-bold text-green-600">۴%</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={userActivityHeatmap}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="mobile" stackId="a" fill="#8B5CF6" name="موبایل" />
                <Bar dataKey="desktop" stackId="a" fill="#06B6D4" name="دسکتاپ" />
                <Bar dataKey="tablet" stackId="a" fill="#10B981" name="تبلت" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">ارزیابی ریسک سیستم</h3>
            
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={riskAssessmentData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="امتیاز ریسک"
                  dataKey="value"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>

            {/* Risk Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {riskAssessmentData.map((item, index) => {
                const riskLevel = item.value >= 90 ? 'low' : item.value >= 75 ? 'medium' : 'high';
                const colorClass = riskLevel === 'low' ? 'text-green-600 bg-green-50' : 
                                 riskLevel === 'medium' ? 'text-yellow-600 bg-yellow-50' : 
                                 'text-red-600 bg-red-50';
                
                return (
                  <div key={index} className={`p-4 rounded-lg ${colorClass}`}>
                    <p className="text-sm font-medium">{item.metric}</p>
                    <p className="text-2xl font-bold">{item.value}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'conversion' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">قیف تبدیل مشتریان</h3>
            
            {/* Conversion Rates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-gray-600 text-sm">نرخ ثبت نام</p>
                <p className="text-2xl font-bold text-blue-600">۴۵%</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-gray-600 text-sm">تأیید هویت</p>
                <p className="text-2xl font-bold text-green-600">۷۱%</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <p className="text-gray-600 text-sm">اولین واریز</p>
                <p className="text-2xl font-bold text-yellow-600">۶۶%</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <p className="text-gray-600 text-sm">اولین معامله</p>
                <p className="text-2xl font-bold text-purple-600">۷۹%</p>
              </div>
            </div>

            {/* Funnel Chart would be implemented here with custom component */}
            <div className="bg-gray-50 p-8 rounded-lg">
              <div className="space-y-4">
                {conversionFunnelData.map((stage, index) => {
                  const percentage = index === 0 ? 100 : Math.round((stage.value / conversionFunnelData[0].value) * 100);
                  const width = `${percentage}%`;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-gray-600">{formatCurrency(stage.value)} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-8">
                        <div 
                          className="h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ width, backgroundColor: stage.fill }}
                        >
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'geographic' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">تحلیل جغرافیایی</h3>
            
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart data={geographicData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="transactions" 
                  name="تعداد تراکنش"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis 
                  dataKey="revenue" 
                  name="درآمد"
                  tickFormatter={(value) => `${formatCurrency(value / 1000000)}M`}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'revenue') return [`${formatCurrency(value)} تومان`, 'درآمد'];
                    return [`${formatCurrency(value)}`, 'تعداد تراکنش'];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return `شهر: ${payload[0].payload.city}`;
                    }
                    return label;
                  }}
                />
                <Scatter dataKey="revenue" fill="#8B5CF6" />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Top Cities Table */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-4">برترین شهرها</h4>
              <div className="space-y-2">
                {geographicData.map((city, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="font-medium">{city.city}</span>
                    <div className="text-left">
                      <div className="text-sm text-gray-600">{formatCurrency(city.transactions)} تراکنش</div>
                      <div className="text-sm font-medium">{formatCurrency(city.revenue)} تومان</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsGrid;