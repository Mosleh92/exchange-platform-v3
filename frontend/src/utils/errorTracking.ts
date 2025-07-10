/**
 * Error tracking configuration interface
 */
interface ErrorTrackingConfig {
  /** Whether error tracking is enabled */
  enabled: boolean;
  /** Error tracking service endpoint */
  endpoint?: string;
  /** Application version */
  version?: string;
  /** Environment name */
  environment?: string;
  /** User identifier */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
  /** Maximum number of errors to track per session */
  maxErrorsPerSession?: number;
  /** Whether to capture console errors */
  captureConsoleErrors?: boolean;
  /** Whether to capture unhandled promise rejections */
  captureUnhandledRejections?: boolean;
  /** Whether to capture network errors */
  captureNetworkErrors?: boolean;
}

/**
 * Error data interface
 */
interface ErrorData {
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Error name */
  name?: string;
  /** Error file name */
  fileName?: string;
  /** Error line number */
  lineNumber?: number;
  /** Error column number */
  columnNumber?: number;
  /** User agent */
  userAgent?: string;
  /** URL where error occurred */
  url?: string;
  /** Timestamp */
  timestamp: string;
  /** Session ID */
  sessionId?: string;
  /** User ID */
  userId?: string;
  /** Application version */
  version?: string;
  /** Environment */
  environment?: string;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Error tracking service class for monitoring and reporting application errors
 * 
 * @example
 * ```typescript
 * // Initialize error tracking
 * const errorTracker = new ErrorTracker({
 *   enabled: true,
 *   endpoint: 'https://errors.exchange-platform.com',
 *   version: '3.0.0',
 *   environment: 'production'
 * });
 * 
 * // Track a custom error
 * errorTracker.trackError(new Error('API connection failed'), {
 *   component: 'UserService',
 *   action: 'fetchUserData'
 * });
 * ```
 */
class ErrorTracker {
  private config: ErrorTrackingConfig;
  private errorCount: number = 0;
  private isInitialized: boolean = false;

  constructor(config: ErrorTrackingConfig) {
    this.config = {
      maxErrorsPerSession: 50,
      captureConsoleErrors: true,
      captureUnhandledRejections: true,
      captureNetworkErrors: true,
      ...config
    };
    this.init();
  }

  /**
   * Initialize error tracking service
   * @private
   */
  private init(): void {
    if (!this.config.enabled) {
      console.log('Error tracking disabled');
      return;
    }

    try {
      // Capture global errors
      this.captureGlobalErrors();
      
      // Capture console errors
      if (this.config.captureConsoleErrors) {
        this.captureConsoleErrors();
      }

      // Capture unhandled promise rejections
      if (this.config.captureUnhandledRejections) {
        this.captureUnhandledRejections();
      }

      // Capture network errors
      if (this.config.captureNetworkErrors) {
        this.captureNetworkErrors();
      }

      this.isInitialized = true;
      console.log('Error tracking initialized successfully');
    } catch (error) {
      console.error('Failed to initialize error tracking:', error);
    }
  }

  /**
   * Capture global JavaScript errors
   * @private
   */
  private captureGlobalErrors(): void {
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  /**
   * Capture console errors
   * @private
   */
  private captureConsoleErrors(): void {
    const originalError = console.error;
    console.error = (...args) => {
      const error = args.find(arg => arg instanceof Error);
      if (error) {
        this.trackError(error, {
          type: 'console_error',
          consoleArgs: args
        });
      }
      originalError.apply(console, args);
    };
  }

  /**
   * Capture unhandled promise rejections
   * @private
   */
  private captureUnhandledRejections(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.trackError(error, {
        type: 'unhandled_rejection',
        reason: event.reason
      });
    });
  }

  /**
   * Capture network errors
   * @private
   */
  private captureNetworkErrors(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Track 4xx and 5xx errors
        if (!response.ok) {
          this.trackError(new Error(`HTTP ${response.status}: ${response.statusText}`), {
            type: 'network_error',
            url: typeof args[0] === 'string' ? args[0] : args[0].url,
            status: response.status,
            statusText: response.statusText
          });
        }
        
        return response;
      } catch (error) {
        this.trackError(error instanceof Error ? error : new Error(String(error)), {
          type: 'network_error',
          url: typeof args[0] === 'string' ? args[0] : args[0].url
        });
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(...args) {
      this._url = args[1];
      return originalXHROpen.apply(this, args);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('error', () => {
        this.trackError(new Error('XHR request failed'), {
          type: 'network_error',
          url: this._url,
          method: this._method
        });
      });

      this.addEventListener('load', () => {
        if (this.status >= 400) {
          this.trackError(new Error(`XHR HTTP ${this.status}: ${this.statusText}`), {
            type: 'network_error',
            url: this._url,
            method: this._method,
            status: this.status,
            statusText: this.statusText
          });
        }
      });

      return originalXHRSend.apply(this, args);
    };
  }

  /**
   * Track an error
   * 
   * @param error - Error object
   * @param context - Additional context information
   * @example
   * ```typescript
   * errorTracker.trackError(new Error('API connection failed'), {
   *   component: 'UserService',
   *   action: 'fetchUserData',
   *   userId: 'user_123'
   * });
   * ```
   */
  trackError(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    // Check error limit
    if (this.errorCount >= (this.config.maxErrorsPerSession || 50)) {
      console.warn('Error tracking limit reached');
      return;
    }

    this.errorCount++;

    try {
      const errorData: ErrorData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        sessionId: this.config.sessionId,
        userId: this.config.userId,
        version: this.config.version,
        environment: this.config.environment,
        context: {
          ...context,
          errorCount: this.errorCount
        }
      };

      // Extract file and line information from stack trace
      if (error.stack) {
        const stackLines = error.stack.split('\n');
        const callerLine = stackLines.find(line => 
          line.includes('.js') || line.includes('.ts') || line.includes('.tsx')
        );
        
        if (callerLine) {
          const match = callerLine.match(/\((.+):(\d+):(\d+)\)/);
          if (match) {
            errorData.fileName = match[1];
            errorData.lineNumber = parseInt(match[2]);
            errorData.columnNumber = parseInt(match[3]);
          }
        }
      }

      // Send to error tracking service
      this.sendToErrorService(errorData);

      console.log('Error tracked:', errorData);
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
    }
  }

  /**
   * Track a custom error message
   * 
   * @param message - Error message
   * @param context - Additional context information
   * @example
   * ```typescript
   * errorTracker.trackMessage('User authentication failed', {
   *   component: 'AuthService',
   *   userId: 'user_123'
   * });
   * ```
   */
  trackMessage(message: string, context?: Record<string, any>): void {
    const error = new Error(message);
    this.trackError(error, { ...context, type: 'custom_message' });
  }

  /**
   * Set user context
   * 
   * @param userId - User identifier
   * @param sessionId - Session identifier
   * @example
   * ```typescript
   * errorTracker.setUserContext('user_123', 'session_456');
   * ```
   */
  setUserContext(userId?: string, sessionId?: string): void {
    if (userId) {
      this.config.userId = userId;
    }
    if (sessionId) {
      this.config.sessionId = sessionId;
    }
  }

  /**
   * Add breadcrumb for debugging
   * 
   * @param message - Breadcrumb message
   * @param category - Breadcrumb category
   * @param data - Additional data
   * @example
   * ```typescript
   * errorTracker.addBreadcrumb('User clicked login button', 'user_action', {
   *   buttonId: 'login-btn'
   * });
   * ```
   */
  addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      const breadcrumb = {
        message,
        category: category || 'default',
        data,
        timestamp: new Date().toISOString(),
        sessionId: this.config.sessionId,
        userId: this.config.userId
      };

      // Store breadcrumb in session storage for debugging
      const breadcrumbs = JSON.parse(sessionStorage.getItem('error_breadcrumbs') || '[]');
      breadcrumbs.push(breadcrumb);
      
      // Keep only last 50 breadcrumbs
      if (breadcrumbs.length > 50) {
        breadcrumbs.splice(0, breadcrumbs.length - 50);
      }
      
      sessionStorage.setItem('error_breadcrumbs', JSON.stringify(breadcrumbs));
    } catch (error) {
      console.error('Failed to add breadcrumb:', error);
    }
  }

  /**
   * Send error data to error tracking service
   * @private
   */
  private async sendToErrorService(errorData: ErrorData): Promise<void> {
    if (!this.config.endpoint) {
      return;
    }

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });
    } catch (error) {
      console.error('Failed to send error to tracking service:', error);
    }
  }

  /**
   * Get error tracking configuration
   */
  getConfig(): ErrorTrackingConfig {
    return { ...this.config };
  }

  /**
   * Check if error tracking is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.isInitialized;
  }

  /**
   * Get error count for current session
   */
  getErrorCount(): number {
    return this.errorCount;
  }
}

// Global error tracker instance
let errorTrackerInstance: ErrorTracker | null = null;

/**
 * Initialize error tracking service
 * 
 * @param config - Error tracking configuration
 * @returns Error tracker instance
 * @example
 * ```typescript
 * const errorTracker = initErrorTracking({
 *   enabled: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
 *   endpoint: import.meta.env.VITE_ERROR_TRACKING_URL
 * });
 * ```
 */
export const initErrorTracking = (config: ErrorTrackingConfig): ErrorTracker => {
  if (!errorTrackerInstance) {
    errorTrackerInstance = new ErrorTracker(config);
  }
  return errorTrackerInstance;
};

/**
 * Get error tracker instance
 * 
 * @returns Error tracker instance or null if not initialized
 */
export const getErrorTracker = (): ErrorTracker | null => {
  return errorTrackerInstance;
};

/**
 * Track error (convenience function)
 * 
 * @param error - Error object
 * @param context - Additional context
 */
export const trackError = (error: Error, context?: Record<string, any>): void => {
  const errorTracker = getErrorTracker();
  if (errorTracker) {
    errorTracker.trackError(error, context);
  }
};

/**
 * Track error message (convenience function)
 * 
 * @param message - Error message
 * @param context - Additional context
 */
export const trackErrorMessage = (message: string, context?: Record<string, any>): void => {
  const errorTracker = getErrorTracker();
  if (errorTracker) {
    errorTracker.trackMessage(message, context);
  }
};

/**
 * Add breadcrumb (convenience function)
 * 
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param data - Additional data
 */
export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>): void => {
  const errorTracker = getErrorTracker();
  if (errorTracker) {
    errorTracker.addBreadcrumb(message, category, data);
  }
};

export default ErrorTracker; 