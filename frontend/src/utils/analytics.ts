/**
 * Analytics configuration interface
 */
interface AnalyticsConfig {
  /** Whether analytics is enabled */
  enabled: boolean;
  /** Analytics service ID */
  serviceId?: string;
  /** Custom tracking endpoint */
  endpoint?: string;
  /** User identifier */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
}

/**
 * Event tracking interface
 */
interface TrackEvent {
  /** Event name */
  name: string;
  /** Event category */
  category?: string;
  /** Event action */
  action?: string;
  /** Event label */
  label?: string;
  /** Event value */
  value?: number;
  /** Custom properties */
  properties?: Record<string, any>;
}

/**
 * Page view tracking interface
 */
interface TrackPageView {
  /** Page path */
  path: string;
  /** Page title */
  title?: string;
  /** Custom properties */
  properties?: Record<string, any>;
}

/**
 * User identification interface
 */
interface IdentifyUser {
  /** User ID */
  userId: string;
  /** User properties */
  properties?: Record<string, any>;
}

/**
 * Analytics service class for tracking user interactions and events
 * 
 * @example
 * ```typescript
 * // Initialize analytics
 * const analytics = new Analytics({
 *   enabled: true,
 *   serviceId: 'GA_MEASUREMENT_ID'
 * });
 * 
 * // Track page view
 * analytics.trackPageView({
 *   path: '/dashboard',
 *   title: 'Dashboard'
 * });
 * 
 * // Track custom event
 * analytics.trackEvent({
 *   name: 'button_click',
 *   category: 'engagement',
 *   action: 'click',
 *   label: 'login_button'
 * });
 * ```
 */
class Analytics {
  private config: AnalyticsConfig;
  private isInitialized: boolean = false;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.init();
  }

  /**
   * Initialize analytics service
   * @private
   */
  private init(): void {
    if (!this.config.enabled) {
      console.log('Analytics disabled');
      return;
    }

    try {
      // Initialize Google Analytics if serviceId is provided
      if (this.config.serviceId) {
        this.initGoogleAnalytics();
      }

      // Initialize custom analytics if endpoint is provided
      if (this.config.endpoint) {
        this.initCustomAnalytics();
      }

      this.isInitialized = true;
      console.log('Analytics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Initialize Google Analytics
   * @private
   */
  private initGoogleAnalytics(): void {
    // Google Analytics 4 initialization
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.serviceId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', this.config.serviceId);

    // Make gtag available globally
    (window as any).gtag = gtag;
  }

  /**
   * Initialize custom analytics service
   * @private
   */
  private initCustomAnalytics(): void {
    // Custom analytics initialization
    console.log('Custom analytics initialized');
  }

  /**
   * Track a page view
   * 
   * @param pageView - Page view data
   * @example
   * ```typescript
   * analytics.trackPageView({
   *   path: '/dashboard',
   *   title: 'User Dashboard',
   *   properties: {
   *     userType: 'premium'
   *   }
   * });
   * ```
   */
  trackPageView(pageView: TrackPageView): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Google Analytics tracking
      if ((window as any).gtag) {
        (window as any).gtag('config', this.config.serviceId, {
          page_path: pageView.path,
          page_title: pageView.title,
          custom_map: pageView.properties
        });
      }

      // Custom analytics tracking
      if (this.config.endpoint) {
        this.sendToCustomAnalytics('page_view', {
          path: pageView.path,
          title: pageView.title,
          ...pageView.properties
        });
      }

      console.log('Page view tracked:', pageView);
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  /**
   * Track a custom event
   * 
   * @param event - Event data
   * @example
   * ```typescript
   * analytics.trackEvent({
   *   name: 'purchase_completed',
   *   category: 'ecommerce',
   *   action: 'purchase',
   *   label: 'premium_plan',
   *   value: 99.99,
   *   properties: {
   *     currency: 'USD',
   *     paymentMethod: 'credit_card'
   *   }
   * });
   * ```
   */
  trackEvent(event: TrackEvent): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Google Analytics tracking
      if ((window as any).gtag) {
        (window as any).gtag('event', event.name, {
          event_category: event.category,
          event_action: event.action,
          event_label: event.label,
          value: event.value,
          ...event.properties
        });
      }

      // Custom analytics tracking
      if (this.config.endpoint) {
        this.sendToCustomAnalytics('custom_event', {
          name: event.name,
          category: event.category,
          action: event.action,
          label: event.label,
          value: event.value,
          ...event.properties
        });
      }

      console.log('Event tracked:', event);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Identify a user
   * 
   * @param user - User identification data
   * @example
   * ```typescript
   * analytics.identifyUser({
   *   userId: 'user_123',
   *   properties: {
   *     email: 'user@example.com',
   *     plan: 'premium',
   *     signupDate: '2023-01-01'
   *   }
   * });
   * ```
   */
  identifyUser(user: IdentifyUser): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Google Analytics user identification
      if ((window as any).gtag) {
        (window as any).gtag('config', this.config.serviceId, {
          user_id: user.userId,
          custom_map: user.properties
        });
      }

      // Custom analytics user identification
      if (this.config.endpoint) {
        this.sendToCustomAnalytics('identify', {
          userId: user.userId,
          ...user.properties
        });
      }

      console.log('User identified:', user);
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Track user timing
   * 
   * @param name - Timing name
   * @param value - Timing value in milliseconds
   * @param category - Timing category
   * @param label - Timing label
   * @example
   * ```typescript
   * analytics.trackTiming('page_load', 1500, 'performance', 'dashboard');
   * ```
   */
  trackTiming(name: string, value: number, category?: string, label?: string): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Google Analytics timing tracking
      if ((window as any).gtag) {
        (window as any).gtag('event', 'timing_complete', {
          name: name,
          value: value,
          event_category: category || 'timing',
          event_label: label
        });
      }

      console.log('Timing tracked:', { name, value, category, label });
    } catch (error) {
      console.error('Failed to track timing:', error);
    }
  }

  /**
   * Track exception/error
   * 
   * @param description - Error description
   * @param fatal - Whether the error is fatal
   * @example
   * ```typescript
   * analytics.trackException('API connection failed', false);
   * ```
   */
  trackException(description: string, fatal: boolean = false): void {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    try {
      // Google Analytics exception tracking
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: description,
          fatal: fatal
        });
      }

      console.log('Exception tracked:', { description, fatal });
    } catch (error) {
      console.error('Failed to track exception:', error);
    }
  }

  /**
   * Send data to custom analytics endpoint
   * @private
   */
  private async sendToCustomAnalytics(eventType: string, data: any): Promise<void> {
    if (!this.config.endpoint) {
      return;
    }

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          data,
          timestamp: new Date().toISOString(),
          userId: this.config.userId,
          sessionId: this.config.sessionId
        })
      });
    } catch (error) {
      console.error('Failed to send to custom analytics:', error);
    }
  }

  /**
   * Get analytics configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.isInitialized;
  }
}

// Global analytics instance
let analyticsInstance: Analytics | null = null;

/**
 * Initialize analytics service
 * 
 * @param config - Analytics configuration
 * @returns Analytics instance
 * @example
 * ```typescript
 * const analytics = initAnalytics({
 *   enabled: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
 *   serviceId: import.meta.env.VITE_ANALYTICS_ID
 * });
 * ```
 */
export const initAnalytics = (config: AnalyticsConfig): Analytics => {
  if (!analyticsInstance) {
    analyticsInstance = new Analytics(config);
  }
  return analyticsInstance;
};

/**
 * Get analytics instance
 * 
 * @returns Analytics instance or null if not initialized
 */
export const getAnalytics = (): Analytics | null => {
  return analyticsInstance;
};

/**
 * Track page view (convenience function)
 * 
 * @param path - Page path
 * @param title - Page title
 * @param properties - Custom properties
 */
export const trackPageView = (path: string, title?: string, properties?: Record<string, any>): void => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.trackPageView({ path, title, properties });
  }
};

/**
 * Track custom event (convenience function)
 * 
 * @param name - Event name
 * @param category - Event category
 * @param action - Event action
 * @param label - Event label
 * @param value - Event value
 * @param properties - Custom properties
 */
export const trackEvent = (
  name: string,
  category?: string,
  action?: string,
  label?: string,
  value?: number,
  properties?: Record<string, any>
): void => {
  const analytics = getAnalytics();
  if (analytics) {
    analytics.trackEvent({ name, category, action, label, value, properties });
  }
};

export default Analytics; 