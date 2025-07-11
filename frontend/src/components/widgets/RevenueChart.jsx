import React from 'react';

const RevenueChart = ({ dateRange }) => {
  // Mock revenue data generation
  const generateRevenueData = () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data = [];
    for (let i = 0; i < days; i++) {
      const baseRevenue = 5000000; // 5 million IRR base
      const variance = Math.random() * 3000000; // Up to 3 million variance
      data.push({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('fa-IR'),
        revenue: baseRevenue + variance,
        profit: (baseRevenue + variance) * 0.15, // 15% profit margin
        commission: (baseRevenue + variance) * 0.05, // 5% commission
      });
    }
    return data;
  };

  const revenueData = generateRevenueData();
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = revenueData.reduce((sum, item) => sum + item.profit, 0);
  const avgDaily = totalRevenue / revenueData.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">نمودار درآمد و سود</h2>
        <p className="text-sm text-gray-500">تحلیل عملکرد مالی در بازه زمانی انتخابی</p>
      </div>
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
            <div className="text-lg font-bold text-green-900">
              {Math.round(totalRevenue / 1000000).toLocaleString('fa-IR')}M ریال
            </div>
            <div className="text-sm text-green-700">کل درآمد</div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="text-lg font-bold text-blue-900">
              {Math.round(totalProfit / 1000000).toLocaleString('fa-IR')}M ریال
            </div>
            <div className="text-sm text-blue-700">کل سود</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
            <div className="text-lg font-bold text-purple-900">
              {Math.round(avgDaily / 1000000).toLocaleString('fa-IR')}M ریال
            </div>
            <div className="text-sm text-purple-700">میانگین روزانه</div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-500 mb-4">
            <span>درآمد روزانه (میلیون ریال)</span>
            <div className="flex gap-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full ml-1"></div>
                <span>درآمد</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full ml-1"></div>
                <span>سود</span>
              </div>
            </div>
          </div>
          
          {/* Simple Area Chart Representation */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(revenueData.length, 15)}, 1fr)` }}>
            {revenueData.slice(-15).map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-full bg-gray-200 rounded-t relative" style={{ height: '100px' }}>
                  {/* Revenue Bar */}
                  <div 
                    className="bg-green-500 rounded-t transition-all duration-300 absolute bottom-0 w-full"
                    style={{ 
                      height: `${(item.revenue / maxRevenue) * 100}%`,
                    }}
                  ></div>
                  {/* Profit Bar */}
                  <div 
                    className="bg-blue-500 rounded-t transition-all duration-300 absolute bottom-0 w-1/2"
                    style={{ 
                      height: `${(item.profit / maxRevenue) * 100}%`,
                      right: 0
                    }}
                  ></div>
                </div>
                <div className="text-xs text-center mt-2 space-y-1">
                  <div className="font-medium text-green-600">
                    {Math.round(item.revenue / 1000000)}M
                  </div>
                  <div className="text-gray-400">{item.date.slice(-5)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Breakdown */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">تفکیک درآمد</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">درآمد از معاملات ارزی</span>
                  <span className="font-medium">{Math.round(totalRevenue * 0.7 / 1000000).toLocaleString('fa-IR')}M ریال</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">درآمد از حواله</span>
                  <span className="font-medium">{Math.round(totalRevenue * 0.25 / 1000000).toLocaleString('fa-IR')}M ریال</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">سایر درآمدها</span>
                  <span className="font-medium">{Math.round(totalRevenue * 0.05 / 1000000).toLocaleString('fa-IR')}M ریال</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">حاشیه سود</span>
                  <span className="font-medium text-green-600">
                    {((totalProfit / totalRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">کمیسیون کل</span>
                  <span className="font-medium">
                    {Math.round(revenueData.reduce((sum, item) => sum + item.commission, 0) / 1000000).toLocaleString('fa-IR')}M ریال
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">رشد نسبت به دوره قبل</span>
                  <span className="font-medium text-blue-600">+12.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;