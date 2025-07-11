import React from 'react';

const AlertsWidget = ({ alerts = [] }) => {
  // Default alerts if none provided
  const defaultAlerts = [
    { 
      id: 1, 
      message: 'موجودی ارز دلار در شعبه شرق پایین است', 
      type: 'warning', 
      priority: 'high',
      time: '5 دقیقه پیش' 
    },
    { 
      id: 2, 
      message: 'تراکنش مشکوک در شعبه شمال', 
      type: 'danger', 
      priority: 'urgent',
      time: '15 دقیقه پیش' 
    },
    { 
      id: 3, 
      message: 'حواله بالای حد مجاز نیاز به تایید', 
      type: 'info', 
      priority: 'medium',
      time: '30 دقیقه پیش' 
    },
    { 
      id: 4, 
      message: 'سیستم بک آپ با موفقیت انجام شد', 
      type: 'success', 
      priority: 'low',
      time: '1 ساعت پیش' 
    },
  ];

  const displayAlerts = alerts.length > 0 ? alerts : defaultAlerts;

  const getAlertStyle = (type, priority) => {
    const baseClasses = "p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md";
    
    switch (type) {
      case 'danger':
        return `${baseClasses} bg-red-50 border-red-500 text-red-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-500 text-yellow-800`;
      case 'info':
        return `${baseClasses} bg-blue-50 border-blue-500 text-blue-800`;
      case 'success':
        return `${baseClasses} bg-green-50 border-green-500 text-green-800`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-500 text-gray-800`;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'danger':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0115 0z" />
          </svg>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full ml-1 animate-pulse"></span>
            فوری
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            بالا
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            متوسط
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            پایین
          </span>
        );
      default:
        return null;
    }
  };

  const urgentCount = displayAlerts.filter(alert => alert.priority === 'urgent').length;
  const highCount = displayAlerts.filter(alert => alert.priority === 'high').length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">هشدارها و اعلان‌ها</h2>
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                {urgentCount} فوری
              </span>
            )}
            {highCount > 0 && (
              <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                {highCount} مهم
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4">
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">هیچ هشداری وجود ندارد</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {displayAlerts.map((alert) => (
              <div key={alert.id} className={getAlertStyle(alert.type, alert.priority)}>
                <div className="flex items-start">
                  <div className="flex-shrink-0 ml-3">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      {getPriorityBadge(alert.priority)}
                    </div>
                    <p className="text-xs opacity-75">{alert.time}</p>
                  </div>
                  <div className="flex-shrink-0 mr-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between">
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              مشاهده همه
            </button>
            <button className="text-sm text-gray-600 hover:text-gray-800 font-medium">
              علامت‌گذاری همه به عنوان خوانده شده
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsWidget;