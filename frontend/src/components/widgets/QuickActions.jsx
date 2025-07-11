import React from 'react';

const QuickActions = () => {
  const actions = [
    {
      id: 1,
      title: 'ثبت مشتری جدید',
      description: 'افزودن مشتری جدید به سیستم',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.239" />
        </svg>
      ),
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => console.log('Add customer')
    },
    {
      id: 2,
      title: 'معامله ارزی',
      description: 'خرید یا فروش ارز',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      color: 'bg-green-500 hover:bg-green-600',
      action: () => console.log('Currency exchange')
    },
    {
      id: 3,
      title: 'ارسال حواله',
      description: 'حواله بین‌المللی',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => console.log('Send remittance')
    },
    {
      id: 4,
      title: 'گزارش روزانه',
      description: 'مشاهده گزارش عملکرد',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-yellow-500 hover:bg-yellow-600',
      action: () => console.log('Daily report')
    },
    {
      id: 5,
      title: 'مدیریت کارمندان',
      description: 'افزودن یا ویرایش کارمندان',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'bg-indigo-500 hover:bg-indigo-600',
      action: () => console.log('Manage staff')
    },
    {
      id: 6,
      title: 'تنظیمات امنیتی',
      description: 'مدیریت سطح دسترسی',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: 'bg-red-500 hover:bg-red-600',
      action: () => console.log('Security settings')
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">اقدامات سریع</h2>
        <p className="text-sm text-gray-500">دسترسی سریع به عملیات مهم</p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              className={`${action.color} text-white p-4 rounded-lg transition-all duration-200 hover:shadow-md group`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 ml-3">
                  {action.icon}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{action.title}</div>
                  <div className="text-xs opacity-90">{action.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;