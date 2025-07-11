// Advanced Report Builder with Drag and Drop functionality
import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Settings, 
  Download,
  Calendar,
  BarChart3,
  Table as TableIcon,
  Filter,
  Columns,
  Save,
  Eye
} from 'lucide-react';

const ReportBuilder = ({ isOpen, onClose, onSave }) => {
  const [reportConfig, setReportConfig] = useState({
    name: '',
    description: '',
    dataSources: [],
    fields: [],
    visualizations: [],
    filters: [],
    dateRange: { start: '', end: '' },
    groupBy: [],
    sortBy: []
  });

  const [activeStep, setActiveStep] = useState(1);

  // Available data sources
  const dataSources = [
    { id: 'transactions', name: 'تراکنش‌ها', icon: '💳', description: 'تمام تراکنش‌های مالی' },
    { id: 'customers', name: 'مشتریان', icon: '👥', description: 'اطلاعات مشتریان' },
    { id: 'revenue', name: 'درآمد', icon: '💰', description: 'گزارش‌های درآمدی' },
    { id: 'performance', name: 'عملکرد', icon: '📊', description: 'متریک‌های عملکرد سیستم' },
    { id: 'exchange_rates', name: 'نرخ ارز', icon: '💱', description: 'نرخ‌های صرافی' }
  ];

  // Available fields for each data source
  const availableFields = {
    transactions: [
      { id: 'transaction_id', name: 'شناسه تراکنش', type: 'string' },
      { id: 'amount', name: 'مبلغ', type: 'number' },
      { id: 'currency', name: 'ارز', type: 'string' },
      { id: 'date', name: 'تاریخ', type: 'date' },
      { id: 'status', name: 'وضعیت', type: 'string' },
      { id: 'customer_id', name: 'شناسه مشتری', type: 'string' }
    ],
    customers: [
      { id: 'customer_id', name: 'شناسه مشتری', type: 'string' },
      { id: 'name', name: 'نام', type: 'string' },
      { id: 'email', name: 'ایمیل', type: 'string' },
      { id: 'registration_date', name: 'تاریخ ثبت نام', type: 'date' },
      { id: 'total_transactions', name: 'تعداد تراکنش', type: 'number' }
    ],
    revenue: [
      { id: 'period', name: 'دوره', type: 'date' },
      { id: 'total_revenue', name: 'کل درآمد', type: 'number' },
      { id: 'commission', name: 'کمیسیون', type: 'number' },
      { id: 'fees', name: 'کارمزد', type: 'number' }
    ]
  };

  // Visualization types
  const visualizations = [
    { id: 'table', name: 'جدول', icon: TableIcon, description: 'نمایش داده‌ها در قالب جدول' },
    { id: 'line_chart', name: 'نمودار خطی', icon: BarChart3, description: 'نمایش روند تغییرات' },
    { id: 'bar_chart', name: 'نمودار میله‌ای', icon: BarChart3, description: 'مقایسه مقادیر' },
    { id: 'pie_chart', name: 'نمودار دایره‌ای', icon: BarChart3, description: 'نمایش نسبت‌ها' }
  ];

  const steps = [
    { id: 1, title: 'انتخاب منبع داده', description: 'منابع داده مورد نظر را انتخاب کنید' },
    { id: 2, title: 'انتخاب فیلدها', description: 'فیلدهای مورد نیاز را انتخاب کنید' },
    { id: 3, title: 'نوع نمایش', description: 'نحوه نمایش داده‌ها را تعیین کنید' },
    { id: 4, title: 'فیلترها', description: 'شرایط فیلتر را تنظیم کنید' },
    { id: 5, title: 'تنظیمات نهایی', description: 'تنظیمات کلی گزارش' }
  ];

  const handleDataSourceToggle = (sourceId) => {
    setReportConfig(prev => ({
      ...prev,
      dataSources: prev.dataSources.includes(sourceId)
        ? prev.dataSources.filter(id => id !== sourceId)
        : [...prev.dataSources, sourceId]
    }));
  };

  const handleFieldToggle = (field) => {
    setReportConfig(prev => ({
      ...prev,
      fields: prev.fields.find(f => f.id === field.id)
        ? prev.fields.filter(f => f.id !== field.id)
        : [...prev.fields, field]
    }));
  };

  const handleVisualizationToggle = (vizId) => {
    setReportConfig(prev => ({
      ...prev,
      visualizations: prev.visualizations.includes(vizId)
        ? prev.visualizations.filter(id => id !== vizId)
        : [...prev.visualizations, vizId]
    }));
  };

  const addFilter = () => {
    setReportConfig(prev => ({
      ...prev,
      filters: [...prev.filters, { field: '', operator: 'equals', value: '' }]
    }));
  };

  const updateFilter = (index, key, value) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, [key]: value } : filter
      )
    }));
  };

  const removeFilter = (index) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(reportConfig);
    }
    console.log('Saving report config:', reportConfig);
  };

  const getSelectedFields = () => {
    return reportConfig.dataSources.flatMap(sourceId => 
      availableFields[sourceId] || []
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col" dir="rtl">
        {/* Header */}
        <div className="border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">سازنده گزارش پیشرفته</h2>
            <p className="text-gray-600 mt-1">ایجاد گزارش‌های سفارشی با قابلیت drag & drop</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    activeStep >= step.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.id}
                </div>
                <div className="mr-3">
                  <p className={`text-sm font-medium ${
                    activeStep >= step.id ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-px mx-4 ${
                    activeStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Step Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeStep === 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">انتخاب منابع داده</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dataSources.map(source => (
                    <div 
                      key={source.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        reportConfig.dataSources.includes(source.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDataSourceToggle(source.id)}
                    >
                      <div className="flex items-center mb-2">
                        <span className="text-2xl ml-3">{source.icon}</span>
                        <h4 className="font-medium">{source.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{source.description}</p>
                      {reportConfig.dataSources.includes(source.id) && (
                        <div className="mt-2 text-blue-600 text-sm font-medium">✓ انتخاب شده</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">انتخاب فیلدها</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reportConfig.dataSources.map(sourceId => (
                    <div key={sourceId} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">
                        {dataSources.find(s => s.id === sourceId)?.name}
                      </h4>
                      <div className="space-y-2">
                        {(availableFields[sourceId] || []).map(field => (
                          <label key={field.id} className="flex items-center">
                            <input 
                              type="checkbox"
                              checked={reportConfig.fields.some(f => f.id === field.id)}
                              onChange={() => handleFieldToggle(field)}
                              className="ml-2 rounded border-gray-300"
                            />
                            <span className="text-sm">{field.name}</span>
                            <span className="text-xs text-gray-500 mr-2">({field.type})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">انتخاب نوع نمایش</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visualizations.map(viz => {
                    const Icon = viz.icon;
                    return (
                      <div 
                        key={viz.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          reportConfig.visualizations.includes(viz.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleVisualizationToggle(viz.id)}
                      >
                        <div className="flex items-center mb-2">
                          <Icon className="w-6 h-6 ml-3 text-gray-600" />
                          <h4 className="font-medium">{viz.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{viz.description}</p>
                        {reportConfig.visualizations.includes(viz.id) && (
                          <div className="mt-2 text-blue-600 text-sm font-medium">✓ انتخاب شده</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">تنظیم فیلترها</h3>
                
                {/* Date Range */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-3">بازه زمانی</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">از تاریخ</label>
                      <input 
                        type="date"
                        value={reportConfig.dateRange.start}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                        className="w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">تا تاریخ</label>
                      <input 
                        type="date"
                        value={reportConfig.dateRange.end}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                        className="w-full rounded-md border-gray-300 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Filters */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">فیلترهای سفارشی</h4>
                    <button 
                      onClick={addFilter}
                      className="flex items-center space-x-2 space-x-reverse bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>افزودن فیلتر</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {reportConfig.filters.map((filter, index) => (
                      <div key={index} className="flex items-center space-x-3 space-x-reverse bg-white border rounded-lg p-3">
                        <select 
                          value={filter.field}
                          onChange={(e) => updateFilter(index, 'field', e.target.value)}
                          className="flex-1 rounded-md border-gray-300 shadow-sm"
                        >
                          <option value="">انتخاب فیلد</option>
                          {getSelectedFields().map(field => (
                            <option key={field.id} value={field.id}>{field.name}</option>
                          ))}
                        </select>
                        
                        <select 
                          value={filter.operator}
                          onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                          className="w-32 rounded-md border-gray-300 shadow-sm"
                        >
                          <option value="equals">برابر</option>
                          <option value="not_equals">نا برابر</option>
                          <option value="greater">بزرگتر از</option>
                          <option value="less">کوچکتر از</option>
                          <option value="contains">شامل</option>
                        </select>
                        
                        <input 
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(index, 'value', e.target.value)}
                          placeholder="مقدار"
                          className="flex-1 rounded-md border-gray-300 shadow-sm"
                        />
                        
                        <button 
                          onClick={() => removeFilter(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeStep === 5 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">تنظیمات نهایی</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نام گزارش</label>
                    <input 
                      type="text"
                      value={reportConfig.name}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="نام گزارش را وارد کنید"
                      className="w-full rounded-md border-gray-300 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">توضیحات</label>
                    <textarea 
                      value={reportConfig.description}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="توضیحات گزارش را وارد کنید"
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">خلاصه گزارش</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>منابع داده:</strong> {reportConfig.dataSources.length} منبع</div>
                      <div><strong>فیلدها:</strong> {reportConfig.fields.length} فیلد</div>
                      <div><strong>نوع نمایش:</strong> {reportConfig.visualizations.length} نوع</div>
                      <div><strong>فیلترها:</strong> {reportConfig.filters.length} فیلتر</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="w-80 border-r bg-gray-50 p-4">
            <h4 className="font-medium mb-3 flex items-center">
              <Eye className="w-4 h-4 ml-2" />
              پیش‌نمایش گزارش
            </h4>
            
            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div className="text-sm">
                <strong>نام:</strong> {reportConfig.name || 'گزارش بدون نام'}
              </div>
              
              <div className="text-sm">
                <strong>منابع داده:</strong>
                <div className="mt-1">
                  {reportConfig.dataSources.map(sourceId => (
                    <span key={sourceId} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full ml-1 mb-1">
                      {dataSources.find(s => s.id === sourceId)?.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-sm">
                <strong>فیلدهای انتخابی:</strong>
                <div className="mt-1 max-h-20 overflow-y-auto">
                  {reportConfig.fields.map(field => (
                    <div key={field.id} className="text-xs text-gray-600 mb-1">
                      • {field.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm">
                <strong>نوع نمایش:</strong>
                <div className="mt-1">
                  {reportConfig.visualizations.map(vizId => (
                    <span key={vizId} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-1 mb-1">
                      {visualizations.find(v => v.id === vizId)?.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          <div className="flex space-x-3 space-x-reverse">
            {activeStep > 1 && (
              <button 
                onClick={() => setActiveStep(prev => prev - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                مرحله قبل
              </button>
            )}
            {activeStep < steps.length ? (
              <button 
                onClick={() => setActiveStep(prev => prev + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                مرحله بعد
              </button>
            ) : (
              <button 
                onClick={handleSave}
                className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                <span>ذخیره گزارش</span>
              </button>
            )}
          </div>

          <div className="flex space-x-2 space-x-reverse">
            <button className="flex items-center space-x-2 space-x-reverse px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Eye className="w-4 h-4" />
              <span>پیش‌نمایش</span>
            </button>
            <button className="flex items-center space-x-2 space-x-reverse px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              <span>خروجی</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;