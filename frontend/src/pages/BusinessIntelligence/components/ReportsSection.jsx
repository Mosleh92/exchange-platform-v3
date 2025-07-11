// Reports Section Component - Custom Report Builder and Export
import React, { useState } from 'react';
import { 
  Download, 
  Calendar, 
  Filter, 
  Settings, 
  FileText, 
  Mail,
  Clock,
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import ReportBuilder from './ReportBuilder';

const ReportsSection = ({ data, loading, onGenerateReport }) => {
  const [activeSection, setActiveSection] = useState('builder');
  const [reportConfig, setReportConfig] = useState({
    name: '',
    type: 'revenue',
    dateRange: {
      start: '',
      end: ''
    },
    filters: [],
    format: 'pdf',
    scheduled: false,
    frequency: 'daily'
  });
  const [showReportBuilder, setShowReportBuilder] = useState(false);

  // Mock saved reports
  const savedReports = [
    {
      id: 1,
      name: 'گزارش درآمد ماهانه',
      type: 'revenue',
      lastGenerated: '۱۴۰۳/۰۹/۰۷',
      status: 'completed',
      format: 'pdf'
    },
    {
      id: 2,
      name: 'تحلیل رفتار مشتریان',
      type: 'customer',
      lastGenerated: '۱۴۰۳/۰۹/۰۶',
      status: 'scheduled',
      format: 'excel'
    },
    {
      id: 3,
      name: 'گزارش عملکرد سیستم',
      type: 'performance',
      lastGenerated: '۱۴۰۳/۰۹/۰۵',
      status: 'completed',
      format: 'csv'
    }
  ];

  const reportTypes = [
    { value: 'revenue', label: 'گزارش درآمد', description: 'تحلیل درآمد و سود' },
    { value: 'customer', label: 'تحلیل مشتریان', description: 'رفتار و عملکرد مشتریان' },
    { value: 'transaction', label: 'گزارش تراکنش‌ها', description: 'جزئیات تمام تراکنش‌ها' },
    { value: 'performance', label: 'عملکرد سیستم', description: 'نظارت بر سیستم و کارایی' },
    { value: 'risk', label: 'ارزیابی ریسک', description: 'تحلیل ریسک‌ها و امنیت' },
    { value: 'compliance', label: 'انطباق قوانین', description: 'گزارش‌های قانونی و انطباق' }
  ];

  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: FileText },
    { value: 'excel', label: 'Excel', icon: FileText },
    { value: 'csv', label: 'CSV', icon: FileText }
  ];

  const handleConfigChange = (field, value) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateReport = () => {
    if (onGenerateReport) {
      onGenerateReport(reportConfig);
    }
    console.log('Generating report with config:', reportConfig);
  };

  const handleExportReport = (reportId, format) => {
    console.log(`Exporting report ${reportId} as ${format}`);
    // Implement export logic here
  };

  const handleDeleteReport = (reportId) => {
    console.log(`Deleting report ${reportId}`);
    // Implement delete logic here
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">مرکز گزارش‌گیری</h3>
            <p className="text-gray-600 mt-1">ایجاد، مدیریت و خروجی گزارش‌های سفارشی</p>
          </div>
          <button
            onClick={() => setShowReportBuilder(true)}
            className="flex items-center space-x-2 space-x-reverse bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>گزارش جدید</span>
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex space-x-6 space-x-reverse mt-4">
          <button
            onClick={() => setActiveSection('builder')}
            className={`pb-2 border-b-2 font-medium text-sm ${
              activeSection === 'builder' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            سازنده گزارش
          </button>
          <button
            onClick={() => setActiveSection('saved')}
            className={`pb-2 border-b-2 font-medium text-sm ${
              activeSection === 'saved' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            گزارش‌های ذخیره شده
          </button>
          <button
            onClick={() => setActiveSection('scheduled')}
            className={`pb-2 border-b-2 font-medium text-sm ${
              activeSection === 'scheduled' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            گزارش‌های زمان‌بندی شده
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeSection === 'builder' && (
          <div className="space-y-6">
            {/* Quick Report Templates */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">قالب‌های آماده گزارش</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((type) => (
                  <div 
                    key={type.value}
                    className="border rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleConfigChange('type', type.value)}
                  >
                    <h5 className="font-medium text-gray-900">{type.label}</h5>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">آماده ساخت</span>
                      <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Report Builder Preview */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h4 className="text-lg font-medium text-gray-900 mb-4">سازنده گزارش سفارشی</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data Sources */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">منابع داده</label>
                  <div className="space-y-2">
                    {['تراکنش‌ها', 'کاربران', 'درآمد', 'عملکرد سیستم'].map((source) => (
                      <label key={source} className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 ml-2" />
                        <span className="text-sm text-gray-700">{source}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Visualization Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع نمایش</label>
                  <select className="w-full rounded-md border-gray-300 shadow-sm">
                    <option value="table">جدول</option>
                    <option value="chart">نمودار</option>
                    <option value="combined">ترکیبی</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6">
                <span className="text-sm text-gray-600">سازنده پیشرفته در دسترس است</span>
                <button
                  onClick={() => setShowReportBuilder(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  باز کردن سازنده پیشرفته
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'saved' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">گزارش‌های ذخیره شده</h4>
              <div className="flex items-center space-x-2 space-x-reverse">
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Filter className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {savedReports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{report.name}</h5>
                      <div className="flex items-center space-x-4 space-x-reverse mt-1">
                        <span className="text-sm text-gray-500">
                          آخرین تولید: {report.lastGenerated}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          report.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status === 'completed' ? 'تکمیل شده' : 'زمان‌بندی شده'}
                        </span>
                        <span className="text-xs text-gray-400 uppercase">
                          {report.format}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleExportReport(report.id, 'view')}
                        className="p-2 text-gray-500 hover:text-blue-600"
                        title="مشاهده"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportReport(report.id, report.format)}
                        className="p-2 text-gray-500 hover:text-green-600"
                        title="دانلود"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-500 hover:text-blue-600"
                        title="ویرایش"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 text-gray-500 hover:text-red-600"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'scheduled' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">گزارش‌های زمان‌بندی شده</h4>
              <button className="flex items-center space-x-2 space-x-reverse bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                <Clock className="w-4 h-4" />
                <span>زمان‌بندی جدید</span>
              </button>
            </div>

            {/* Scheduled Reports */}
            <div className="space-y-3">
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">گزارش درآمد روزانه</h5>
                    <div className="flex items-center space-x-3 space-x-reverse mt-1">
                      <span className="text-sm text-gray-600">هر روز ساعت ۰۸:۰۰</span>
                      <span className="text-sm text-gray-600">ارسال به: admin@exchange.com</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">فعال</span>
                    <button className="p-2 text-gray-500 hover:text-gray-700">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">تحلیل عملکرد هفتگی</h5>
                    <div className="flex items-center space-x-3 space-x-reverse mt-1">
                      <span className="text-sm text-gray-600">هر دوشنبه ساعت ۰۹:۰۰</span>
                      <span className="text-sm text-gray-600">ارسال به: manager@exchange.com</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">غیرفعال</span>
                    <button className="p-2 text-gray-500 hover:text-gray-700">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Delivery Settings */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h4 className="text-lg font-medium text-gray-900 mb-4">تنظیمات ارسال ایمیل</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ایمیل‌های دریافت‌کننده</label>
                  <input 
                    type="email" 
                    placeholder="admin@exchange.com" 
                    className="w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">موضوع ایمیل</label>
                  <input 
                    type="text" 
                    placeholder="گزارش روزانه سیستم صرافی" 
                    className="w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Export Actions */}
      <div className="border-t p-6 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">خروجی سریع</h4>
            <p className="text-sm text-gray-600">تولید فوری گزارش‌های استاندارد</p>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            {exportFormats.map((format) => {
              const Icon = format.icon;
              return (
                <button
                  key={format.value}
                  onClick={() => handleExportReport('quick', format.value)}
                  className="flex items-center space-x-2 space-x-reverse bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span>{format.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Report Builder Modal */}
      <ReportBuilder 
        isOpen={showReportBuilder}
        onClose={() => setShowReportBuilder(false)}
        onSave={(config) => {
          console.log('Report saved:', config);
          setShowReportBuilder(false);
          if (onGenerateReport) {
            onGenerateReport(config);
          }
        }}
      />
    </div>
  );
};

export default ReportsSection;