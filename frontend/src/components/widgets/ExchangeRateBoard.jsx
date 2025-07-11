import React, { useState, useEffect } from 'react';

const ExchangeRateBoard = () => {
  const [rates, setRates] = useState({});
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Mock real-time rate updates
  useEffect(() => {
    const updateRates = () => {
      const mockRates = {
        USD: {
          buy: 42450 + Math.floor(Math.random() * 200) - 100,
          sell: 42650 + Math.floor(Math.random() * 200) - 100,
          change: (Math.random() - 0.5) * 2,
        },
        EUR: {
          buy: 46100 + Math.floor(Math.random() * 300) - 150,
          sell: 46400 + Math.floor(Math.random() * 300) - 150,
          change: (Math.random() - 0.5) * 2,
        },
        AED: {
          buy: 11550 + Math.floor(Math.random() * 100) - 50,
          sell: 11650 + Math.floor(Math.random() * 100) - 50,
          change: (Math.random() - 0.5) * 2,
        },
        GBP: {
          buy: 53200 + Math.floor(Math.random() * 400) - 200,
          sell: 53600 + Math.floor(Math.random() * 400) - 200,
          change: (Math.random() - 0.5) * 2,
        },
        CAD: {
          buy: 31800 + Math.floor(Math.random() * 200) - 100,
          sell: 32000 + Math.floor(Math.random() * 200) - 100,
          change: (Math.random() - 0.5) * 2,
        },
        TRY: {
          buy: 1850 + Math.floor(Math.random() * 50) - 25,
          sell: 1900 + Math.floor(Math.random() * 50) - 25,
          change: (Math.random() - 0.5) * 2,
        }
      };
      
      setRates(mockRates);
      setLastUpdate(new Date());
    };

    // Initial load
    updateRates();
    
    // Update every 30 seconds
    const interval = setInterval(updateRates, 30000);

    return () => clearInterval(interval);
  }, []);

  const getCurrencyFlag = (currency) => {
    const flags = {
      USD: '🇺🇸',
      EUR: '🇪🇺', 
      AED: '🇦🇪',
      GBP: '🇬🇧',
      CAD: '🇨🇦',
      TRY: '🇹🇷'
    };
    return flags[currency] || '💱';
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">تابلو نرخ ارز</h2>
          <div className="flex items-center text-xs text-gray-500">
            <span className="w-2 h-2 bg-green-400 rounded-full ml-2 animate-pulse"></span>
            زنده
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          آخرین بروزرسانی: {lastUpdate.toLocaleTimeString('fa-IR')}
        </p>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {Object.entries(rates).map(([currency, rate]) => (
            <div key={currency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center">
                <span className="text-lg ml-2">{getCurrencyFlag(currency)}</span>
                <div>
                  <div className="font-medium text-gray-900">{currency}</div>
                  <div className={`text-xs ${getChangeColor(rate.change)} flex items-center`}>
                    <span className="ml-1">{getChangeIcon(rate.change)}</span>
                    {Math.abs(rate.change).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">خرید</div>
                    <div className="font-semibold text-green-700">
                      {rate.buy.toLocaleString('fa-IR')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">فروش</div>
                    <div className="font-semibold text-red-700">
                      {rate.sell.toLocaleString('fa-IR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              + معامله جدید
            </button>
            <button className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              + حواله
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateBoard;