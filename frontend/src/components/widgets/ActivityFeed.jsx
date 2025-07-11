import React from 'react';

const ActivityFeed = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'transaction':
        return (
          <div className="bg-green-100 p-2 rounded-full">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        );
      case 'staff':
        return (
          <div className="bg-blue-100 p-2 rounded-full">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.239" />
            </svg>
          </div>
        );
      case 'remittance':
        return (
          <div className="bg-purple-100 p-2 rounded-full">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        );
      case 'customer':
        return (
          <div className="bg-yellow-100 p-2 rounded-full">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'security':
        return (
          <div className="bg-red-100 p-2 rounded-full">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-gray-100 p-2 rounded-full">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  // Default activities if none provided
  const defaultActivities = [
    { id: 1, message: 'ثبت تراکنش جدید در شعبه مرکزی', time: '2 دقیقه پیش', type: 'transaction' },
    { id: 2, message: 'افزودن کارمند جدید در شعبه غرب', time: '15 دقیقه پیش', type: 'staff' },
    { id: 3, message: 'تایید حواله بین‌المللی', time: '30 دقیقه پیش', type: 'remittance' },
    { id: 4, message: 'ثبت مشتری جدید', time: '45 دقیقه پیش', type: 'customer' },
    { id: 5, message: 'بروزرسانی تنظیمات امنیتی', time: '1 ساعت پیش', type: 'security' },
    { id: 6, message: 'معامله ارزی EUR/IRR', time: '1.5 ساعت پیش', type: 'transaction' },
    { id: 7, message: 'ویرایش اطلاعات مشتری', time: '2 ساعت پیش', type: 'customer' },
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">فید فعالیت‌ها</h2>
        <p className="text-sm text-gray-500">آخرین فعالیت‌های سیستم</p>
      </div>
      <div className="p-4">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {displayActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 space-x-reverse">
              <div className="flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">{activity.message}</div>
                <div className="text-xs text-gray-500 mt-1">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* View All Activities Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
            مشاهده همه فعالیت‌ها
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityFeed;