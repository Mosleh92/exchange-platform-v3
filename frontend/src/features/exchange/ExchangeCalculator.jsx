import React, { useState, useEffect } from 'react';

const ExchangeCalculator = ({ onTransactionSubmit }) => {
  const [formData, setFormData] = useState({
    transactionType: 'buy', // 'buy' or 'sell'
    sourceCurrency: 'IRR',
    targetCurrency: 'USD',
    sourceAmount: '',
    targetAmount: '',
    customer: null,
    rate: 0,
    commission: 0,
    finalAmount: 0
  });

  const [rates, setRates] = useState({
    USD: { buy: 42450, sell: 42650 },
    EUR: { buy: 46200, sell: 46500 },
    AED: { buy: 11580, sell: 11650 },
    GBP: { buy: 53300, sell: 53700 },
    CAD: { buy: 31850, sell: 32050 },
    TRY: { buy: 1870, sell: 1920 }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([
    { id: 1, name: 'محمد رضایی', nationalId: '1234567890', phone: '09123456789' },
    { id: 2, name: 'فاطمه کریمی', nationalId: '0987654321', phone: '09123456788' },
    { id: 3, name: 'علی محمدی', nationalId: '1122334455', phone: '09123456787' },
  ]);

  const filteredCustomers = customers.filter(customer =>
    customer.name.includes(searchTerm) ||
    customer.nationalId.includes(searchTerm) ||
    customer.phone.includes(searchTerm)
  );

  const currencies = [
    { code: 'IRR', name: 'ریال ایران', flag: '🇮🇷' },
    { code: 'USD', name: 'دلار آمریکا', flag: '🇺🇸' },
    { code: 'EUR', name: 'یورو', flag: '🇪🇺' },
    { code: 'AED', name: 'درهم امارات', flag: '🇦🇪' },
    { code: 'GBP', name: 'پوند انگلیس', flag: '🇬🇧' },
    { code: 'CAD', name: 'دلار کانادا', flag: '🇨🇦' },
    { code: 'TRY', name: 'لیر ترکیه', flag: '🇹🇷' }
  ];

  // Calculate exchange when amounts or currencies change
  useEffect(() => {
    calculateExchange();
  }, [formData.sourceCurrency, formData.targetCurrency, formData.sourceAmount, formData.transactionType]);

  const calculateExchange = () => {
    if (!formData.sourceAmount || formData.sourceAmount <= 0) {
      setFormData(prev => ({ ...prev, targetAmount: '', rate: 0, commission: 0, finalAmount: 0 }));
      return;
    }

    const sourceAmount = parseFloat(formData.sourceAmount);
    let rate = 0;
    let targetAmount = 0;

    if (formData.sourceCurrency === 'IRR' && formData.targetCurrency !== 'IRR') {
      // Selling foreign currency (buying IRR)
      rate = rates[formData.targetCurrency]?.[formData.transactionType] || 0;
      targetAmount = sourceAmount / rate;
    } else if (formData.sourceCurrency !== 'IRR' && formData.targetCurrency === 'IRR') {
      // Buying foreign currency (selling IRR)
      rate = rates[formData.sourceCurrency]?.[formData.transactionType] || 0;
      targetAmount = sourceAmount * rate;
    } else if (formData.sourceCurrency !== 'IRR' && formData.targetCurrency !== 'IRR') {
      // Cross currency exchange
      const sourceRate = rates[formData.sourceCurrency]?.[formData.transactionType] || 0;
      const targetRate = rates[formData.targetCurrency]?.[formData.transactionType] || 0;
      rate = sourceRate / targetRate;
      targetAmount = sourceAmount * rate;
    } else {
      // Same currency
      rate = 1;
      targetAmount = sourceAmount;
    }

    // Calculate commission (0.5%)
    const commission = targetAmount * 0.005;
    const finalAmount = formData.transactionType === 'buy' ? targetAmount - commission : targetAmount + commission;

    setFormData(prev => ({
      ...prev,
      targetAmount: targetAmount.toFixed(2),
      rate: rate,
      commission: commission.toFixed(2),
      finalAmount: finalAmount.toFixed(2)
    }));
  };

  const handleSwapCurrencies = () => {
    setFormData(prev => ({
      ...prev,
      sourceCurrency: prev.targetCurrency,
      targetCurrency: prev.sourceCurrency,
      sourceAmount: prev.targetAmount,
      targetAmount: prev.sourceAmount,
      transactionType: prev.transactionType === 'buy' ? 'sell' : 'buy'
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.customer) {
      alert('لطفا مشتری را انتخاب کنید');
      return;
    }

    if (!formData.sourceAmount || formData.sourceAmount <= 0) {
      alert('مبلغ معامله وارد نشده است');
      return;
    }

    const transaction = {
      ...formData,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };

    onTransactionSubmit?.(transaction);
    
    // Reset form
    setFormData({
      transactionType: 'buy',
      sourceCurrency: 'IRR',
      targetCurrency: 'USD',
      sourceAmount: '',
      targetAmount: '',
      customer: null,
      rate: 0,
      commission: 0,
      finalAmount: 0
    });
    setSearchTerm('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200" dir="rtl">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">ماشین حساب معاملات ارزی</h2>
        <p className="text-sm text-gray-500">محاسبه و ثبت معاملات خرید و فروش ارز</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">نوع معامله</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="buy"
                checked={formData.transactionType === 'buy'}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value }))}
                className="form-radio text-blue-600"
              />
              <span className="mr-2 text-green-700 font-medium">خرید ارز</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="sell"
                checked={formData.transactionType === 'sell'}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value }))}
                className="form-radio text-blue-600"
              />
              <span className="mr-2 text-red-700 font-medium">فروش ارز</span>
            </label>
          </div>
        </div>

        {/* Currency Exchange Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Currency */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">از ارز</label>
              <select
                value={formData.sourceCurrency}
                onChange={(e) => setFormData(prev => ({ ...prev, sourceCurrency: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ</label>
              <input
                type="number"
                value={formData.sourceAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, sourceAmount: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="مبلغ مورد نظر"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleSwapCurrencies}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-3 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>

          {/* Target Currency */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">به ارز</label>
              <select
                value={formData.targetCurrency}
                onChange={(e) => setFormData(prev => ({ ...prev, targetCurrency: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ معادل</label>
              <input
                type="text"
                value={formData.targetAmount}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                placeholder="محاسبه خودکار"
              />
            </div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        {formData.rate > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">جزئیات نرخ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">نرخ معامله:</span>
                <span className="font-medium mr-2">{formData.rate.toLocaleString('fa-IR')}</span>
              </div>
              <div>
                <span className="text-blue-700">کارمزد:</span>
                <span className="font-medium mr-2">{formData.commission} {formData.targetCurrency}</span>
              </div>
              <div>
                <span className="text-blue-700">مبلغ نهایی:</span>
                <span className="font-bold mr-2 text-blue-900">{formData.finalAmount} {formData.targetCurrency}</span>
              </div>
            </div>
          </div>
        )}

        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">انتخاب مشتری</label>
          <div className="space-y-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی مشتری (نام، کد ملی، تلفن)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            
            {searchTerm && (
              <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, customer }));
                        setSearchTerm('');
                      }}
                      className="w-full text-right px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.nationalId} - {customer.phone}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500">مشتری یافت نشد</div>
                )}
              </div>
            )}
            
            {formData.customer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-green-900">{formData.customer.name}</div>
                    <div className="text-sm text-green-700">{formData.customer.nationalId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, customer: null }))}
                    className="text-green-600 hover:text-green-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            ثبت معامله
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExchangeCalculator;