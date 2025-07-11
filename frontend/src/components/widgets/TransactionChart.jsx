import React from 'react';

const TransactionChart = ({ dateRange }) => {
  // Mock chart data - in real implementation, this would use a charting library like Chart.js or Recharts
  const generateMockData = () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data = [];
    for (let i = 0; i < days; i++) {
      data.push({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('fa-IR'),
        transactions: Math.floor(Math.random() * 50) + 10,
        volume: Math.floor(Math.random() * 100000000) + 10000000,
      });
    }
    return data;
  };

  const chartData = generateMockData();
  const maxTransactions = Math.max(...chartData.map(d => d.transactions));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">نمودار تراکنش‌ها</h2>
        <p className="text-sm text-gray-500">تعداد تراکنش‌ها در بازه زمانی انتخابی</p>
      </div>
      <div className="p-6">
        {/* Simple bar chart representation */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-500 mb-4">
            <span>تعداد تراکنش</span>
            <span>حجم معاملات (میلیون ریال)</span>
          </div>
          
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(chartData.length, 10)}, 1fr)` }}>
            {chartData.slice(-10).map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-full bg-gray-200 rounded-t" style={{ height: '120px', position: 'relative' }}>
                  <div 
                    className="bg-blue-500 rounded-t transition-all duration-300"
                    style={{ 
                      height: `${(item.transactions / maxTransactions) * 100}%`,
                      position: 'absolute',
                      bottom: 0,
                      width: '100%'
                    }}
                  ></div>
                </div>
                <div className="text-xs text-center mt-2 space-y-1">
                  <div className="font-medium">{item.transactions}</div>
                  <div className="text-gray-500">{Math.round(item.volume / 1000000)}M</div>
                  <div className="text-gray-400">{item.date.slice(-5)}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {chartData.reduce((sum, item) => sum + item.transactions, 0)}
              </div>
              <div className="text-sm text-gray-500">کل تراکنش‌ها</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(chartData.reduce((sum, item) => sum + item.volume, 0) / 1000000).toLocaleString('fa-IR')}M
              </div>
              <div className="text-sm text-gray-500">کل حجم (میلیون ریال)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(chartData.reduce((sum, item) => sum + item.transactions, 0) / chartData.length)}
              </div>
              <div className="text-sm text-gray-500">میانگین روزانه</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionChart;