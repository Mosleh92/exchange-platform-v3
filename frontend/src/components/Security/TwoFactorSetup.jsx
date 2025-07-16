// frontend/src/components/Security/TwoFactorSetup.jsx
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { toast } from 'react-toastify';
import { securityAPI } from '../../services/api';

const TwoFactorSetup = () => {
    const [step, setStep] = useState(1);
    const [qrCodeData, setQrCodeData] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const generateSecret = async () => {
        setIsLoading(true);
        try {
            const response = await securityAPI.generate2FASecret();
            setSecret(response.data.secret);
            setQrCodeData(response.data.qrCode);
            setStep(2);
        } catch (error) {
            toast.error('خطا در تولید رمز 2FA');
        } finally {
            setIsLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            toast.error('کد 6 رقمی وارد کنید');
            return;
        }

        setIsLoading(true);
        try {
            const response = await securityAPI.verifyAndEnable2FA(verificationCode);
            setBackupCodes(response.data.backupCodes);
            setStep(3);
            toast.success('دو عاملی احراز هویت فعال شد');
        } catch (error) {
            toast.error('کد نامعتبر است');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadBackupCodes = () => {
        const element = document.createElement('a');
        const file = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = 'backup-codes-2fa.txt';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                تنظیم دو عاملی احراز هویت
            </h2>

            {step === 1 && (
                <div className="text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 mb-4">
                            برای افزایش امنیت حساب خود، دو عاملی احراز هویت را فعال کنید
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            نیاز به نصب Google Authenticator یا Authy دارید
                        </p>
                    </div>
                    <button
                        onClick={generateSecret}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? 'در حال تولید...' : 'شروع تنظیم'}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div>
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold mb-4">اسکن کد QR</h3>
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                            <QRCode value={qrCodeData} size={200} />
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            یا کد دستی وارد کنید:
                        </label>
                        <div className="bg-gray-100 p-3 rounded-md font-mono text-sm break-all">
                            {secret}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            کد تأیید از اپلیکیشن:
                        </label>
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="123456"
                            maxLength={6}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                        >
                            بازگشت
                        </button>
                        <button
                            onClick={verifyAndEnable}
                            disabled={isLoading || verificationCode.length !== 6}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                            {isLoading ? 'در حال تأیید...' : 'تأیید و فعال‌سازی'}
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-green-600 mb-2">تبریک!</h3>
                        <p className="text-gray-600 mb-4">
                            دو عاملی احراز هویت با موفقیت فعال شد
                        </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                        <h4 className="font-semibold text-yellow-800 mb-2">کدهای بازیابی</h4>
                        <p className="text-sm text-yellow-700 mb-3">
                            این کدها را در جای امن نگهداری کنید. در صورت از دست دادن دستگاه نیاز خواهید داشت.
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {backupCodes.map((code, index) => (
                                <div key={index} className="bg-white p-2 rounded border font-mono text-xs">
                                    {code}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={downloadBackupCodes}
                            className="text-sm bg-yellow-200 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-300"
                        >
                            دانلود کدها
                        </button>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                        تمام
                    </button>
                </div>
            )}
        </div>
    );
};

// Security Dashboard Component
const SecurityDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await securityAPI.getSecurityDashboard();
            setDashboardData(response.data);
        } catch (error) {
            toast.error('خطا در دریافت داشبورد امنیتی');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-6">در حال بارگذاری...</div>;
    }

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBg = (score) => {
        if (score >= 80) return 'bg-green-100';
        if (score >= 60) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">داشبورد امنیتی</h1>

            {/* Security Score */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">امتیاز امنیتی</h2>
                        <p className="text-gray-600">وضعیت کلی امنیت حساب شما</p>
                    </div>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center ${getScoreBg(dashboardData.securityScore)}`}>
                        <span className={`text-2xl font-bold ${getScoreColor(dashboardData.securityScore)}`}>
                            {dashboardData.securityScore}
                        </span>
                    </div>
                </div>
            </div>

            {/* Recent Security Alerts */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">هشدارهای امنیتی اخیر</h3>
                {dashboardData.recentAlerts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">هیچ هشدار امنیتی وجود ندارد</p>
                ) : (
                    <div className="space-y-3">
                        {dashboardData.recentAlerts.map((alert, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-3 ${
                                        alert.action === 'SUSPICIOUS_IP_ACTIVITY' ? 'bg-red-500' :
                                        alert.action === 'NEW_DEVICE_DETECTED' ? 'bg-yellow-500' :
                                        'bg-gray-500'
                                    }`}></div>
                                    <span className="text-sm text-gray-800">{alert.details}</span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date(alert.createdAt).toLocaleString('fa-IR')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Activity Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">فعالیت روزانه</h3>
                <div className="grid grid-cols-7 gap-2">
                    {dashboardData.dailyActivity.map((day, index) => (
                        <div key={index} className="text-center">
                            <div className="text-xs text-gray-500 mb-1">
                                {new Date(day._id).toLocaleDateString('fa-IR', { weekday: 'short' })}
                            </div>
                            <div className="bg-blue-100 rounded-md p-2">
                                <div className="text-sm font-semibold text-blue-800">{day.count}</div>
                                <div className="text-xs text-blue-600">فعالیت</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// IP Whitelist Management Component
const IPWhitelistManager = () => {
    const [ipList, setIpList] = useState([]);
    const [newIP, setNewIP] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchIPList();
    }, []);

    const fetchIPList = async () => {
        try {
            const response = await securityAPI.getIPWhitelist();
            setIpList(response.data);
        } catch (error) {
            toast.error('خطا در دریافت لیست IP');
        }
    };

    const addIP = async () => {
        if (!newIP.trim()) {
            toast.error('آدرس IP را وارد کنید');
            return;
        }

        setIsLoading(true);
        try {
            await securityAPI.addIPToWhitelist(newIP, description);
            toast.success('IP با موفقیت اضافه شد');
            setNewIP('');
            setDescription('');
            fetchIPList();
        } catch (error) {
            toast.error('خطا در اضافه کردن IP');
        } finally {
            setIsLoading(false);
        }
    };

    const removeIP = async (ip) => {
        if (!confirm(`آیا مطمئن هستید که می‌خواهید IP ${ip} را حذف کنید؟`)) {
            return;
        }

        try {
            await securityAPI.removeIPFromWhitelist(ip);
            toast.success('IP با موفقیت حذف شد');
            fetchIPList();
        } catch (error) {
            toast.error('خطا در حذف IP');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">مدیریت لیست سفید IP</h2>

            {/* Add New IP */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">اضافه کردن IP جدید</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">آدرس IP</label>
                        <input
                            type="text"
                            value={newIP}
                            onChange={(e) => setNewIP(e.target.value)}
                            placeholder="192.168.1.1 یا 192.168.1.0/24"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">توضیحات</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="دفتر مرکزی"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={addIP}
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'در حال اضافه...' : 'اضافه کردن'}
                        </button>
                    </div>
                </div>
            </div>

            {/* IP List */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">IP های مجاز</h3>
                {ipList.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">هیچ IP در لیست سفید وجود ندارد</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-right">آدرس IP</th>
                                    <th className="px-4 py-2 text-right">توضیحات</th>
                                    <th className="px-4 py-2 text-right">تاریخ اضافه</th>
                                    <th className="px-4 py-2 text-center">عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ipList.map((item, index) => (
                                    <tr key={index} className="border-t">
                                        <td className="px-4 py-2 font-mono">{item.ip}</td>
                                        <td className="px-4 py-2">{item.description}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">
                                            {new Date(item.addedAt).toLocaleDateString('fa-IR')}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={() => removeIP(item.ip)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// Security Settings Component
const SecuritySettings = () => {
    const [settings, setSettings] = useState({
        ipWhitelistEnabled: false,
        deviceTrackingEnabled: true,
        loginNotifications: {
            email: true,
            sms: false
        },
        securityAlerts: {
            email: true,
            sms: true
        }
    });
    const [isLoading, setIsLoading] = useState(false);

    const updateSettings = async () => {
        setIsLoading(true);
        try {
            await securityAPI.updateSecuritySettings(settings);
            toast.success('تنظیمات با موفقیت به‌روزرسانی شد');
        } catch (error) {
            toast.error('خطا در به‌روزرسانی تنظیمات');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (path, value) => {
        setSettings(prev => {
            const newSettings = { ...prev };
            const keys = path.split('.');
            let current = newSettings;
            
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
            return newSettings;
        });
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">تنظیمات امنیتی</h2>

            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                {/* IP Whitelist */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-800">لیست سفید IP</h3>
                        <p className="text-sm text-gray-600">محدود کردن دسترسی به IP های مشخص</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.ipWhitelistEnabled}
                            onChange={(e) => handleChange('ipWhitelistEnabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Device Tracking */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-800">ردیابی دستگاه</h3>
                        <p className="text-sm text-gray-600">شناسایی و ردیابی دستگاه‌های جدید</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.deviceTrackingEnabled}
                            onChange={(e) => handleChange('deviceTrackingEnabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Login Notifications */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3">اطلاع‌رسانی ورود</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">ایمیل</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.loginNotifications.email}
                                    onChange={(e) => handleChange('loginNotifications.email', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">پیامک</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.loginNotifications.sms}
                                    onChange={(e) => handleChange('loginNotifications.sms', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Security Alerts */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3">هشدارهای امنیتی</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">ایمیل</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.securityAlerts.email}
                                    onChange={(e) => handleChange('securityAlerts.email', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">پیامک</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.securityAlerts.sms}
                                    onChange={(e) => handleChange('securityAlerts.sms', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t">
                    <button
                        onClick={updateSettings}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export { TwoFactorSetup, SecurityDashboard, IPWhitelistManager, SecuritySettings };

            {/* Security Features Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">دو عاملی احراز هویت</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            dashboardData.twoFactorAuth.enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {dashboardData.twoFactorAuth.enabled ? 'فعال' : 'غیرفعال'}
                        </span>
                    </div>
                    {dashboardData.twoFactorAuth.enabled && (
                        <p className="text-sm text-gray-600">
                            کدهای بازیابی: {dashboardData.twoFactorAuth.backupCodesCount}
                        </p>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">لیست سفید IP</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            dashboardData.ipWhitelist.enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {dashboardData.ipWhitelist.enabled ? 'فعال' : 'غیرفعال'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        تعداد IP: {dashboardData.ipWhitelist.count}
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">امضای دیجیتال</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                            dashboardData.digitalSignature.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {dashboardData.digitalSignature.isActive ? 'فعال' : 'غیرفعال'}
                        </span>
                    </div>
                    {dashboardData.digitalSignature.keyGeneratedAt && (
                        <p className="text-sm text-gray-600">
                            تولید: {new Date(dashboardData.digitalSignature.keyGeneratedAt).toLocaleDateString('fa-IR')}
                        </p>
                    )}
