import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import PersianUtils from '../utils/persian';
import PersianCalendar from '../utils/persianCalendar';
import '../styles/rtl.css';

const InternationalRemittanceSystem = () => {
  const [remittance, setRemittance] = useState({
    senderInfo: {
      name: '',
      phone: '',
      nationalId: '',
      address: ''
    },
    beneficiaryInfo: {
      name: '',
      phone: '',
      email: '',
      address: '',
      country: '',
      city: '',
      bankName: '',
      accountNumber: '',
      iban: '',
      swiftCode: ''
    },
    transferInfo: {
      amount: '',
      sourceCurrency: 'IRR',
      targetCurrency: 'USD',
      purpose: '',
      deliveryMethod: 'bank_transfer', // bank_transfer, cash_pickup, mobile_wallet
      exchangeRate: 0,
      fees: 0,
      totalAmount: 0
    },
    securityInfo: {
      pinCode: '',
      secretQuestion: '',
      secretAnswer: ''
    }
  });

  const [tracking, setTracking] = useState({
    trackingNumber: '',
    status: 'pending', // pending, processing, completed, cancelled
    statusHistory: [],
    estimatedDelivery: null
  });

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [countries, setCountries] = useState([
    { code: 'AE', name: 'امارات متحده عربی', currency: 'AED', flag: '🇦🇪' },
    { code: 'TR', name: 'ترکیه', currency: 'TRY', flag: '🇹🇷' },
    { code: 'AF', name: 'افغانستان', currency: 'AFN', flag: '🇦🇫' },
    { code: 'PK', name: 'پاکستان', currency: 'PKR', flag: '🇵🇰' },
    { code: 'IQ', name: 'عراق', currency: 'IQD', flag: '🇮🇶' },
    { code: 'GB', name: 'انگلستان', currency: 'GBP', flag: '🇬🇧' },
    { code: 'DE', name: 'آلمان', currency: 'EUR', flag: '🇩🇪' },
    { code: 'CA', name: 'کانادا', currency: 'CAD', flag: '🇨🇦' },
    { code: 'AU', name: 'استرالیا', currency: 'AUD', flag: '🇦🇺' }
  ]);

  const [exchangeRates, setExchangeRates] = useState({
    AED: 16000,
    TRY: 1950,
    AFN: 750,
    PKR: 195,
    IQD: 40,
    GBP: 73500,
    EUR: 63000,
    CAD: 42500,
    AUD: 39000
  });

  const [step, setStep] = useState(1); // 1: Sender, 2: Beneficiary, 3: Transfer, 4: Review, 5: Complete
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const socketRef = useRef(null);

  const deliveryMethods = [
    { value: 'bank_transfer', label: 'انتقال بانکی', icon: '🏦', description: 'مستقیم به حساب بانکی' },
    { value: 'cash_pickup', label: 'دریافت نقدی', icon: '💵', description: 'دریافت از نمایندگی' },
    { value: 'mobile_wallet', label: 'کیف پول موبایل', icon: '📱', description: 'انتقال به کیف پول دیجیتال' }
  ];

  const transferPurposes = [
    'هزینه تحصیل',
    'هزینه درمان',
    'کمک به خانواده',
    'هزینه زندگی',
    'سرمایه گذاری',
    'خرید ملک',
    'سایر'
  ];

  useEffect(() => {
    // Apply RTL styling
    document.body.classList.add('rtl-container');
    document.documentElement.dir = 'rtl';
    
    setupWebSocket();
    loadBeneficiaries();
    
    return () => {
      document.body.classList.remove('rtl-container');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (remittance.transferInfo.amount && remittance.transferInfo.targetCurrency) {
      calculateTotal();
    }
  }, [remittance.transferInfo.amount, remittance.transferInfo.targetCurrency, remittance.transferInfo.deliveryMethod]);

  const setupWebSocket = () => {
    try {
      socketRef.current = io('/remittance');
      
      socketRef.current.on('rate-update', (rates) => {
        setExchangeRates(rates);
      });
      
      socketRef.current.on('status-update', (statusUpdate) => {
        setTracking(prev => ({
          ...prev,
          status: statusUpdate.status,
          statusHistory: [...prev.statusHistory, statusUpdate]
        }));
      });
      
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
  };

  const loadBeneficiaries = () => {
    // Load saved beneficiaries from localStorage or API
    const saved = localStorage.getItem('beneficiaries');
    if (saved) {
      setBeneficiaries(JSON.parse(saved));
    }
  };

  const calculateTotal = () => {
    const amount = parseFloat(remittance.transferInfo.amount) || 0;
    const rate = exchangeRates[remittance.transferInfo.targetCurrency] || 1;
    
    // Calculate fees based on delivery method and amount
    let feePercentage = 0.5; // Base fee
    if (remittance.transferInfo.deliveryMethod === 'cash_pickup') {
      feePercentage = 1.0;
    } else if (remittance.transferInfo.deliveryMethod === 'mobile_wallet') {
      feePercentage = 0.3;
    }
    
    const fees = amount * (feePercentage / 100);
    const total = amount + fees;
    const targetAmount = amount / rate;
    
    setRemittance(prev => ({
      ...prev,
      transferInfo: {
        ...prev.transferInfo,
        exchangeRate: rate,
        fees: fees,
        totalAmount: total,
        targetAmount: targetAmount
      }
    }));
  };

  const validateStep = (stepNumber) => {
    const newErrors = {};
    
    switch (stepNumber) {
      case 1:
        if (!remittance.senderInfo.name) newErrors.senderName = 'نام الزامی است';
        if (!remittance.senderInfo.phone) newErrors.senderPhone = 'شماره تلفن الزامی است';
        if (!remittance.senderInfo.nationalId) newErrors.senderNationalId = 'کد ملی الزامی است';
        break;
      case 2:
        if (!remittance.beneficiaryInfo.name) newErrors.beneficiaryName = 'نام گیرنده الزامی است';
        if (!remittance.beneficiaryInfo.country) newErrors.beneficiaryCountry = 'کشور الزامی است';
        break;
      case 3:
        if (!remittance.transferInfo.amount) newErrors.amount = 'مبلغ الزامی است';
        if (!remittance.transferInfo.purpose) newErrors.purpose = 'هدف حواله الزامی است';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const submitRemittance = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const trackingNumber = 'RMT' + Date.now().toString().slice(-8);
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);
      
      setTracking({
        trackingNumber,
        status: 'processing',
        statusHistory: [
          { status: 'pending', timestamp: new Date(), description: 'حواله ثبت شد' },
          { status: 'processing', timestamp: new Date(), description: 'در حال پردازش' }
        ],
        estimatedDelivery
      });
      
      setStep(5);
      
    } catch (error) {
      console.error('Remittance submission failed:', error);
      alert('خطا در ثبت حواله');
    }
    setLoading(false);
  };

  const saveBeneficiary = () => {
    const newBeneficiary = {
      id: Date.now(),
      ...remittance.beneficiaryInfo,
      addedDate: new Date()
    };
    
    const updatedBeneficiaries = [...beneficiaries, newBeneficiary];
    setBeneficiaries(updatedBeneficiaries);
    localStorage.setItem('beneficiaries', JSON.stringify(updatedBeneficiaries));
  };

  const selectBeneficiary = (beneficiary) => {
    setRemittance(prev => ({
      ...prev,
      beneficiaryInfo: { ...beneficiary }
    }));
  };

  const formatPersianNumber = (num) => {
    return PersianUtils.formatNumber(num, true);
  };

  const formatCurrency = (amount, currency) => {
    return PersianUtils.currency.formatAdvanced(amount, currency, { abbreviated: true });
  };

  const getSelectedCountry = () => {
    return countries.find(c => c.code === remittance.beneficiaryInfo.country);
  };

  const getStepTitle = (stepNumber) => {
    const titles = {
      1: 'اطلاعات فرستنده',
      2: 'اطلاعات گیرنده',
      3: 'اطلاعات حواله',
      4: 'بررسی نهایی',
      5: 'تکمیل حواله'
    };
    return titles[stepNumber];
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
          <h1 className="text-3xl font-bold text-primary-persian mb-2">سیستم حواله بین‌المللی</h1>
          <p className="text-gray-600">ارسال امن و سریع حواله به سراسر جهان</p>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between persian-card p-4">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  stepNumber <= step ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  {stepNumber < step ? '✓' : stepNumber}
                </div>
                <div className="mr-3 text-sm font-medium">
                  {getStepTitle(stepNumber)}
                </div>
                {stepNumber < 5 && (
                  <div className={`w-8 h-1 mx-4 ${stepNumber < step ? 'bg-blue-500' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="persian-card"
          >
            <div className="persian-card-header">
              <h2 className="text-xl font-bold">{getStepTitle(step)}</h2>
            </div>
            <div className="persian-card-body">
              {/* Step 1: Sender Information */}
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نام کامل فرستنده *</label>
                    <input
                      type="text"
                      value={remittance.senderInfo.name}
                      onChange={(e) => setRemittance(prev => ({
                        ...prev,
                        senderInfo: { ...prev.senderInfo, name: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="نام و نام خانوادگی"
                    />
                    {errors.senderName && <p className="text-red-500 text-sm mt-1">{errors.senderName}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">شماره تلفن *</label>
                    <input
                      type="text"
                      value={remittance.senderInfo.phone}
                      onChange={(e) => setRemittance(prev => ({
                        ...prev,
                        senderInfo: { ...prev.senderInfo, phone: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="09xxxxxxxxx"
                    />
                    {errors.senderPhone && <p className="text-red-500 text-sm mt-1">{errors.senderPhone}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">کد ملی *</label>
                    <input
                      type="text"
                      value={remittance.senderInfo.nationalId}
                      onChange={(e) => setRemittance(prev => ({
                        ...prev,
                        senderInfo: { ...prev.senderInfo, nationalId: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="کد ملی ۱۰ رقمی"
                    />
                    {errors.senderNationalId && <p className="text-red-500 text-sm mt-1">{errors.senderNationalId}</p>}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">آدرس</label>
                    <textarea
                      value={remittance.senderInfo.address}
                      onChange={(e) => setRemittance(prev => ({
                        ...prev,
                        senderInfo: { ...prev.senderInfo, address: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="آدرس کامل فرستنده"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Beneficiary Information */}
              {step === 2 && (
                <div>
                  {/* Saved Beneficiaries */}
                  {beneficiaries.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">گیرندگان ذخیره شده</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {beneficiaries.map((beneficiary) => (
                          <motion.div
                            key={beneficiary.id}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => selectBeneficiary(beneficiary)}
                            className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50"
                          >
                            <div className="font-medium">{beneficiary.name}</div>
                            <div className="text-sm text-gray-600">{beneficiary.country} - {beneficiary.bankName}</div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 mt-6 pt-6">
                        <h3 className="text-lg font-semibold mb-3">یا گیرنده جدید اضافه کنید</h3>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">نام کامل گیرنده *</label>
                      <input
                        type="text"
                        value={remittance.beneficiaryInfo.name}
                        onChange={(e) => setRemittance(prev => ({
                          ...prev,
                          beneficiaryInfo: { ...prev.beneficiaryInfo, name: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="نام و نام خانوادگی گیرنده"
                      />
                      {errors.beneficiaryName && <p className="text-red-500 text-sm mt-1">{errors.beneficiaryName}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">کشور مقصد *</label>
                      <select
                        value={remittance.beneficiaryInfo.country}
                        onChange={(e) => {
                          const country = countries.find(c => c.code === e.target.value);
                          setRemittance(prev => ({
                            ...prev,
                            beneficiaryInfo: { ...prev.beneficiaryInfo, country: e.target.value },
                            transferInfo: { ...prev.transferInfo, targetCurrency: country?.currency || 'USD' }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">انتخاب کشور</option>
                        {countries.map(country => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.name}
                          </option>
                        ))}
                      </select>
                      {errors.beneficiaryCountry && <p className="text-red-500 text-sm mt-1">{errors.beneficiaryCountry}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">شماره تلفن</label>
                      <input
                        type="text"
                        value={remittance.beneficiaryInfo.phone}
                        onChange={(e) => setRemittance(prev => ({
                          ...prev,
                          beneficiaryInfo: { ...prev.beneficiaryInfo, phone: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="شماره تلفن گیرنده"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">نام بانک</label>
                      <input
                        type="text"
                        value={remittance.beneficiaryInfo.bankName}
                        onChange={(e) => setRemittance(prev => ({
                          ...prev,
                          beneficiaryInfo: { ...prev.beneficiaryInfo, bankName: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="نام بانک گیرنده"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">شماره حساب</label>
                      <input
                        type="text"
                        value={remittance.beneficiaryInfo.accountNumber}
                        onChange={(e) => setRemittance(prev => ({
                          ...prev,
                          beneficiaryInfo: { ...prev.beneficiaryInfo, accountNumber: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="شماره حساب بانکی"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">کد SWIFT</label>
                      <input
                        type="text"
                        value={remittance.beneficiaryInfo.swiftCode}
                        onChange={(e) => setRemittance(prev => ({
                          ...prev,
                          beneficiaryInfo: { ...prev.beneficiaryInfo, swiftCode: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="کد SWIFT بانک"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button
                      onClick={saveBeneficiary}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      ذخیره این گیرنده برای استفاده بعدی
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Transfer Information */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ ارسالی (ریال) *</label>
                      <input
                        type="text"
                        value={remittance.transferInfo.amount}
                        onChange={(e) => setRemittance(prev => ({
                          ...prev,
                          transferInfo: { ...prev.transferInfo, amount: e.target.value.replace(/[^0-9]/g, '') }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-left"
                        placeholder="مبلغ به ریال"
                      />
                      {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">هدف حواله *</label>
                      <select
                        value={remittance.transferInfo.purpose}
                        onChange={(e) => setRemittance(prev => ({
                          ...prev,
                          transferInfo: { ...prev.transferInfo, purpose: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">انتخاب هدف</option>
                        {transferPurposes.map(purpose => (
                          <option key={purpose} value={purpose}>{purpose}</option>
                        ))}
                      </select>
                      {errors.purpose && <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>}
                    </div>
                  </div>

                  {/* Delivery Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">روش تحویل</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {deliveryMethods.map(method => (
                        <motion.div
                          key={method.value}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setRemittance(prev => ({
                            ...prev,
                            transferInfo: { ...prev.transferInfo, deliveryMethod: method.value }
                          }))}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            remittance.transferInfo.deliveryMethod === method.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-3xl mb-2">{method.icon}</div>
                            <div className="font-medium">{method.label}</div>
                            <div className="text-sm text-gray-600 mt-1">{method.description}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Exchange Rate Information */}
                  {remittance.transferInfo.amount && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-3">اطلاعات تبدیل ارز</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">نرخ تبدیل:</span>
                          <div className="font-bold">
                            {formatPersianNumber(remittance.transferInfo.exchangeRate)} ریال
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">کارمزد:</span>
                          <div className="font-bold text-orange-600">
                            {formatCurrency(remittance.transferInfo.fees, 'IRR')}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">مبلغ نهایی:</span>
                          <div className="font-bold text-red-600">
                            {formatCurrency(remittance.transferInfo.totalAmount, 'IRR')}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">مبلغ دریافتی:</span>
                          <div className="font-bold text-green-600">
                            {formatCurrency(remittance.transferInfo.targetAmount, remittance.transferInfo.targetCurrency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">اطلاعات فرستنده</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-600">نام:</span> {remittance.senderInfo.name}</div>
                        <div><span className="text-gray-600">تلفن:</span> {remittance.senderInfo.phone}</div>
                        <div><span className="text-gray-600">کد ملی:</span> {remittance.senderInfo.nationalId}</div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">اطلاعات گیرنده</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-600">نام:</span> {remittance.beneficiaryInfo.name}</div>
                        <div><span className="text-gray-600">کشور:</span> {getSelectedCountry()?.name}</div>
                        <div><span className="text-gray-600">بانک:</span> {remittance.beneficiaryInfo.bankName}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">خلاصه حواله</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-600">مبلغ:</span> {formatCurrency(remittance.transferInfo.amount, 'IRR')}</div>
                      <div><span className="text-gray-600">کارمزد:</span> {formatCurrency(remittance.transferInfo.fees, 'IRR')}</div>
                      <div><span className="text-gray-600">مجموع:</span> {formatCurrency(remittance.transferInfo.totalAmount, 'IRR')}</div>
                      <div><span className="text-gray-600">مبلغ دریافتی:</span> {formatCurrency(remittance.transferInfo.targetAmount, remittance.transferInfo.targetCurrency)}</div>
                    </div>
                  </div>
                  
                  {/* Security Information */}
                  <div className="border border-yellow-300 bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">اطلاعات امنیتی</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رمز دریافت (۴ رقم)</label>
                        <input
                          type="text"
                          value={remittance.securityInfo.pinCode}
                          onChange={(e) => setRemittance(prev => ({
                            ...prev,
                            securityInfo: { ...prev.securityInfo, pinCode: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="1234"
                          maxLength="4"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">سوال امنیتی</label>
                        <input
                          type="text"
                          value={remittance.securityInfo.secretQuestion}
                          onChange={(e) => setRemittance(prev => ({
                            ...prev,
                            securityInfo: { ...prev.securityInfo, secretQuestion: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="نام مادر شما چیست؟"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Complete */}
              {step === 5 && (
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-4xl"
                  >
                    ✓
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-green-600 mb-4">حواله شما با موفقیت ثبت شد!</h3>
                  
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-600">شماره پیگیری:</span> <span className="font-bold">{tracking.trackingNumber}</span></div>
                      <div><span className="text-gray-600">وضعیت:</span> <span className="font-bold text-blue-600">در حال پردازش</span></div>
                      <div><span className="text-gray-600">تاریخ تحویل تقریبی:</span> <span className="font-bold">{PersianCalendar.format(tracking.estimatedDelivery)}</span></div>
                      <div><span className="text-gray-600">مبلغ دریافتی:</span> <span className="font-bold">{formatCurrency(remittance.transferInfo.targetAmount, remittance.transferInfo.targetCurrency)}</span></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = '/remittances'}
                      className="btn-persian-primary w-full md:w-auto"
                    >
                      مشاهده لیست حواله‌ها
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="block w-full md:w-auto mx-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      ارسال حواله جدید
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            {step < 5 && (
              <div className="persian-card-body border-t border-gray-200">
                <div className="flex justify-between">
                  <button
                    onClick={prevStep}
                    disabled={step === 1}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    مرحله قبل
                  </button>
                  
                  {step < 4 ? (
                    <button
                      onClick={nextStep}
                      className="btn-persian-primary"
                    >
                      مرحله بعد
                    </button>
                  ) : (
                    <button
                      onClick={submitRemittance}
                      disabled={loading}
                      className="btn-persian-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'در حال ثبت...' : 'ثبت نهایی حواله'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default InternationalRemittanceSystem;