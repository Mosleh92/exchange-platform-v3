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
