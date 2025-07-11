import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useStateSync } from '../../contexts/StateSyncContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import api from '../../services/api';
import config from '../../utils/apiConfig';

/**
 * Integration Test Component
 * Tests all system connections and integrations
 */
const IntegrationTest = ({ onComplete }) => {
  const [tests, setTests] = useState({
    api: { status: 'pending', message: 'در حال تست API...' },
    websocket: { status: 'pending', message: 'در حال تست WebSocket...' },
    auth: { status: 'pending', message: 'در حال تست احراز هویت...' },
    tenant: { status: 'pending', message: 'در حال تست Tenant...' },
    database: { status: 'pending', message: 'در حال تست پایگاه داده...' },
    fileUpload: { status: 'pending', message: 'در حال تست آپلود فایل...' },
    realtime: { status: 'pending', message: 'در حال تست Real-time...' }
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState('pending');
  const [details, setDetails] = useState({});

  const { user, isAuthenticated } = useAuth();
  const { tenant } = useTenant();
  const { isConnected: wsConnected } = useWebSocket();
  const { isSyncing } = useStateSync();

  // Test API connectivity
  const testAPI = async () => {
    try {
      const startTime = Date.now();
      const response = await api.get('/api/health');
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.status === 200) {
        setTests(prev => ({
          ...prev,
          api: {
            status: 'success',
            message: `API متصل است (${latency}ms)`,
            details: {
              latency,
              status: response.status,
              data: response.data
            }
          }
        }));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        api: {
          status: 'error',
          message: `خطا در اتصال API: ${error.message}`,
          details: { error: error.message }
        }
      }));
    }
  };

  // Test WebSocket connectivity
  const testWebSocket = () => {
    if (wsConnected) {
      setTests(prev => ({
        ...prev,
        websocket: {
          status: 'success',
          message: 'WebSocket متصل است',
          details: { connected: true }
        }
      }));
    } else {
      setTests(prev => ({
        ...prev,
        websocket: {
          status: 'error',
          message: 'WebSocket قطع است',
          details: { connected: false }
        }
      }));
    }
  };

  // Test authentication
  const testAuth = () => {
    if (isAuthenticated && user) {
      setTests(prev => ({
        ...prev,
        auth: {
          status: 'success',
          message: `کاربر احراز هویت شده: ${user.email}`,
          details: {
            userId: user.id,
            email: user.email,
            role: user.role
          }
        }
      }));
    } else {
      setTests(prev => ({
        ...prev,
        auth: {
          status: 'error',
          message: 'کاربر احراز هویت نشده',
          details: { authenticated: false }
        }
      }));
    }
  };

  // Test tenant access
  const testTenant = () => {
    if (tenant) {
      setTests(prev => ({
        ...prev,
        tenant: {
          status: 'success',
          message: `Tenant فعال: ${tenant.name}`,
          details: {
            tenantId: tenant.id,
            name: tenant.name,
            status: tenant.status
          }
        }
      }));
    } else {
      setTests(prev => ({
        ...prev,
        tenant: {
          status: 'error',
          message: 'Tenant یافت نشد',
          details: { tenant: null }
        }
      }));
    }
  };

  // Test database connectivity
  const testDatabase = async () => {
    try {
      const response = await api.get('/api/health/database');
      if (response.data.status === 'connected') {
        setTests(prev => ({
          ...prev,
          database: {
            status: 'success',
            message: 'پایگاه داده متصل است',
            details: response.data
          }
        }));
      } else {
        throw new Error('Database not connected');
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        database: {
          status: 'error',
          message: `خطا در اتصال پایگاه داده: ${error.message}`,
          details: { error: error.message }
        }
      }));
    }
  };

  // Test file upload
  const testFileUpload = async () => {
    try {
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', testFile);

      const response = await api.post('/api/test/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.status === 200) {
        setTests(prev => ({
          ...prev,
          fileUpload: {
            status: 'success',
            message: 'آپلود فایل کار می‌کند',
            details: response.data
          }
        }));
      } else {
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        fileUpload: {
          status: 'error',
          message: `خطا در آپلود فایل: ${error.message}`,
          details: { error: error.message }
        }
      }));
    }
  };

  // Test real-time functionality
  const testRealtime = () => {
    if (wsConnected && !isSyncing) {
      setTests(prev => ({
        ...prev,
        realtime: {
          status: 'success',
          message: 'Real-time updates فعال است',
          details: {
            websocket: wsConnected,
            syncing: isSyncing
          }
        }
      }));
    } else {
      setTests(prev => ({
        ...prev,
        realtime: {
          status: 'warning',
          message: 'Real-time updates غیرفعال است',
          details: {
            websocket: wsConnected,
            syncing: isSyncing
          }
        }
      }));
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');

    // Run tests in sequence
    await testAPI();
    testWebSocket();
    testAuth();
    testTenant();
    await testDatabase();
    await testFileUpload();
    testRealtime();

    // Determine overall status
    const testResults = Object.values(tests);
    const hasErrors = testResults.some(test => test.status === 'error');
    const hasWarnings = testResults.some(test => test.status === 'warning');
    const allSuccess = testResults.every(test => test.status === 'success');

    if (allSuccess) {
      setOverallStatus('success');
    } else if (hasErrors) {
      setOverallStatus('error');
    } else if (hasWarnings) {
      setOverallStatus('warning');
    }

    setIsRunning(false);

    // Call completion callback
    if (onComplete) {
      onComplete({
        status: overallStatus,
        tests,
        summary: {
          total: testResults.length,
          success: testResults.filter(t => t.status === 'success').length,
          warning: testResults.filter(t => t.status === 'warning').length,
          error: testResults.filter(t => t.status === 'error').length
        }
      });
    }
  };

  // Auto-run tests on mount
  useEffect(() => {
    if (isAuthenticated) {
      runAllTests();
    }
  }, [isAuthenticated, wsConnected]);

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  // Get overall status icon
  const getOverallStatusIcon = () => {
    switch (overallStatus) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          تست یکپارچگی سیستم
        </h3>
        <div className="flex items-center space-x-2">
          {getOverallStatusIcon()}
          <span className="text-sm font-medium text-gray-600">
            {overallStatus === 'success' && 'همه چیز درست کار می‌کند'}
            {overallStatus === 'error' && 'مشکلاتی وجود دارد'}
            {overallStatus === 'warning' && 'هشدارهایی وجود دارد'}
            {overallStatus === 'running' && 'در حال تست...'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(tests).map(([key, test]) => (
          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(test.status)}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {key === 'api' && 'اتصال API'}
                  {key === 'websocket' && 'اتصال WebSocket'}
                  {key === 'auth' && 'احراز هویت'}
                  {key === 'tenant' && 'دسترسی Tenant'}
                  {key === 'database' && 'پایگاه داده'}
                  {key === 'fileUpload' && 'آپلود فایل'}
                  {key === 'realtime' && 'Real-time Updates'}
                </p>
                <p className="text-xs text-gray-500">{test.message}</p>
              </div>
            </div>
            
            {test.details && (
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  جزئیات
                </summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-20">
                  {JSON.stringify(test.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'در حال تست...' : 'تست مجدد'}
        </button>
      </div>

      {overallStatus !== 'pending' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">خلاصه نتایج:</h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="text-green-600 font-bold">
                {Object.values(tests).filter(t => t.status === 'success').length}
              </div>
              <div className="text-gray-500">موفق</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-600 font-bold">
                {Object.values(tests).filter(t => t.status === 'warning').length}
              </div>
              <div className="text-gray-500">هشدار</div>
            </div>
            <div className="text-center">
              <div className="text-red-600 font-bold">
                {Object.values(tests).filter(t => t.status === 'error').length}
              </div>
              <div className="text-gray-500">خطا</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationTest; 