import React, { useState } from 'react';

const CustomerRegistration = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: '',
      lastName: '',
      nationalId: '',
      birthDate: '',
      phone: '',
      email: ''
    },
    address: {
      country: 'ایران',
      city: '',
      street: '',
      postalCode: ''
    },
    bankInfo: {
      accountNumber: '',
      bankName: '',
      iban: ''
    },
    documents: {
      idCard: null,
      bankStatement: null,
      residenceProof: null
    }
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1: // Personal Info
        if (!formData.personalInfo.firstName) newErrors.firstName = 'نام الزامی است';
        if (!formData.personalInfo.lastName) newErrors.lastName = 'نام خانوادگی الزامی است';
        if (!formData.personalInfo.nationalId) newErrors.nationalId = 'کد ملی الزامی است';
        if (!formData.personalInfo.phone) newErrors.phone = 'شماره تلفن الزامی است';
        break;
      case 2: // Address
        if (!formData.address.city) newErrors.city = 'شهر الزامی است';
        if (!formData.address.street) newErrors.street = 'آدرس الزامی است';
        break;
      case 3: // Bank Info
        if (!formData.bankInfo.accountNumber) newErrors.accountNumber = 'شماره حساب الزامی است';
        if (!formData.bankInfo.bankName) newErrors.bankName = 'نام بانک الزامی است';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (field, file) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file
      }
    }));
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
            <h3 className="text-lg font-semibold text-gray-900">اطلاعات شخصی</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام</label>
                <input
                  type="text"
                  value={formData.personalInfo.firstName}
                  onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="نام خود را وارد کنید"
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی</label>
                <input
                  type="text"
                  value={formData.personalInfo.lastName}
                  onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="نام خانوادگی خود را وارد کنید"
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">کد ملی</label>
                <input
                  type="text"
                  value={formData.personalInfo.nationalId}
                  onChange={(e) => handleInputChange('personalInfo', 'nationalId', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.nationalId ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="کد ملی 10 رقمی"
                  maxLength="10"
                />
                {errors.nationalId && <p className="text-red-500 text-xs mt-1">{errors.nationalId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ تولد</label>
                <input
                  type="date"
                  value={formData.personalInfo.birthDate}
                  onChange={(e) => handleInputChange('personalInfo', 'birthDate', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شماره تلفن</label>
                <input
                  type="tel"
                  value={formData.personalInfo.phone}
                  onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="09123456789"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ایمیل (اختیاری)</label>
                <input
                  type="email"
                  value={formData.personalInfo.email}
                  onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="example@email.com"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">آدرس</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">کشور</label>
                <select
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address', 'country', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="ایران">ایران</option>
                  <option value="افغانستان">افغانستان</option>
                  <option value="عراق">عراق</option>
                  <option value="ترکیه">ترکیه</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شهر</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address', 'city', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="نام شهر"
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">آدرس کامل</label>
                <textarea
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address', 'street', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.street ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="آدرس کامل محل سکونت"
                  rows="3"
                />
                {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">کد پستی</label>
                <input
                  type="text"
                  value={formData.address.postalCode}
                  onChange={(e) => handleInputChange('address', 'postalCode', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="کد پستی 10 رقمی"
                  maxLength="10"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">اطلاعات بانکی</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شماره حساب</label>
                <input
                  type="text"
                  value={formData.bankInfo.accountNumber}
                  onChange={(e) => handleInputChange('bankInfo', 'accountNumber', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="شماره حساب بانکی"
                />
                {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام بانک</label>
                <select
                  value={formData.bankInfo.bankName}
                  onChange={(e) => handleInputChange('bankInfo', 'bankName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${errors.bankName ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">انتخاب بانک</option>
                  <option value="ملی">بانک ملی ایران</option>
                  <option value="ملت">بانک ملت</option>
                  <option value="تجارت">بانک تجارت</option>
                  <option value="صادرات">بانک صادرات</option>
                  <option value="پاسارگاد">بانک پاسارگاد</option>
                  <option value="پارسیان">بانک پارسیان</option>
                </select>
                {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">شماره شبا</label>
                <input
                  type="text"
                  value={formData.bankInfo.iban}
                  onChange={(e) => handleInputChange('bankInfo', 'iban', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="IR123456789012345678901234"
                  maxLength="26"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">بارگذاری مدارک</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تصویر کارت ملی (الزامی)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange('idCard', e.target.files[0])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                {formData.documents.idCard && (
                  <p className="text-green-600 text-sm mt-1">✓ {formData.documents.idCard.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">گردش حساب بانکی (اختیاری)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('bankStatement', e.target.files[0])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                {formData.documents.bankStatement && (
                  <p className="text-green-600 text-sm mt-1">✓ {formData.documents.bankStatement.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">گواهی اقامت (اختیاری)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('residenceProof', e.target.files[0])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                {formData.documents.residenceProof && (
                  <p className="text-green-600 text-sm mt-1">✓ {formData.documents.residenceProof.name}</p>
                )}
              </div>
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
          <h2 className="text-xl font-semibold text-gray-900">ثبت مشتری جدید</h2>
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
            <span>اطلاعات شخصی</span>
            <span>آدرس</span>
            <span>اطلاعات بانکی</span>
            <span>مدارک</span>
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
                  ثبت مشتری
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerRegistration;