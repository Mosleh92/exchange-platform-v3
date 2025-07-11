// frontend/src/components/TenantManagement/TenantCreationWizard.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';

const TenantCreationWizard = ({ onComplete, onCancel }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Basic Info
        name: '',
        subdomain: '',
        adminEmail: '',
        adminPhone: '',
        
        // Business Details
        businessType: 'exchange',
        currency: 'USD',
        plan: 'basic',
        maxUsers: 10,
        
        // Configuration
        features: {
            p2p: false,
            remittance: false,
            crypto: false,
            reports: true,
            api: false
        },
        branding: {
            logo: null,
            primaryColor: '#3b82f6',
            secondaryColor: '#64748b'
        },
        
        // Admin User
        adminFirstName: '',
        adminLastName: '',
        adminPassword: '',
        adminConfirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const steps = [
        { id: 1, title: 'اطلاعات پایه', description: 'نام صرافی و دامنه' },
        { id: 2, title: 'جزئیات کسب و کار', description: 'نوع کسب و کار و پلن' },
        { id: 3, title: 'تنظیمات', description: 'ویژگی‌ها و برندینگ' },
        { id: 4, title: 'کاربر مدیر', description: 'ایجاد حساب مدیر' },
        { id: 5, title: 'تأیید نهایی', description: 'بررسی و تأیید' }
    ];

    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleFeatureToggle = (feature) => {
        setFormData(prev => ({
            ...prev,
            features: {
                ...prev.features,
                [feature]: !prev.features[feature]
            }
        }));
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                return formData.name && formData.subdomain && formData.adminEmail && formData.adminPhone;
            case 2:
                return formData.businessType && formData.currency && formData.plan;
            case 3:
                return true; // Optional fields
            case 4:
                return formData.adminFirstName && formData.adminLastName && 
                       formData.adminPassword && formData.adminPassword === formData.adminConfirmPassword;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        } else {
            toast.error('لطفاً تمام فیلدهای الزامی را تکمیل کنید');
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(4)) {
            toast.error('لطفاً تمام فیلدهای الزامی را تکمیل کنید');
            return;
        }

        setLoading(true);
        try {
            // Mock API call - replace with actual API
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            toast.success('صرافی با موفقیت ایجاد شد');
            onComplete && onComplete(formData);
        } catch (error) {
            toast.error('خطا در ایجاد صرافی');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                نام صرافی *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="نام صرافی خود را وارد کنید"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                دامنه فرعی *
                            </label>
                            <div className="flex">
                                <input
                                    type="text"
                                    value={formData.subdomain}
                                    onChange={(e) => handleInputChange('subdomain', e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="mydomain"
                                />
                                <span className="px-4 py-2 bg-gray-100 border border-gray-300 border-r-0 rounded-l-md text-gray-500">
                                    .exchange.ir
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ایمیل مدیر *
                            </label>
                            <input
                                type="email"
                                value={formData.adminEmail}
                                onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="admin@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                شماره تماس مدیر *
                            </label>
                            <input
                                type="tel"
                                value={formData.adminPhone}
                                onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="09123456789"
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                نوع کسب و کار *
                            </label>
                            <select
                                value={formData.businessType}
                                onChange={(e) => handleInputChange('businessType', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="exchange">صرافی</option>
                                <option value="remittance">حواله</option>
                                <option value="crypto">رمزارز</option>
                                <option value="mixed">ترکیبی</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ارز پایه *
                            </label>
                            <select
                                value={formData.currency}
                                onChange={(e) => handleInputChange('currency', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="USD">دلار آمریکا (USD)</option>
                                <option value="EUR">یورو (EUR)</option>
                                <option value="AED">درهم امارات (AED)</option>
                                <option value="TRY">لیر ترکیه (TRY)</option>
                                <option value="IRR">ریال ایران (IRR)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-4">
                                پلن اشتراک *
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'basic', name: 'پایه', price: '49', users: '10', features: ['گزارش‌گیری پایه', 'پشتیبانی ایمیل'] },
                                    { id: 'professional', name: 'حرفه‌ای', price: '99', users: '50', features: ['تمام ویژگی‌ها', 'پشتیبانی تلفنی', 'API دسترسی'] },
                                    { id: 'enterprise', name: 'سازمانی', price: '199', users: 'نامحدود', features: ['تمام ویژگی‌ها', 'پشتیبانی اختصاصی', 'برندینگ سفارشی'] }
                                ].map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                            formData.plan === plan.id 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => handleInputChange('plan', plan.id)}
                                    >
                                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                                        <p className="text-2xl font-bold text-blue-600">${plan.price}/ماه</p>
                                        <p className="text-sm text-gray-600">تا {plan.users} کاربر</p>
                                        <ul className="mt-2 text-sm text-gray-600">
                                            {plan.features.map((feature, index) => (
                                                <li key={index}>• {feature}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">ویژگی‌های سیستم</h3>
                            <div className="space-y-3">
                                {[
                                    { key: 'p2p', label: 'معاملات P2P', description: 'معاملات نفر به نفر' },
                                    { key: 'remittance', label: 'حواله', description: 'سیستم ارسال حواله' },
                                    { key: 'crypto', label: 'رمزارز', description: 'معاملات رمزارز' },
                                    { key: 'reports', label: 'گزارش‌گیری', description: 'سیستم گزارش‌گیری پیشرفته' },
                                    { key: 'api', label: 'API', description: 'دسترسی به API' }
                                ].map((feature) => (
                                    <div key={feature.key} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <h4 className="font-medium">{feature.label}</h4>
                                            <p className="text-sm text-gray-600">{feature.description}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.features[feature.key]}
                                                onChange={() => handleFeatureToggle(feature.key)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4">برندینگ</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        رنگ اصلی
                                    </label>
                                    <input
                                        type="color"
                                        value={formData.branding.primaryColor}
                                        onChange={(e) => handleInputChange('branding.primaryColor', e.target.value)}
                                        className="w-20 h-10 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        رنگ فرعی
                                    </label>
                                    <input
                                        type="color"
                                        value={formData.branding.secondaryColor}
                                        onChange={(e) => handleInputChange('branding.secondaryColor', e.target.value)}
                                        className="w-20 h-10 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    نام *
                                </label>
                                <input
                                    type="text"
                                    value={formData.adminFirstName}
                                    onChange={(e) => handleInputChange('adminFirstName', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    نام خانوادگی *
                                </label>
                                <input
                                    type="text"
                                    value={formData.adminLastName}
                                    onChange={(e) => handleInputChange('adminLastName', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                رمز عبور *
                            </label>
                            <input
                                type="password"
                                value={formData.adminPassword}
                                onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="حداقل 8 کاراکتر"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                تکرار رمز عبور *
                            </label>
                            <input
                                type="password"
                                value={formData.adminConfirmPassword}
                                onChange={(e) => handleInputChange('adminConfirmPassword', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    formData.adminPassword && formData.adminConfirmPassword && 
                                    formData.adminPassword !== formData.adminConfirmPassword 
                                        ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {formData.adminPassword && formData.adminConfirmPassword && 
                             formData.adminPassword !== formData.adminConfirmPassword && (
                                <p className="text-red-500 text-sm mt-1">رمزهای عبور یکسان نیستند</p>
                            )}
                        </div>
                    </div>
                );

            case 5:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">بررسی نهایی</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-900">اطلاعات صرافی</h4>
                                <div className="space-y-2 text-sm">
                                    <p><span className="font-medium">نام:</span> {formData.name}</p>
                                    <p><span className="font-medium">دامنه:</span> {formData.subdomain}.exchange.ir</p>
                                    <p><span className="font-medium">نوع کسب و کار:</span> {formData.businessType}</p>
                                    <p><span className="font-medium">ارز پایه:</span> {formData.currency}</p>
                                    <p><span className="font-medium">پلن:</span> {formData.plan}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-900">کاربر مدیر</h4>
                                <div className="space-y-2 text-sm">
                                    <p><span className="font-medium">نام:</span> {formData.adminFirstName} {formData.adminLastName}</p>
                                    <p><span className="font-medium">ایمیل:</span> {formData.adminEmail}</p>
                                    <p><span className="font-medium">شماره تماس:</span> {formData.adminPhone}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">ویژگی‌های فعال</h4>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(formData.features)
                                    .filter(([key, value]) => value)
                                    .map(([key, value]) => (
                                        <span key={key} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                            {key}
                                        </span>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <h1 className="text-2xl font-bold">ایجاد صرافی جدید</h1>
                    <p className="text-blue-100 mt-2">راه‌اندازی سریع و آسان صرافی</p>
                </div>

                {/* Progress Steps */}
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        {steps.map((step) => (
                            <div key={step.id} className="flex items-center">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                                    ${currentStep >= step.id 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-200 text-gray-600'
                                    }
                                `}>
                                    {currentStep > step.id ? '✓' : step.id}
                                </div>
                                <div className="ml-3 hidden md:block">
                                    <p className="text-sm font-medium text-gray-900">{step.title}</p>
                                    <p className="text-xs text-gray-500">{step.description}</p>
                                </div>
                                {step.id < steps.length && (
                                    <div className={`
                                        hidden md:block w-16 h-1 mx-4
                                        ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}
                                    `} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 min-h-96">
                    <h2 className="text-xl font-semibold mb-6">{steps[currentStep - 1]?.title}</h2>
                    {renderStepContent()}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between">
                    <div>
                        {currentStep > 1 && (
                            <button
                                onClick={prevStep}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                            >
                                قبلی
                            </button>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                            انصراف
                        </button>
                        
                        {currentStep < steps.length ? (
                            <button
                                onClick={nextStep}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                بعدی
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                {loading ? 'در حال ایجاد...' : 'ایجاد صرافی'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantCreationWizard;