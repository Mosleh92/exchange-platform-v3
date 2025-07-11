// frontend/src/components/UserManagement/ActivityLog.jsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { securityAPI } from '../../services/api';

const ActivityLog = () => {
    const [activities, setActivities] = useState([]);
    const [filters, setFilters] = useState({
        action: '',
        resource: '',
        userId: '',
        dateRange: 'today',
        status: ''
    });
    const [loading, setLoading] = useState(true);
    const [realTimeEnabled, setRealTimeEnabled] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0
    });
    const wsRef = useRef(null);

    useEffect(() => {
        fetchActivities();
        
        if (realTimeEnabled) {
            setupWebSocket();
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [filters, pagination.page, realTimeEnabled]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const response = await securityAPI.getAuditLogs(filters, pagination.page, pagination.limit);
            setActivities(response.data.logs);
            setPagination(prev => ({
                ...prev,
                total: response.data.total
            }));
        } catch (error) {
            toast.error('خطا در دریافت فعالیت‌ها');
        } finally {
            setLoading(false);
        }
    };

    const setupWebSocket = () => {
        try {
            const wsUrl = `ws://localhost:3000/ws/activity?token=${localStorage.getItem('authToken')}`;
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'activity_update') {
                    setActivities(prev => [data.activity, ...prev.slice(0, 49)]);
                } else if (data.type === 'security_alert') {
                    toast.warning(`هشدار امنیتی: ${data.alert.type}`);
                    // Add security alert to activities with special marking
                    setActivities(prev => [{
                        ...data.alert,
                        id: Date.now(),
                        action: 'SECURITY_ALERT',
                        isAlert: true
                    }, ...prev.slice(0, 49)]);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setRealTimeEnabled(false);
            };

            wsRef.current.onclose = () => {
                if (realTimeEnabled) {
                    // Attempt to reconnect after 5 seconds
                    setTimeout(setupWebSocket, 5000);
                }
            };
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
            setRealTimeEnabled(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const exportActivities = async (format = 'csv') => {
        try {
            await securityAPI.generateSecurityReport(
                getDateRangeStart(),
                new Date(),
                format
            );
            toast.success(`گزارش ${format.toUpperCase()} با موفقیت دانلود شد`);
        } catch (error) {
            toast.error('خطا در تولید گزارش');
        }
    };

    const getDateRangeStart = () => {
        const now = new Date();
        switch (filters.dateRange) {
            case 'today':
                return new Date(now.setHours(0, 0, 0, 0));
            case 'week':
                return new Date(now.setDate(now.getDate() - 7));
            case 'month':
                return new Date(now.setMonth(now.getMonth() - 1));
            default:
                return new Date(now.setHours(0, 0, 0, 0));
        }
    };

    const getActionIcon = (action) => {
        const iconMap = {
            'POST_AUTH': '🔐',
            'DELETE_USER': '❌',
            'PUT_USER': '✏️',
            'GET_REPORT': '📊',
            'POST_TRANSACTION': '💰',
            'SECURITY_ALERT': '🚨'
        };
        return iconMap[action] || '📝';
    };

    const getStatusColor = (status) => {
        return status === 'SUCCESS' ? 'text-green-600' : 'text-red-600';
    };

    const getResourceColor = (resource) => {
        const colorMap = {
            'AUTH': 'bg-blue-100 text-blue-800',
            'USER': 'bg-green-100 text-green-800',
            'TRANSACTION': 'bg-yellow-100 text-yellow-800',
            'REPORT': 'bg-purple-100 text-purple-800',
            'SECURITY': 'bg-red-100 text-red-800'
        };
        return colorMap[resource] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">گزارش فعالیت‌ها</h1>
                <div className="flex gap-3">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={realTimeEnabled}
                            onChange={(e) => setRealTimeEnabled(e.target.checked)}
                            className="rounded"
                        />
                        <span className="text-sm">نمایش زنده</span>
                        {realTimeEnabled && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                    </label>
                    <button
                        onClick={() => exportActivities('csv')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        خروجی CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">فیلترها</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">عملیات</label>
                        <select
                            value={filters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">همه</option>
                            <option value="POST_AUTH">ورود</option>
                            <option value="POST_TRANSACTION">تراکنش</option>
                            <option value="GET_REPORT">گزارش</option>
                            <option value="PUT_USER">ویرایش کاربر</option>
                            <option value="DELETE_USER">حذف کاربر</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">منبع</label>
                        <select
                            value={filters.resource}
                            onChange={(e) => handleFilterChange('resource', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">همه</option>
                            <option value="AUTH">احراز هویت</option>
                            <option value="USER">کاربر</option>
                            <option value="TRANSACTION">تراکنش</option>
                            <option value="REPORT">گزارش</option>
                            <option value="SECURITY">امنیت</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">وضعیت</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">همه</option>
                            <option value="SUCCESS">موفق</option>
                            <option value="FAILURE">ناموفق</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">بازه زمانی</label>
                        <select
                            value={filters.dateRange}
                            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="today">امروز</option>
                            <option value="week">هفته گذشته</option>
                            <option value="month">ماه گذشته</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">کاربر</label>
                        <input
                            type="text"
                            value={filters.userId}
                            onChange={(e) => handleFilterChange('userId', e.target.value)}
                            placeholder="شناسه کاربر"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Activity List */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">فعالیت‌های اخیر</h3>
                    <p className="text-sm text-gray-600">
                        نمایش {activities.length} از {pagination.total} فعالیت
                    </p>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">در حال بارگذاری...</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        هیچ فعالیتی یافت نشد
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        عملیات
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        منبع
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        کاربر
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        وضعیت
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        زمان
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        مدت زمان
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {activities.map((activity, index) => (
                                    <tr 
                                        key={activity.id || index}
                                        className={`hover:bg-gray-50 ${activity.isAlert ? 'bg-red-50 border-l-4 border-red-500' : ''}`}
                                    >
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className="text-lg mr-2">
                                                    {getActionIcon(activity.action)}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {activity.action}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResourceColor(activity.resource)}`}>
                                                {activity.resource}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {activity.userId || 'ناشناس'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {activity.ip}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-medium ${getStatusColor(activity.status)}`}>
                                                {activity.status === 'SUCCESS' ? 'موفق' : 'ناموفق'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(activity.timestamp || activity.createdAt).toLocaleString('fa-IR')}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {activity.duration ? `${activity.duration}ms` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                قبلی
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page * pagination.limit >= pagination.total}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                بعدی
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    نمایش{' '}
                                    <span className="font-medium">
                                        {(pagination.page - 1) * pagination.limit + 1}
                                    </span>{' '}
                                    تا{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span>{' '}
                                    از{' '}
                                    <span className="font-medium">{pagination.total}</span> نتیجه
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        قبلی
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page * pagination.limit >= pagination.total}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        بعدی
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;