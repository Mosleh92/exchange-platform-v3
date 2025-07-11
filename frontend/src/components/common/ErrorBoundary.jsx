import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

/**
 * Comprehensive Error Boundary Component
 * Handles React errors gracefully with user-friendly error messages
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log error for debugging
    console.error('Error Boundary caught an error:', {
      error,
      errorInfo,
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Send error to monitoring service (if available)
    this.logErrorToService(error, errorInfo, errorId);
  }

  logErrorToService = async (error, errorInfo, errorId) => {
    try {
      // Send to your error tracking service (e.g., Sentry, LogRocket)
      if (import.meta.env.VITE_ERROR_TRACKING_URL) {
        await fetch(import.meta.env.VITE_ERROR_TRACKING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorId,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        });
      }
    } catch (logError) {
      console.error('Failed to log error to service:', logError);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const errorReport = `
Error ID: ${errorId}
Message: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(errorReport).then(() => {
      alert('گزارش خطا در کلیپ‌بورد کپی شد. لطفاً آن را برای پشتیبانی ارسال کنید.');
    }).catch(() => {
      // Fallback: open email client
      const subject = encodeURIComponent(`Error Report - ${errorId}`);
      const body = encodeURIComponent(errorReport);
      window.open(`mailto:support@exchange.com?subject=${subject}&body=${body}`);
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId } = this.state;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                خطای غیرمنتظره رخ داد
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">
                متأسفانه مشکلی پیش آمده است. لطفاً صفحه را مجدداً بارگذاری کنید.
              </p>

              {errorId && (
                <div className="bg-gray-100 rounded-md p-3 mb-4">
                  <p className="text-xs text-gray-600">
                    شناسه خطا: <code className="bg-gray-200 px-1 rounded">{errorId}</code>
                  </p>
                </div>
              )}

              {import.meta.env.DEV && error && (
                <details className="mb-4 text-left">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    جزئیات خطا (فقط در حالت توسعه)
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                    {error.message}
                    {error.stack}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  بارگذاری مجدد
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="h-4 w-4 mr-2" />
                  صفحه اصلی
                </button>
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={this.handleGoBack}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  بازگشت
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={this.handleReportError}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  گزارش خطا به پشتیبانی
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 