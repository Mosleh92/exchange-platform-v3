import React from 'react';

const CustomerStats = () => {
  // Mock customer statistics data
  const stats = {
    totalCustomers: 1247,
    newThisMonth: 89,
    activeToday: 156,
    vipCustomers: 45,
    customerGrowth: 12.5,
    topSegments: [
      { name: 'مشتریان VIP', count: 45, percentage: 85, color: 'bg-purple-500' },
      { name: 'مشتریان فعال', count: 456, percentage: 70, color: 'bg-green-500' },
      { name: 'مشتریان جدید', count: 156, percentage: 45, color: 'bg-blue-500' },
      { name: 'مشتریان غیرفعال', count: 234, percentage: 25, color: 'bg-gray-400' },
    ],
    customersByRegion: [
      { region: 'تهران', count: 567, percentage: 45.5 },
      { region: 'اصفهان', count: 234, percentage: 18.8 },
      { region: 'مشهد', count: 189, percentage: 15.2 },
      { region: 'شیراز', count: 123, percentage: 9.9 },
      { region: 'سایر', count: 134, percentage: 10.7 },
    ]
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">آمار مشتریان</h2>
        <p className="text-sm text-gray-500">تحلیل و آمار پایگاه مشتریان</p>
      </div>
      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{stats.totalCustomers.toLocaleString('fa-IR')}</div>
            <div className="text-sm text-blue-700">کل مشتریان</div>
            <div className="text-xs text-blue-600 mt-1">
              +{stats.customerGrowth}% رشد ماهانه
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-900">{stats.newThisMonth}</div>
            <div className="text-sm text-green-700">مشتری جدید این ماه</div>
            <div className="text-xs text-green-600 mt-1">
              {stats.activeToday} نفر فعال امروز
            </div>
          </div>
        </div>

        {/* Customer Segments */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">دسته‌بندی مشتریان</h3>
          <div className="space-y-3">
            {stats.topSegments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${segment.color} ml-2`}></div>
                  <span className="text-sm text-gray-700">{segment.name}</span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{segment.count}</div>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className={`h-1.5 rounded-full ${segment.color}`}
                      style={{ width: `${segment.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Distribution */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">توزیع جغرافیایی</h3>
          <div className="space-y-2">
            {stats.customersByRegion.map((region, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{region.region}</span>
                <div className="text-left">
                  <span className="font-medium text-gray-900">{region.count}</span>
                  <span className="text-gray-500 mr-2">({region.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              مشاهده همه
            </button>
            <button className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              + مشتری جدید
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerStats;