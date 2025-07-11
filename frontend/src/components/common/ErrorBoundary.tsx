import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo): void => {
    // In a real application, you would send this to your error monitoring service
    // Example: Sentry, LogRocket, etc.
    try {
      // Simulate error reporting
      console.error('Error reported to monitoring service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                خطایی رخ داده است
              </h2>
              
              <p className="text-sm text-gray-500 mb-6">
                متأسفانه مشکلی در بارگذاری این صفحه پیش آمده است. لطفاً دوباره تلاش کنید.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    جزئیات خطا (فقط در حالت توسعه)
                  </summary>
                  <div className="bg-gray-100 p-3 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex space-x-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                  size="sm"
                >
                  تلاش مجدد
                </Button>
                
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  size="sm"
                >
                  بارگذاری مجدد صفحه
                </Button>
              </div>

              <div className="mt-4 text-xs text-gray-400">
                اگر مشکل همچنان ادامه دارد، لطفاً با پشتیبانی تماس بگیرید.
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