// frontend/src/components/Security/SecurityDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { securityAPI } from '../../services/securityAPI';

const SecurityDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [realTimeStats, setRealTimeStats] = useState({
        activeUsers: 0,
        successfulLogins: 0,
        failedLogins: 0,
        suspiciousActivity: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const wsRef = useRef(null);

    useEffect(() => {
        fetchDashboard();
        setupWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await securityAPI.getSecurityDashboard();
            setDashboardData(response.data);
            setAlerts(response.data.recentAlerts || []);
        } catch (error) {
            toast.error('خطا در دریافت داشبورد امنیتی');
        } finally {
            setLoading(false);
        }
    };

    const setupWebSocket = () => {
        try {
            const wsUrl = `ws://localhost:3000/ws/security?token=${localStorage.getItem('authToken')}`;
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'security_alert') {
                    const newAlert = data.alert;
                    setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep latest 10 alerts
                    
                    // Show toast for high severity alerts
                    if (newAlert.severity === 'HIGH') {
                        toast.error(`هشدار امنیتی: ${newAlert.type}`);
                    }
                } else if (data.type === 'stats_update') {
                    setRealTimeStats(data.stats);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('Security WebSocket error:', error);
            };

            wsRef.current.onclose = () => {
                // Attempt to reconnect after 5 seconds
                setTimeout(setupWebSocket, 5000);
            };
        } catch (error) {
            console.error('Failed to setup security WebSocket:', error);
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

    const getSeverityColor = (severity) => {
        const colors = {
            'HIGH': 'bg-red-100 text-red-800 border-red-200',
            'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'LOW': 'bg-blue-100 text-blue-800 border-blue-200'
        };
        return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getAlertIcon = (type) => {
        const icons = {
            'MULTIPLE_FAILED_LOGINS': '🚫',
            'UNAUTHORIZED_ACCESS': '⚠️',
            'SUSPICIOUS_IP_ACTIVITY': '🌐',
            'HIGH_REQUEST_FREQUENCY': '⚡',
            'SENSITIVE_ENDPOINT_ACCESS': '🔒',
            'NEW_DEVICE_DETECTED': '📱'
        };
        return icons[type] || '🚨';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">داشبورد امنیتی</h1>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">نمایش زنده</span>
                </div>
            </div>

            {/* Security Score Card */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">امتیاز امنیتی</h2>
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${getScoreBg(dashboardData?.securityScore || 0)}`}>
                                <span className={`text-3xl font-bold ${getScoreColor(dashboardData?.securityScore || 0)}`}>
                                    {dashboardData?.securityScore || 0}
                                </span>
                            </div>
                            <p className="text-gray-600">وضعیت کلی امنیت سیستم</p>
                        </div>
                    </div>
                </div>

                {/* Real-time Stats */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-600">👥</span>
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-600">کاربران آنلاین</p>
                                    <p className="text-2xl font-bold text-gray-900">{realTimeStats.activeUsers}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <span className="text-green-600">✅</span>
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-600">ورود موفق</p>
                                    <p className="text-2xl font-bold text-gray-900">{realTimeStats.successfulLogins}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                        <span className="text-red-600">❌</span>
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-600">ورود ناموفق</p>
                                    <p className="text-2xl font-bold text-gray-900">{realTimeStats.failedLogins}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                        <span className="text-yellow-600">⚠️</span>
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-600">فعالیت مشکوک</p>
                                    <p className="text-2xl font-bold text-gray-900">{realTimeStats.suspiciousActivity}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Features Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">دو عاملی احراز هویت</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            dashboardData?.twoFactorAuth?.enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {dashboardData?.twoFactorAuth?.enabled ? 'فعال' : 'غیرفعال'}
                        </span>
                    </div>
                    {dashboardData?.twoFactorAuth?.enabled && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                                کاربران فعال: {dashboardData.twoFactorAuth.activeUsers || 0}
                            </p>
                            <p className="text-sm text-gray-600">
                                کدهای بازیابی: {dashboardData.twoFactorAuth.backupCodesCount || 0}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">لیست سفید IP</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            dashboardData?.ipWhitelist?.enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {dashboardData?.ipWhitelist?.enabled ? 'فعال' : 'غیرفعال'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        تعداد IP های مجاز: {dashboardData?.ipWhitelist?.count || 0}
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">محدودیت نرخ</h3>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            فعال
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        درخواست‌های محدود شده: {dashboardData?.rateLimiting?.blockedRequests || 0}
                    </p>
                </div>
            </div>

            {/* Recent Security Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">هشدارهای امنیتی اخیر</h3>
                    {alerts.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">هیچ هشدار امنیتی وجود ندارد</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {alerts.map((alert, index) => (
                                <div 
                                    key={index} 
                                    className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(alert.severity)}`}
                                    onClick={() => setSelectedAlert(alert)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center">
                                            <span className="text-lg mr-3">
                                                {getAlertIcon(alert.type)}
                                            </span>
                                            <div>
                                                <h4 className="font-semibold text-sm">{alert.type}</h4>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    {alert.details?.ip && `IP: ${alert.details.ip}`}
                                                    {alert.details?.userId && ` | کاربر: ${alert.details.userId}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getSeverityColor(alert.severity)}`}>
                                                {alert.severity}
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(alert.timestamp).toLocaleString('fa-IR')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* System Health */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">وضعیت سیستم</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">پایگاه داده</span>
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-sm font-medium text-green-600">آنلاین</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Redis Cache</span>
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-sm font-medium text-green-600">آنلاین</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">WebSocket</span>
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-sm font-medium text-green-600">متصل</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">SSL Certificate</span>
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-sm font-medium text-green-600">معتبر</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="text-sm text-gray-600 mb-2">CPU Usage</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">35%</div>
                        </div>

                        <div>
                            <div className="text-sm text-gray-600 mb-2">Memory Usage</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">62%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert Detail Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">جزئیات هشدار</h3>
                                <button
                                    onClick={() => setSelectedAlert(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">نوع هشدار</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedAlert.type}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">سطح خطر</label>
                                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded ${getSeverityColor(selectedAlert.severity)}`}>
                                        {selectedAlert.severity}
                                    </span>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">زمان</label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {new Date(selectedAlert.timestamp).toLocaleString('fa-IR')}
                                    </p>
                                </div>
                                
                                {selectedAlert.details && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">جزئیات</label>
                                        <div className="mt-1 text-sm text-gray-900">
                                            {Object.entries(selectedAlert.details).map(([key, value]) => (
                                                <p key={key}><strong>{key}:</strong> {value}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6">
                                <button
                                    onClick={() => setSelectedAlert(null)}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                                >
                                    بستن
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityDashboard;