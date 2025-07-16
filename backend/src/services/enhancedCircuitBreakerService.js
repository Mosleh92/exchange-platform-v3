const logger = require('../utils/logger');

/**
 * Enhanced Circuit Breaker Service
 * Implements circuit breaker pattern for external service calls
 */
class EnhancedCircuitBreakerService {
  constructor() {
    this.circuits = new Map();
    this.defaultConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      expectedResponseTime: 5000, // 5 seconds
      monitoringWindow: 60000 // 1 minute
    };
  }

  /**
   * Create or get circuit breaker
   */
  getCircuit(name, config = {}) {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        name,
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failureCount: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        config: { ...this.defaultConfig, ...config },
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          responseTimes: []
        }
      });
    }
    return this.circuits.get(name);
  }

  /**
   * Execute function with circuit breaker
   */
  async execute(name, operation, fallback = null, config = {}) {
    const circuit = this.getCircuit(name, config);
    
    try {
      // Check circuit state
      if (circuit.state === 'OPEN') {
        if (this.shouldAttemptReset(circuit)) {
          circuit.state = 'HALF_OPEN';
          logger.info(`Circuit ${name} moved to HALF_OPEN state`);
        } else {
          logger.warn(`Circuit ${name} is OPEN, using fallback`);
          return fallback ? await fallback() : this.getDefaultFallback(name);
        }
      }

      // Execute operation
      const startTime = Date.now();
      const result = await operation();
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(circuit, true, responseTime);
      
      // Reset circuit on success
      if (circuit.state === 'HALF_OPEN') {
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
        logger.info(`Circuit ${name} reset to CLOSED state`);
      }

      return result;
    } catch (error) {
      // Update metrics
      this.updateMetrics(circuit, false, 0);
      
      // Increment failure count
      circuit.failureCount++;
      circuit.lastFailureTime = new Date();

      // Check if circuit should open
      if (circuit.failureCount >= circuit.config.failureThreshold) {
        circuit.state = 'OPEN';
        logger.error(`Circuit ${name} opened due to ${circuit.failureCount} failures`);
      }

      // Use fallback if available
      if (fallback) {
        try {
          logger.info(`Using fallback for circuit ${name}`);
          return await fallback();
        } catch (fallbackError) {
          logger.error(`Fallback for circuit ${name} also failed:`, fallbackError);
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  /**
   * Check if circuit should attempt reset
   */
  shouldAttemptReset(circuit) {
    if (!circuit.lastFailureTime) return true;
    
    const timeSinceLastFailure = Date.now() - circuit.lastFailureTime.getTime();
    return timeSinceLastFailure >= circuit.config.recoveryTimeout;
  }

  /**
   * Update circuit metrics
   */
  updateMetrics(circuit, success, responseTime) {
    circuit.metrics.totalRequests++;
    
    if (success) {
      circuit.metrics.successfulRequests++;
      circuit.lastSuccessTime = new Date();
    } else {
      circuit.metrics.failedRequests++;
    }

    // Track response times (keep last 100)
    circuit.metrics.responseTimes.push(responseTime);
    if (circuit.metrics.responseTimes.length > 100) {
      circuit.metrics.responseTimes.shift();
    }
  }

  /**
   * Get default fallback response
   */
  getDefaultFallback(circuitName) {
    const fallbacks = {
      'banking-service': {
        success: false,
        error: 'Banking service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      },
      'payment-gateway': {
        success: false,
        error: 'Payment gateway temporarily unavailable',
        code: 'PAYMENT_SERVICE_UNAVAILABLE'
      },
      'sms-service': {
        success: false,
        error: 'SMS service temporarily unavailable',
        code: 'SMS_SERVICE_UNAVAILABLE'
      },
      'email-service': {
        success: false,
        error: 'Email service temporarily unavailable',
        code: 'EMAIL_SERVICE_UNAVAILABLE'
      }
    };

    return fallbacks[circuitName] || {
      success: false,
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE'
    };
  }

  /**
   * Banking service circuit breaker
   */
  async executeBankingService(operation) {
    const fallback = async () => {
      logger.warn('Banking service fallback executed');
      return {
        success: false,
        message: 'Banking service temporarily unavailable',
        retryAfter: 300 // 5 minutes
      };
    };

    return this.execute('banking-service', operation, fallback, {
      failureThreshold: 3,
      recoveryTimeout: 300000 // 5 minutes
    });
  }

  /**
   * Payment gateway circuit breaker
   */
  async executePaymentGateway(operation) {
    const fallback = async () => {
      logger.warn('Payment gateway fallback executed');
      return {
        success: false,
        message: 'Payment gateway temporarily unavailable',
        retryAfter: 600 // 10 minutes
      };
    };

    return this.execute('payment-gateway', operation, fallback, {
      failureThreshold: 5,
      recoveryTimeout: 600000 // 10 minutes
    });
  }

  /**
   * SMS service circuit breaker
   */
  async executeSMSService(operation) {
    const fallback = async () => {
      logger.warn('SMS service fallback executed');
      return {
        success: false,
        message: 'SMS service temporarily unavailable',
        retryAfter: 300 // 5 minutes
      };
    };

    return this.execute('sms-service', operation, fallback, {
      failureThreshold: 3,
      recoveryTimeout: 300000 // 5 minutes
    });
  }

  /**
   * Email service circuit breaker
   */
  async executeEmailService(operation) {
    const fallback = async () => {
      logger.warn('Email service fallback executed');
      return {
        success: false,
        message: 'Email service temporarily unavailable',
        retryAfter: 300 // 5 minutes
      };
    };

    return this.execute('email-service', operation, fallback, {
      failureThreshold: 3,
      recoveryTimeout: 300000 // 5 minutes
    });
  }

  /**
   * External API circuit breaker
   */
  async executeExternalAPI(operation, apiName) {
    const fallback = async () => {
      logger.warn(`External API ${apiName} fallback executed`);
      return {
        success: false,
        message: `External API ${apiName} temporarily unavailable`,
        retryAfter: 300 // 5 minutes
      };
    };

    return this.execute(`external-api-${apiName}`, operation, fallback, {
      failureThreshold: 3,
      recoveryTimeout: 300000 // 5 minutes
    });
  }

  /**
   * Get circuit status
   */
  getCircuitStatus(name) {
    const circuit = this.circuits.get(name);
    if (!circuit) {
      return { error: 'Circuit not found' };
    }

    const avgResponseTime = circuit.metrics.responseTimes.length > 0
      ? circuit.metrics.responseTimes.reduce((a, b) => a + b, 0) / circuit.metrics.responseTimes.length
      : 0;

    const successRate = circuit.metrics.totalRequests > 0
      ? (circuit.metrics.successfulRequests / circuit.metrics.totalRequests) * 100
      : 0;

    return {
      name: circuit.name,
      state: circuit.state,
      failureCount: circuit.failureCount,
      lastFailureTime: circuit.lastFailureTime,
      lastSuccessTime: circuit.lastSuccessTime,
      metrics: {
        totalRequests: circuit.metrics.totalRequests,
        successfulRequests: circuit.metrics.successfulRequests,
        failedRequests: circuit.metrics.failedRequests,
        successRate: successRate.toFixed(2) + '%',
        averageResponseTime: avgResponseTime.toFixed(2) + 'ms'
      },
      config: circuit.config
    };
  }

  /**
   * Get all circuit statuses
   */
  getAllCircuitStatuses() {
    const statuses = {};
    for (const [name, circuit] of this.circuits) {
      statuses[name] = this.getCircuitStatus(name);
    }
    return statuses;
  }

  /**
   * Reset circuit manually
   */
  resetCircuit(name) {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.state = 'CLOSED';
      circuit.failureCount = 0;
      circuit.lastFailureTime = null;
      logger.info(`Circuit ${name} manually reset`);
      return true;
    }
    return false;
  }

  /**
   * Force open circuit
   */
  forceOpenCircuit(name) {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.state = 'OPEN';
      logger.info(`Circuit ${name} manually opened`);
      return true;
    }
    return false;
  }

  /**
   * Get circuit statistics
   */
  getCircuitStatistics() {
    const stats = {
      totalCircuits: this.circuits.size,
      openCircuits: 0,
      halfOpenCircuits: 0,
      closedCircuits: 0,
      totalRequests: 0,
      totalFailures: 0
    };

    for (const circuit of this.circuits.values()) {
      switch (circuit.state) {
        case 'OPEN':
          stats.openCircuits++;
          break;
        case 'HALF_OPEN':
          stats.halfOpenCircuits++;
          break;
        case 'CLOSED':
          stats.closedCircuits++;
          break;
      }

      stats.totalRequests += circuit.metrics.totalRequests;
      stats.totalFailures += circuit.metrics.failedRequests;
    }

    return stats;
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const circuit of this.circuits.values()) {
      // Remove old response times
      circuit.metrics.responseTimes = circuit.metrics.responseTimes.filter(
        time => time > cutoffTime
      );
    }
  }

  /**
   * Monitor circuit health
   */
  monitorCircuitHealth() {
    const stats = this.getCircuitStatistics();
    
    // Alert if too many circuits are open
    if (stats.openCircuits > 0) {
      logger.warn(`Circuit breaker alert: ${stats.openCircuits} circuits are open`, stats);
    }

    // Alert if failure rate is high
    const failureRate = stats.totalRequests > 0 
      ? (stats.totalFailures / stats.totalRequests) * 100 
      : 0;
    
    if (failureRate > 10) {
      logger.warn(`Circuit breaker alert: High failure rate ${failureRate.toFixed(2)}%`, stats);
    }
  }
}

module.exports = new EnhancedCircuitBreakerService(); 