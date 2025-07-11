// frontend/src/components/Security/TwoFactorInput.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { securityAPI } from '../../services/api';

const TwoFactorInput = ({ onVerification, isRequired = false }) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [method, setMethod] = useState('totp'); // 'totp' or 'sms'
    const [smsCountdown, setSmsCountdown] = useState(0);
    const [canResendSMS, setCanResendSMS] = useState(true);

    useEffect(() => {
        let interval;
        if (smsCountdown > 0) {
            interval = setInterval(() => {
                setSmsCountdown(prev => prev - 1);
            }, 1000);
        } else if (smsCountdown === 0 && !canResendSMS) {
            setCanResendSMS(true);
        }
        return () => clearInterval(interval);
    }, [smsCountdown, canResendSMS]);

    const handleVerify = async () => {
        if (!verificationCode || verificationCode.length < 4) {
            toast.error('کد را کامل وارد کنید');
            return;
        }

        setIsLoading(true);
        try {
            let isValid = false;
            
            if (method === 'sms') {
                isValid = await securityAPI.verifySMSCode(verificationCode);
            } else {
                isValid = await securityAPI.verify2FAToken(verificationCode);
            }

            if (isValid.data.valid) {
                toast.success('تایید با موفقیت انجام شد');
                onVerification(true);
            } else {
                toast.error('کد نامعتبر است');
                setVerificationCode('');
            }
        } catch (error) {
            toast.error(method === 'sms' ? 'کد SMS نامعتبر است' : 'کد 2FA نامعتبر است');
            setVerificationCode('');
        } finally {
            setIsLoading(false);
        }
    };

    const sendSMSCode = async () => {
        if (!canResendSMS) return;

        setIsLoading(true);
        try {
            await securityAPI.generateSMSCode();
            toast.success('کد به شماره شما ارسال شد');
            setSmsCountdown(60); // 60 seconds countdown
            setCanResendSMS(false);
        } catch (error) {
            toast.error('خطا در ارسال کد');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleVerify();
        }
    };

    if (isRequired) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3 text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                            احراز هویت الزامی
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            برای ادامه، کد تایید را وارد کنید
                        </p>
                        <TwoFactorVerificationForm />
                    </div>
                </div>
            </div>
        );
    }

    const TwoFactorVerificationForm = () => (
        <div className="space-y-4">
            {/* Method Selection */}
            <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                    onClick={() => setMethod('totp')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        method === 'totp' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Google Authenticator
                </button>
                <button
                    onClick={() => setMethod('sms')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        method === 'sms' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    پیامک
                </button>
            </div>

            {/* SMS Code Request */}
            {method === 'sms' && (
                <div className="text-center">
                    <button
                        onClick={sendSMSCode}
                        disabled={!canResendSMS || isLoading}
                        className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
                            canResendSMS && !isLoading
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {isLoading ? 'در حال ارسال...' : 
                         !canResendSMS ? `ارسال مجدد (${smsCountdown}s)` : 
                         'ارسال کد تایید'}
                    </button>
                </div>
            )}

            {/* Code Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {method === 'sms' ? 'کد پیامکی' : 'کد Google Authenticator'}
                </label>
                <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, method === 'sms' ? 6 : 6))}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                    placeholder={method === 'sms' ? '123456' : '123456'}
                    maxLength={6}
                    autoComplete="off"
                />
            </div>

            {/* Verification Button */}
            <button
                onClick={handleVerify}
                disabled={isLoading || verificationCode.length < 4}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? 'در حال تایید...' : 'تایید'}
            </button>

            {/* Backup Code Option */}
            <div className="text-center">
                <button
                    onClick={() => {
                        const backupCode = prompt('کد بازیابی خود را وارد کنید:');
                        if (backupCode) {
                            setVerificationCode(backupCode);
                            setMethod('backup');
                        }
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                    استفاده از کد بازیابی
                </button>
            </div>
        </div>
    );

    return (
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-center mb-6">تایید هویت</h3>
            <TwoFactorVerificationForm />
        </div>
    );
};

export default TwoFactorInput;