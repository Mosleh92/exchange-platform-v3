import React from 'react';

const CurrencyWidget = ({ currencies = ['USD', 'EUR', 'AED'], showTrend = true, refreshInterval = 30000 }) => {
  // This is a simplified version of the ExchangeRateBoard for smaller spaces
  const [rates, setRates] = React.useState({});

  React.useEffect(() => {
    const updateRates = () => {
      const mockRates = {
        USD: { buy: 42450, sell: 42650, change: 0.8 },
        EUR: { buy: 46200, sell: 46500, change: -0.3 },
        AED: { buy: 11580, sell: 11650, change: 1.2 },
        GBP: { buy: 53300, sell: 53700, change: -0.5 },
        CAD: { buy: 31850, sell: 32050, change: 0.4 },
        TRY: { buy: 1870, sell: 1920, change: -2.1 },
      };
      
      setRates(mockRates);
    };

    updateRates();
    const interval = setInterval(updateRates, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

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
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">نرخ ارزها</h3>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {currencies.map((currency) => {
            const rate = rates[currency];
            if (!rate) return null;

            return (
              <div key={currency} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 w-8">{currency}</span>
                  {showTrend && (
                    <span className={`text-xs ml-2 ${getChangeColor(rate.change)}`}>
                      {getChangeIcon(rate.change)}{Math.abs(rate.change).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-500">خرید/فروش</div>
                  <div className="text-sm">
                    <span className="text-green-700 font-medium">{rate.buy.toLocaleString('fa-IR')}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-red-700 font-medium">{rate.sell.toLocaleString('fa-IR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CurrencyWidget;