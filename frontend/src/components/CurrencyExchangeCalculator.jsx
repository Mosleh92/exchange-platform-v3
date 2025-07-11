import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import PersianUtils from '../utils/persian';
import PersianCalendar from '../utils/persianCalendar';
import '../styles/rtl.css';

const CurrencyExchangeCalculator = () => {
  const [rates, setRates] = useState({
    USD: { buy: 58500, sell: 59000 },
    EUR: { buy: 62800, sell: 63300 },
    GBP: { buy: 73200, sell: 73800 },
    AED: { buy: 15900, sell: 16100 },
    CAD: { buy: 42500, sell: 42800 },
    AUD: { buy: 38900, sell: 39200 },
    JPY: { buy: 395, sell: 405 },
    CHF: { buy: 64100, sell: 64600 }
  });
  
  const [calculator, setCalculator] = useState({
    fromCurrency: 'IRR',
    toCurrency: 'USD',
    fromAmount: '',
    toAmount: '',
    operation: 'buy', // buy or sell
    commission: 0.25, // percentage
    exchangeRate: 0
  });
  
  const [transaction, setTransaction] = useState({
    customerName: '',
    customerPhone: '',
    customerType: 'regular', // regular, vip, business
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [rateHistory, setRateHistory] = useState([]);
  const socketRef = useRef(null);

  const currencies = [
    { code: 'IRR', name: 'ریال ایران', symbol: '﷼', flag: '🇮🇷' },
    { code: 'USD', name: 'دلار آمریکا', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', name: 'یورو', symbol: '€', flag: '🇪🇺' },
    { code: 'GBP', name: 'پوند انگلیس', symbol: '£', flag: '🇬🇧' },
    { code: 'AED', name: 'درهم امارات', symbol: 'د.إ', flag: '🇦🇪' },
    { code: 'CAD', name: 'دلار کانادا', symbol: 'C$', flag: '🇨🇦' },
    { code: 'AUD', name: 'دلار استرالیا', symbol: 'A$', flag: '🇦🇺' },
    { code: 'JPY', name: 'ین ژاپن', symbol: '¥', flag: '🇯🇵' },
    { code: 'CHF', name: 'فرانک سوئیس', symbol: 'CHF', flag: '🇨🇭' }
  ];

  useEffect(() => {
    // Apply RTL styling
    document.body.classList.add('rtl-container');
    document.documentElement.dir = 'rtl';
    
    setupWebSocket();
    generateRateHistory();
    
    return () => {
      document.body.classList.remove('rtl-container');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    calculateExchange();
  }, [calculator.fromCurrency, calculator.toCurrency, calculator.fromAmount, calculator.operation]);

  const setupWebSocket = () => {
    try {
      socketRef.current = io('/rates');
      
      socketRef.current.on('rate-update', (newRates) => {
        setRates(newRates);
        setLastUpdate(new Date());
      });
      
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
  };

  const generateRateHistory = () => {
    // Generate sample rate history for the last 7 days
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      history.push({
        date: PersianCalendar.format(date, 'jMM/jDD'),
        USD: 58500 + Math.floor(Math.random() * 1000) - 500,
        EUR: 62800 + Math.floor(Math.random() * 1000) - 500,
        GBP: 73200 + Math.floor(Math.random() * 1000) - 500,
        AED: 15900 + Math.floor(Math.random() * 100) - 50
      });
    }
    setRateHistory(history);
  };

  const calculateExchange = () => {
    const { fromCurrency, toCurrency, fromAmount, operation } = calculator;
    
    if (!fromAmount || fromAmount === '0') {
      setCalculator(prev => ({ ...prev, toAmount: '', exchangeRate: 0 }));
      return;
    }

    let rate = 0;
    let toAmount = 0;

    if (fromCurrency === 'IRR' && toCurrency !== 'IRR') {
      // Selling foreign currency (IRR to foreign)
      const currencyRate = rates[toCurrency];
      if (currencyRate) {
        rate = operation === 'buy' ? currencyRate.sell : currencyRate.buy;
        toAmount = parseFloat(fromAmount) / rate;
      }
    } else if (fromCurrency !== 'IRR' && toCurrency === 'IRR') {
      // Buying foreign currency (foreign to IRR)
      const currencyRate = rates[fromCurrency];
      if (currencyRate) {
        rate = operation === 'buy' ? currencyRate.buy : currencyRate.sell;
        toAmount = parseFloat(fromAmount) * rate;
      }
    } else if (fromCurrency !== 'IRR' && toCurrency !== 'IRR') {
      // Cross currency exchange
      const fromRate = rates[fromCurrency];
      const toRate = rates[toCurrency];
      if (fromRate && toRate) {
        const irrAmount = parseFloat(fromAmount) * fromRate.buy;
        rate = toRate.sell;
        toAmount = irrAmount / rate;
      }
    } else {
      // IRR to IRR
      rate = 1;
      toAmount = parseFloat(fromAmount);
    }

    // Apply commission
    const commissionAmount = toAmount * (calculator.commission / 100);
    const finalAmount = toAmount - commissionAmount;

    setCalculator(prev => ({
      ...prev,
      toAmount: finalAmount.toFixed(2),
      exchangeRate: rate
    }));
  };

  const handleAmountChange = (field, value) => {
    // Only allow numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    setCalculator(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const swapCurrencies = () => {
    setCalculator(prev => ({
      ...prev,
      fromCurrency: prev.toCurrency,
      toCurrency: prev.fromCurrency,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount
    }));
  };

  const createTransaction = async () => {
    setLoading(true);
    try {
      const transactionData = {
        ...calculator,
        ...transaction,
        rate: calculator.exchangeRate,
        finalAmount: calculator.toAmount,
        commission: (parseFloat(calculator.toAmount) * calculator.commission / 100).toFixed(2),
        timestamp: new Date().toISOString()
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Transaction created:', transactionData);
      alert('معامله با موفقیت ثبت شد');
      
      // Reset form
      setCalculator(prev => ({ ...prev, fromAmount: '', toAmount: '' }));
      setTransaction({ customerName: '', customerPhone: '', customerType: 'regular', notes: '' });
      setShowTransactionForm(false);
      
    } catch (error) {
      console.error('Transaction creation failed:', error);
      alert('خطا در ثبت معامله');
    }
    setLoading(false);
  };

  const formatPersianNumber = (num) => {
    return PersianUtils.formatNumber(num, true);
  };

  const formatCurrency = (amount, currency) => {
    const currencyInfo = currencies.find(c => c.code === currency);
    return `${formatPersianNumber(amount)} ${currencyInfo?.symbol || currency}`;
  };

  const getCurrencyInfo = (code) => {
    return currencies.find(c => c.code === code) || { name: code, symbol: code, flag: '💱' };
  };

  const getRateChangeColor = (current, previous) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="rtl-container min-h-screen bg-gray-50 font-persian">
      <div className="container mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-primary-persian mb-2">ماشین حساب تبدیل ارز</h1>
          <p className="text-gray-600">محاسبه دقیق نرخ تبدیل و ثبت معاملات</p>
          <div className="text-sm text-gray-500 mt-2">
            آخرین بروزرسانی: {PersianCalendar.formatWithTime(lastUpdate)}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calculator */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 persian-card"
          >
            <div className="persian-card-header">
              <h3 className="text-lg font-semibold">ماشین حساب تبدیل</h3>
            </div>
            <div className="persian-card-body">
              {/* Operation Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع عملیات</label>
                <div className="flex space-x-4 space-x-reverse">
                  <button
                    onClick={() => setCalculator(prev => ({ ...prev, operation: 'buy' }))}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      calculator.operation === 'buy'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    خرید ارز
                  </button>
                  <button
                    onClick={() => setCalculator(prev => ({ ...prev, operation: 'sell' }))}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      calculator.operation === 'sell'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    فروش ارز
                  </button>
                </div>
              </div>

              {/* Currency Selection and Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* From Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ارز مبدا</label>
                  <select
                    value={calculator.fromCurrency}
                    onChange={(e) => setCalculator(prev => ({ ...prev, fromCurrency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.flag} {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={calculator.fromAmount}
                      onChange={(e) => handleAmountChange('fromAmount', e.target.value)}
                      placeholder="مبلغ را وارد کنید"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                    />
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={swapCurrencies}
                    className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                  >
                    ⇄
                  </motion.button>
                </div>

                {/* To Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ارز مقصد</label>
                  <select
                    value={calculator.toCurrency}
                    onChange={(e) => setCalculator(prev => ({ ...prev, toCurrency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.flag} {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={calculator.toAmount}
                      readOnly
                      placeholder="نتیجه محاسبه"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Rate Information */}
              {calculator.exchangeRate > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">نرخ تبدیل:</span>
                      <div className="font-bold text-blue-800">
                        {formatPersianNumber(calculator.exchangeRate)} ریال
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">کارمزد ({calculator.commission}%):</span>
                      <div className="font-bold text-orange-600">
                        {formatCurrency((parseFloat(calculator.toAmount) * calculator.commission / 100).toFixed(2), calculator.toCurrency)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">مبلغ نهایی:</span>
                      <div className="font-bold text-green-600">
                        {formatCurrency(calculator.toAmount, calculator.toCurrency)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 space-x-reverse">
                <button
                  onClick={() => setShowTransactionForm(true)}
                  disabled={!calculator.fromAmount || !calculator.toAmount}
                  className="btn-persian-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ثبت معامله
                </button>
                <button
                  onClick={() => setCalculator({ ...calculator, fromAmount: '', toAmount: '' })}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  پاک کردن
                </button>
              </div>
            </div>
          </motion.div>

          {/* Current Rates */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="persian-card"
          >
            <div className="persian-card-header">
              <h3 className="text-lg font-semibold">نرخ‌های فعلی</h3>
            </div>
            <div className="persian-card-body">
              <div className="space-y-3">
                {Object.entries(rates).map(([currency, rate]) => {
                  const currencyInfo = getCurrencyInfo(currency);
                  return (
                    <div key={currency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="text-xl">{currencyInfo.flag}</span>
                        <div>
                          <div className="font-medium">{currency}</div>
                          <div className="text-xs text-gray-500">{currencyInfo.name}</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm">
                          <span className="text-gray-600">خرید: </span>
                          <span className="font-bold text-green-600">{formatPersianNumber(rate.buy)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">فروش: </span>
                          <span className="font-bold text-red-600">{formatPersianNumber(rate.sell)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Transaction Form Modal */}
        <AnimatePresence>
          {showTransactionForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              >
                <h3 className="text-lg font-bold mb-4">ثبت معامله جدید</h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نام مشتری</label>
                    <input
                      type="text"
                      value={transaction.customerName}
                      onChange={(e) => setTransaction(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="نام کامل مشتری"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">شماره تلفن</label>
                    <input
                      type="text"
                      value={transaction.customerPhone}
                      onChange={(e) => setTransaction(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="09xxxxxxxxx"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع مشتری</label>
                    <select
                      value={transaction.customerType}
                      onChange={(e) => setTransaction(prev => ({ ...prev, customerType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="regular">عادی</option>
                      <option value="vip">VIP</option>
                      <option value="business">تجاری</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">یادداشت‌ها</label>
                    <textarea
                      value={transaction.notes}
                      onChange={(e) => setTransaction(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="یادداشت‌های اضافی..."
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 space-x-reverse">
                  <button
                    onClick={createTransaction}
                    disabled={loading || !transaction.customerName || !transaction.customerPhone}
                    className="btn-persian-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'در حال ثبت...' : 'ثبت معامله'}
                  </button>
                  <button
                    onClick={() => setShowTransactionForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    لغو
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CurrencyExchangeCalculator;