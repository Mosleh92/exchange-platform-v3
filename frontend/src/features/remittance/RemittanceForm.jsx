import React, { useState } from 'react';

const RemittanceForm = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    sender: null,
    beneficiary: {
      name: '',
      address: '',
      bankInfo: {
        accountNumber: '',
        bankName: '',
        swiftCode: '',
        routingNumber: ''
      }
    },
    amount: {
      source: '',
      sourceCurrency: 'IRR',
      target: '',
      targetCurrency: 'USD'
    },
    purpose: '',
    deliveryMethod: 'bank_transfer', // 'bank_transfer' or 'cash_pickup'
    pickupLocation: '',
    exchangeRate: 0,
    fees: 0,
    totalCost: 0
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const customers = [
    { id: 1, name: 'محمد رضایی', nationalId: '1234567890', phone: '09123456789' },
    { id: 2, name: 'فاطمه کریمی', nationalId: '0987654321', phone: '09123456788' },
    { id: 3, name: 'علی محمدی', nationalId: '1122334455', phone: '09123456787' },
  ];

  const filteredCustomers = customers.filter(customer =>
    customer.name.includes(searchTerm) ||
    customer.nationalId.includes(searchTerm) ||
    customer.phone.includes(searchTerm)
  );

  const countries = [
    { code: 'US', name: 'آمریکا', currency: 'USD', flag: '🇺🇸' },
    { code: 'CA', name: 'کانادا', currency: 'CAD', flag: '🇨🇦' },
    { code: 'GB', name: 'انگلیس', currency: 'GBP', flag: '🇬🇧' },
    { code: 'DE', name: 'آلمان', currency: 'EUR', flag: '🇩🇪' },
    { code: 'AE', name: 'امارات', currency: 'AED', flag: '🇦🇪' },
    { code: 'TR', name: 'ترکیه', currency: 'TRY', flag: '🇹🇷' },
  ];

  const exchangeRates = {
    USD: 42500,
    CAD: 31900,
    GBP: 53400,
    EUR: 46300,
    AED: 11600,
    TRY: 1880
  };

  const calculateCost = () => {
    if (!formData.amount.source || !formData.amount.targetCurrency) return;

    const sourceAmount = parseFloat(formData.amount.source);
    const rate = exchangeRates[formData.amount.targetCurrency] || 0;
    const targetAmount = sourceAmount / rate;
    
    // Calculate fees (1% + fixed fee)
    const percentageFee = sourceAmount * 0.01;
    const fixedFee = 50000; // 50,000 IRR
    const totalFees = percentageFee + fixedFee;
    const totalCost = sourceAmount + totalFees;

    setFormData(prev => ({
      ...prev,
      amount: {
        ...prev.amount,
        target: targetAmount.toFixed(2)
      },
      exchangeRate: rate,
      fees: totalFees,
      totalCost: totalCost
    }));
  };

  React.useEffect(() => {
    calculateCost();
  }, [formData.amount.source, formData.amount.targetCurrency]);

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Sender
        if (!formData.sender) newErrors.sender = 'انتخاب فرستنده الزامی است';
        break;
      case 2: // Beneficiary
        if (!formData.beneficiary.name) newErrors.beneficiaryName = 'نام گیرنده الزامی است';
        if (!formData.beneficiary.address) newErrors.beneficiaryAddress = 'آدرس گیرنده الزامی است';
        if (formData.deliveryMethod === 'bank_transfer') {
          if (!formData.beneficiary.bankInfo.accountNumber) {
            newErrors.accountNumber = 'شماره حساب الزامی است';
          }
          if (!formData.beneficiary.bankInfo.bankName) {
            newErrors.bankName = 'نام بانک الزامی است';
          }
        }
        break;
      case 3: // Amount
        if (!formData.amount.source || formData.amount.source <= 0) {
          newErrors.sourceAmount = 'مبلغ ارسال الزامی است';
        }
        if (!formData.purpose) newErrors.purpose = 'هدف ارسال الزامی است';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      onSubmit(formData);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">انتخاب فرستنده</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">جستجوی مشتری</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="نام، کد ملی یا شماره تلفن"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {errors.sender && <p className="text-red-500 text-xs mt-1">{errors.sender}</p>}
            </div>

            {searchTerm && (
              <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, sender: customer }));
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

            {formData.sender && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-green-900">{formData.sender.name}</div>
                    <div className="text-sm text-green-700">{formData.sender.nationalId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sender: null }))}
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
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">اطلاعات گیرنده</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام کامل گیرنده</label>
              <input
                type="text"
                value={formData.beneficiary.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  beneficiary: { ...prev.beneficiary, name: e.target.value }
                }))}
                className={`w-full border rounded-lg px-3 py-2 ${errors.beneficiaryName ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="نام و نام خانوادگی گیرنده"
              />
              {errors.beneficiaryName && <p className="text-red-500 text-xs mt-1">{errors.beneficiaryName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">آدرس کامل گیرنده</label>
              <textarea
                value={formData.beneficiary.address}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  beneficiary: { ...prev.beneficiary, address: e.target.value }
                }))}
                className={`w-full border rounded-lg px-3 py-2 ${errors.beneficiaryAddress ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="آدرس کامل محل سکونت گیرنده"
                rows="3"
              />
              {errors.beneficiaryAddress && <p className="text-red-500 text-xs mt-1">{errors.beneficiaryAddress}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">روش تحویل</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="bank_transfer"
                    checked={formData.deliveryMethod === 'bank_transfer'}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryMethod: e.target.value }))}
                    className="form-radio text-blue-600"
                  />
                  <span className="mr-2">انتقال بانکی</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="cash_pickup"
                    checked={formData.deliveryMethod === 'cash_pickup'}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryMethod: e.target.value }))}
                    className="form-radio text-blue-600"
                  />
                  <span className="mr-2">دریافت نقدی</span>
                </label>
              </div>
            </div>

            {formData.deliveryMethod === 'bank_transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-200 rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شماره حساب</label>
                  <input
                    type="text"
                    value={formData.beneficiary.bankInfo.accountNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      beneficiary: {
                        ...prev.beneficiary,
                        bankInfo: { ...prev.beneficiary.bankInfo, accountNumber: e.target.value }
                      }
                    }))}
                    className={`w-full border rounded-lg px-3 py-2 ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="شماره حساب بانکی"
                  />
                  {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نام بانک</label>
                  <input
                    type="text"
                    value={formData.beneficiary.bankInfo.bankName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      beneficiary: {
                        ...prev.beneficiary,
                        bankInfo: { ...prev.beneficiary.bankInfo, bankName: e.target.value }
                      }
                    }))}
                    className={`w-full border rounded-lg px-3 py-2 ${errors.bankName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="نام بانک"
                  />
                  {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">کد سوئیفت</label>
                  <input
                    type="text"
                    value={formData.beneficiary.bankInfo.swiftCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      beneficiary: {
                        ...prev.beneficiary,
                        bankInfo: { ...prev.beneficiary.bankInfo, swiftCode: e.target.value }
                      }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="کد سوئیفت (اختیاری)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">شماره روتینگ</label>
                  <input
                    type="text"
                    value={formData.beneficiary.bankInfo.routingNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      beneficiary: {
                        ...prev.beneficiary,
                        bankInfo: { ...prev.beneficiary.bankInfo, routingNumber: e.target.value }
                      }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="شماره روتینگ (اختیاری)"
                  />
                </div>
              </div>
            )}

            {formData.deliveryMethod === 'cash_pickup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">محل دریافت</label>
                <select
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">انتخاب محل دریافت</option>
                  <option value="western_union">وسترن یونیون</option>
                  <option value="moneygram">مانی گرام</option>
                  <option value="partner_bank">بانک همکار</option>
                </select>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">مبلغ و جزئیات ارسال</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ ارسال (ریال)</label>
                <input
                  type="number"
                  value={formData.amount.source}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    amount: { ...prev.amount, source: e.target.value }
                  }))}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.sourceAmount ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="مبلغ به ریال"
                  min="0"
                />
                {errors.sourceAmount && <p className="text-red-500 text-xs mt-1">{errors.sourceAmount}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ارز مقصد</label>
                <select
                  value={formData.amount.targetCurrency}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    amount: { ...prev.amount, targetCurrency: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {countries.map(country => (
                    <option key={country.currency} value={country.currency}>
                      {country.flag} {country.currency} - {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.amount.target && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">محاسبه مبلغ</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>مبلغ دریافتی: <span className="font-bold">{formData.amount.target} {formData.amount.targetCurrency}</span></div>
                  <div>نرخ تبدیل: <span className="font-bold">{formData.exchangeRate.toLocaleString('fa-IR')}</span></div>
                  <div>کارمزد: <span className="font-bold">{formData.fees.toLocaleString('fa-IR')} ریال</span></div>
                  <div>مبلغ کل: <span className="font-bold text-blue-900">{formData.totalCost.toLocaleString('fa-IR')} ریال</span></div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">هدف ارسال حواله</label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 ${errors.purpose ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">انتخاب هدف</option>
                <option value="family_support">حمایت خانواده</option>
                <option value="education">تحصیل</option>
                <option value="medical">درمان</option>
                <option value="business">تجارت</option>
                <option value="investment">سرمایه‌گذاری</option>
                <option value="other">سایر</option>
              </select>
              {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">تایید اطلاعات حواله</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sender Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">اطلاعات فرستنده</h4>
                <div className="space-y-1 text-sm">
                  <div>نام: {formData.sender?.name}</div>
                  <div>کد ملی: {formData.sender?.nationalId}</div>
                  <div>تلفن: {formData.sender?.phone}</div>
                </div>
              </div>

              {/* Beneficiary Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">اطلاعات گیرنده</h4>
                <div className="space-y-1 text-sm">
                  <div>نام: {formData.beneficiary.name}</div>
                  <div>آدرس: {formData.beneficiary.address}</div>
                  {formData.deliveryMethod === 'bank_transfer' && (
                    <>
                      <div>حساب: {formData.beneficiary.bankInfo.accountNumber}</div>
                      <div>بانک: {formData.beneficiary.bankInfo.bankName}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Amount Details */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">جزئیات مالی</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-700">مبلغ ارسال</div>
                  <div className="font-bold">{parseFloat(formData.amount.source).toLocaleString('fa-IR')} ریال</div>
                </div>
                <div>
                  <div className="text-blue-700">مبلغ دریافت</div>
                  <div className="font-bold">{formData.amount.target} {formData.amount.targetCurrency}</div>
                </div>
                <div>
                  <div className="text-blue-700">کارمزد</div>
                  <div className="font-bold">{formData.fees.toLocaleString('fa-IR')} ریال</div>
                </div>
                <div>
                  <div className="text-blue-700">مبلغ کل</div>
                  <div className="font-bold">{formData.totalCost.toLocaleString('fa-IR')} ریال</div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                <strong>توجه:</strong> پس از تایید حواله، مبلغ کل از حساب فرستنده کسر خواهد شد و حواله برای پردازش ارسال می‌شود.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">ارسال حواله بین‌المللی</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>فرستنده</span>
            <span>گیرنده</span>
            <span>مبلغ</span>
            <span>تایید</span>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-4 py-2 rounded-lg ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              قبلی
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                انصراف
              </button>
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  بعدی
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ارسال حواله
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RemittanceForm;