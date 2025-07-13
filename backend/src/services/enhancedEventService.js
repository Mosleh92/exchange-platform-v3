const EventEmitter = require('events');
const logger = require('../utils/logger');
const EnhancedAuditService = require('./enhancedAuditService');

/**
 * Enhanced Event Service
 * Implements event-driven architecture for the exchange platform
 */
class EnhancedEventService extends EventEmitter {
  constructor() {
    super();
    this.auditService = EnhancedAuditService;
    this.eventHandlers = new Map();
    this.eventHistory = [];
    this.maxEventHistory = 1000;
    
    // Set max listeners to prevent memory leaks
    this.setMaxListeners(50);
    
    // Initialize event handlers
    this.initializeEventHandlers();
  }

  /**
   * Initialize event handlers
   */
  initializeEventHandlers() {
    // Transaction events
    this.on('TRANSACTION_COMPLETED', this.handleTransactionCompleted.bind(this));
    this.on('TRANSACTION_FAILED', this.handleTransactionFailed.bind(this));
    this.on('TRANSACTION_ROLLED_BACK', this.handleTransactionRolledBack.bind(this));

    // Account events
    this.on('ACCOUNT_CREATED', this.handleAccountCreated.bind(this));
    this.on('ACCOUNT_UPDATED', this.handleAccountUpdated.bind(this));
    this.on('BALANCE_LOW', this.handleBalanceLow.bind(this));

    // P2P events
    this.on('P2P_ANNOUNCEMENT_CREATED', this.handleP2PAnnouncementCreated.bind(this));
    this.on('P2P_TRADE_STARTED', this.handleP2PTradeStarted.bind(this));
    this.on('P2P_TRADE_COMPLETED', this.handleP2PTradeCompleted.bind(this));
    this.on('P2P_PAYMENT_UPLOADED', this.handleP2PPaymentUploaded.bind(this));

    // Payment events
    this.on('PAYMENT_INITIATED', this.handlePaymentInitiated.bind(this));
    this.on('PAYMENT_COMPLETED', this.handlePaymentCompleted.bind(this));
    this.on('PAYMENT_FAILED', this.handlePaymentFailed.bind(this));

    // Security events
    this.on('LOGIN_ATTEMPT', this.handleLoginAttempt.bind(this));
    this.on('LOGIN_SUCCESS', this.handleLoginSuccess.bind(this));
    this.on('LOGIN_FAILED', this.handleLoginFailed.bind(this));
    this.on('PASSWORD_CHANGED', this.handlePasswordChanged.bind(this));
    this.on('TWO_FACTOR_ENABLED', this.handleTwoFactorEnabled.bind(this));

    // Tenant events
    this.on('TENANT_CREATED', this.handleTenantCreated.bind(this));
    this.on('TENANT_UPDATED', this.handleTenantUpdated.bind(this));
    this.on('TENANT_SUSPENDED', this.handleTenantSuspended.bind(this));

    // Audit events
    this.on('AUDIT_LOG_CREATED', this.handleAuditLogCreated.bind(this));
    this.on('SECURITY_VIOLATION', this.handleSecurityViolation.bind(this));
  }

  /**
   * Emit event with enhanced logging
   */
  emit(eventName, eventData) {
    // Add metadata to event
    const enhancedEventData = {
      ...eventData,
      timestamp: new Date().toISOString(),
      eventId: this.generateEventId(),
      version: '1.0'
    };

    // Log event emission
    logger.info(`Event emitted: ${eventName}`, {
      eventId: enhancedEventData.eventId,
      eventName,
      timestamp: enhancedEventData.timestamp,
      data: this.sanitizeEventData(enhancedEventData)
    });

    // Store in history
    this.storeEventHistory(eventName, enhancedEventData);

    // Emit to all listeners
    super.emit(eventName, enhancedEventData);

    // Emit to audit service
    this.auditService.logEvent({
      eventType: 'EVENT_EMITTED',
      userId: eventData.userId,
      tenantId: eventData.tenantId,
      action: 'EMIT_EVENT',
      resource: 'EVENT_SYSTEM',
      resourceId: enhancedEventData.eventId,
      details: {
        eventName,
        eventData: this.sanitizeEventData(enhancedEventData)
      },
      severity: 'LOW'
    });
  }

  /**
   * Handle transaction completed event
   */
  async handleTransactionCompleted(eventData) {
    try {
      const { transactionId, userId, tenantId, amount, currency } = eventData;

      // Update account balances
      await this.updateAccountBalances(eventData);

      // Send notification
      await this.sendTransactionNotification(eventData);

      // Update analytics
      await this.updateTransactionAnalytics(eventData);

      logger.info('Transaction completed event handled', {
        transactionId,
        userId,
        tenantId,
        amount,
        currency
      });
    } catch (error) {
      logger.error('Error handling transaction completed event:', error);
    }
  }

  /**
   * Handle transaction failed event
   */
  async handleTransactionFailed(eventData) {
    try {
      const { transactionId, userId, tenantId, error } = eventData;

      // Send failure notification
      await this.sendFailureNotification(eventData);

      // Log failure for analysis
      await this.logTransactionFailure(eventData);

      logger.warn('Transaction failed event handled', {
        transactionId,
        userId,
        tenantId,
        error: error.message
      });
    } catch (error) {
      logger.error('Error handling transaction failed event:', error);
    }
  }

  /**
   * Handle transaction rolled back event
   */
  async handleTransactionRolledBack(eventData) {
    try {
      const { transactionId, userId, tenantId, reason } = eventData;

      // Restore account balances
      await this.restoreAccountBalances(eventData);

      // Send rollback notification
      await this.sendRollbackNotification(eventData);

      logger.warn('Transaction rolled back event handled', {
        transactionId,
        userId,
        tenantId,
        reason
      });
    } catch (error) {
      logger.error('Error handling transaction rolled back event:', error);
    }
  }

  /**
   * Handle account created event
   */
  async handleAccountCreated(eventData) {
    try {
      const { accountId, userId, tenantId, accountType, currency } = eventData;

      // Send welcome notification
      await this.sendAccountWelcomeNotification(eventData);

      // Update account statistics
      await this.updateAccountStatistics(eventData);

      logger.info('Account created event handled', {
        accountId,
        userId,
        tenantId,
        accountType,
        currency
      });
    } catch (error) {
      logger.error('Error handling account created event:', error);
    }
  }

  /**
   * Handle account updated event
   */
  async handleAccountUpdated(eventData) {
    try {
      const { accountId, userId, tenantId, changes } = eventData;

      // Log account changes
      await this.logAccountChanges(eventData);

      // Update account statistics
      await this.updateAccountStatistics(eventData);

      logger.info('Account updated event handled', {
        accountId,
        userId,
        tenantId,
        changes
      });
    } catch (error) {
      logger.error('Error handling account updated event:', error);
    }
  }

  /**
   * Handle balance low event
   */
  async handleBalanceLow(eventData) {
    try {
      const { accountId, userId, tenantId, balance, threshold } = eventData;

      // Send low balance alert
      await this.sendLowBalanceAlert(eventData);

      // Update monitoring
      await this.updateBalanceMonitoring(eventData);

      logger.warn('Balance low event handled', {
        accountId,
        userId,
        tenantId,
        balance,
        threshold
      });
    } catch (error) {
      logger.error('Error handling balance low event:', error);
    }
  }

  /**
   * Handle P2P announcement created event
   */
  async handleP2PAnnouncementCreated(eventData) {
    try {
      const { announcementId, userId, tenantId, fromCurrency, toCurrency, rate } = eventData;

      // Send P2P notification
      await this.sendP2PNotification(eventData);

      // Update P2P statistics
      await this.updateP2PStatistics(eventData);

      logger.info('P2P announcement created event handled', {
        announcementId,
        userId,
        tenantId,
        fromCurrency,
        toCurrency,
        rate
      });
    } catch (error) {
      logger.error('Error handling P2P announcement created event:', error);
    }
  }

  /**
   * Handle P2P trade started event
   */
  async handleP2PTradeStarted(eventData) {
    try {
      const { tradeId, buyerId, sellerId, tenantId, amount, currency } = eventData;

      // Reserve funds
      await this.reserveP2PFunds(eventData);

      // Send trade notification
      await this.sendTradeNotification(eventData);

      logger.info('P2P trade started event handled', {
        tradeId,
        buyerId,
        sellerId,
        tenantId,
        amount,
        currency
      });
    } catch (error) {
      logger.error('Error handling P2P trade started event:', error);
    }
  }

  /**
   * Handle P2P trade completed event
   */
  async handleP2PTradeCompleted(eventData) {
    try {
      const { tradeId, buyerId, sellerId, tenantId, amount, currency } = eventData;

      // Release reserved funds
      await this.releaseP2PFunds(eventData);

      // Update trade statistics
      await this.updateTradeStatistics(eventData);

      // Send completion notification
      await this.sendTradeCompletionNotification(eventData);

      logger.info('P2P trade completed event handled', {
        tradeId,
        buyerId,
        sellerId,
        tenantId,
        amount,
        currency
      });
    } catch (error) {
      logger.error('Error handling P2P trade completed event:', error);
    }
  }

  /**
   * Handle P2P payment uploaded event
   */
  async handleP2PPaymentUploaded(eventData) {
    try {
      const { tradeId, userId, tenantId, paymentProof } = eventData;

      // Validate payment proof
      await this.validatePaymentProof(eventData);

      // Send payment notification
      await this.sendPaymentNotification(eventData);

      logger.info('P2P payment uploaded event handled', {
        tradeId,
        userId,
        tenantId,
        hasProof: !!paymentProof
      });
    } catch (error) {
      logger.error('Error handling P2P payment uploaded event:', error);
    }
  }

  /**
   * Handle payment initiated event
   */
  async handlePaymentInitiated(eventData) {
    try {
      const { paymentId, userId, tenantId, amount, method } = eventData;

      // Send payment initiation notification
      await this.sendPaymentInitiationNotification(eventData);

      // Update payment statistics
      await this.updatePaymentStatistics(eventData);

      logger.info('Payment initiated event handled', {
        paymentId,
        userId,
        tenantId,
        amount,
        method
      });
    } catch (error) {
      logger.error('Error handling payment initiated event:', error);
    }
  }

  /**
   * Handle payment completed event
   */
  async handlePaymentCompleted(eventData) {
    try {
      const { paymentId, userId, tenantId, amount, method } = eventData;

      // Update account balance
      await this.updatePaymentBalance(eventData);

      // Send completion notification
      await this.sendPaymentCompletionNotification(eventData);

      logger.info('Payment completed event handled', {
        paymentId,
        userId,
        tenantId,
        amount,
        method
      });
    } catch (error) {
      logger.error('Error handling payment completed event:', error);
    }
  }

  /**
   * Handle payment failed event
   */
  async handlePaymentFailed(eventData) {
    try {
      const { paymentId, userId, tenantId, error } = eventData;

      // Send failure notification
      await this.sendPaymentFailureNotification(eventData);

      // Log payment failure
      await this.logPaymentFailure(eventData);

      logger.warn('Payment failed event handled', {
        paymentId,
        userId,
        tenantId,
        error: error.message
      });
    } catch (error) {
      logger.error('Error handling payment failed event:', error);
    }
  }

  /**
   * Handle login attempt event
   */
  async handleLoginAttempt(eventData) {
    try {
      const { userId, tenantId, ip, userAgent, success } = eventData;

      // Update login statistics
      await this.updateLoginStatistics(eventData);

      // Check for suspicious activity
      await this.checkSuspiciousActivity(eventData);

      logger.info('Login attempt event handled', {
        userId,
        tenantId,
        ip,
        success
      });
    } catch (error) {
      logger.error('Error handling login attempt event:', error);
    }
  }

  /**
   * Handle login success event
   */
  async handleLoginSuccess(eventData) {
    try {
      const { userId, tenantId, ip, userAgent } = eventData;

      // Update last login
      await this.updateLastLogin(eventData);

      // Send welcome notification
      await this.sendWelcomeNotification(eventData);

      logger.info('Login success event handled', {
        userId,
        tenantId,
        ip
      });
    } catch (error) {
      logger.error('Error handling login success event:', error);
    }
  }

  /**
   * Handle login failed event
   */
  async handleLoginFailed(eventData) {
    try {
      const { userId, tenantId, ip, userAgent, reason } = eventData;

      // Update failed login count
      await this.updateFailedLoginCount(eventData);

      // Check for brute force attack
      await this.checkBruteForceAttack(eventData);

      logger.warn('Login failed event handled', {
        userId,
        tenantId,
        ip,
        reason
      });
    } catch (error) {
      logger.error('Error handling login failed event:', error);
    }
  }

  /**
   * Handle password changed event
   */
  async handlePasswordChanged(eventData) {
    try {
      const { userId, tenantId, ip } = eventData;

      // Send password change notification
      await this.sendPasswordChangeNotification(eventData);

      // Update security log
      await this.updateSecurityLog(eventData);

      logger.info('Password changed event handled', {
        userId,
        tenantId,
        ip
      });
    } catch (error) {
      logger.error('Error handling password changed event:', error);
    }
  }

  /**
   * Handle two factor enabled event
   */
  async handleTwoFactorEnabled(eventData) {
    try {
      const { userId, tenantId, method } = eventData;

      // Send 2FA setup notification
      await this.sendTwoFactorSetupNotification(eventData);

      // Update security settings
      await this.updateSecuritySettings(eventData);

      logger.info('Two factor enabled event handled', {
        userId,
        tenantId,
        method
      });
    } catch (error) {
      logger.error('Error handling two factor enabled event:', error);
    }
  }

  /**
   * Handle tenant created event
   */
  async handleTenantCreated(eventData) {
    try {
      const { tenantId, tenantCode, domain } = eventData;

      // Initialize tenant settings
      await this.initializeTenantSettings(eventData);

      // Send tenant welcome notification
      await this.sendTenantWelcomeNotification(eventData);

      logger.info('Tenant created event handled', {
        tenantId,
        tenantCode,
        domain
      });
    } catch (error) {
      logger.error('Error handling tenant created event:', error);
    }
  }

  /**
   * Handle tenant updated event
   */
  async handleTenantUpdated(eventData) {
    try {
      const { tenantId, changes } = eventData;

      // Update tenant cache
      await this.updateTenantCache(eventData);

      // Log tenant changes
      await this.logTenantChanges(eventData);

      logger.info('Tenant updated event handled', {
        tenantId,
        changes
      });
    } catch (error) {
      logger.error('Error handling tenant updated event:', error);
    }
  }

  /**
   * Handle tenant suspended event
   */
  async handleTenantSuspended(eventData) {
    try {
      const { tenantId, reason } = eventData;

      // Suspend tenant operations
      await this.suspendTenantOperations(eventData);

      // Send suspension notification
      await this.sendTenantSuspensionNotification(eventData);

      logger.warn('Tenant suspended event handled', {
        tenantId,
        reason
      });
    } catch (error) {
      logger.error('Error handling tenant suspended event:', error);
    }
  }

  /**
   * Handle audit log created event
   */
  async handleAuditLogCreated(eventData) {
    try {
      const { auditId, eventType, severity } = eventData;

      // Update audit statistics
      await this.updateAuditStatistics(eventData);

      // Check for security violations
      if (severity === 'CRITICAL') {
        await this.handleSecurityViolation(eventData);
      }

      logger.info('Audit log created event handled', {
        auditId,
        eventType,
        severity
      });
    } catch (error) {
      logger.error('Error handling audit log created event:', error);
    }
  }

  /**
   * Handle security violation event
   */
  async handleSecurityViolation(eventData) {
    try {
      const { violationType, userId, tenantId, details } = eventData;

      // Send security alert
      await this.sendSecurityAlert(eventData);

      // Update security monitoring
      await this.updateSecurityMonitoring(eventData);

      // Log violation
      await this.logSecurityViolation(eventData);

      logger.error('Security violation event handled', {
        violationType,
        userId,
        tenantId,
        details
      });
    } catch (error) {
      logger.error('Error handling security violation event:', error);
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store event in history
   */
  storeEventHistory(eventName, eventData) {
    this.eventHistory.push({
      eventName,
      eventData,
      timestamp: new Date()
    });

    // Keep only recent events
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
    }
  }

  /**
   * Sanitize event data for logging
   */
  sanitizeEventData(eventData) {
    const sanitized = { ...eventData };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get event history
   */
  getEventHistory(limit = 100) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get event statistics
   */
  getEventStatistics() {
    const stats = {};
    
    this.eventHistory.forEach(event => {
      const eventName = event.eventName;
      stats[eventName] = (stats[eventName] || 0) + 1;
    });

    return stats;
  }

  // Placeholder methods for event handlers
  async updateAccountBalances(eventData) {
    // Implementation for updating account balances
  }

  async sendTransactionNotification(eventData) {
    // Implementation for sending transaction notifications
  }

  async updateTransactionAnalytics(eventData) {
    // Implementation for updating transaction analytics
  }

  async sendFailureNotification(eventData) {
    // Implementation for sending failure notifications
  }

  async logTransactionFailure(eventData) {
    // Implementation for logging transaction failures
  }

  async restoreAccountBalances(eventData) {
    // Implementation for restoring account balances
  }

  async sendRollbackNotification(eventData) {
    // Implementation for sending rollback notifications
  }

  async sendAccountWelcomeNotification(eventData) {
    // Implementation for sending account welcome notifications
  }

  async updateAccountStatistics(eventData) {
    // Implementation for updating account statistics
  }

  async logAccountChanges(eventData) {
    // Implementation for logging account changes
  }

  async sendLowBalanceAlert(eventData) {
    // Implementation for sending low balance alerts
  }

  async updateBalanceMonitoring(eventData) {
    // Implementation for updating balance monitoring
  }

  async sendP2PNotification(eventData) {
    // Implementation for sending P2P notifications
  }

  async updateP2PStatistics(eventData) {
    // Implementation for updating P2P statistics
  }

  async reserveP2PFunds(eventData) {
    // Implementation for reserving P2P funds
  }

  async sendTradeNotification(eventData) {
    // Implementation for sending trade notifications
  }

  async releaseP2PFunds(eventData) {
    // Implementation for releasing P2P funds
  }

  async updateTradeStatistics(eventData) {
    // Implementation for updating trade statistics
  }

  async sendTradeCompletionNotification(eventData) {
    // Implementation for sending trade completion notifications
  }

  async validatePaymentProof(eventData) {
    // Implementation for validating payment proof
  }

  async sendPaymentNotification(eventData) {
    // Implementation for sending payment notifications
  }

  async sendPaymentInitiationNotification(eventData) {
    // Implementation for sending payment initiation notifications
  }

  async updatePaymentStatistics(eventData) {
    // Implementation for updating payment statistics
  }

  async updatePaymentBalance(eventData) {
    // Implementation for updating payment balance
  }

  async sendPaymentCompletionNotification(eventData) {
    // Implementation for sending payment completion notifications
  }

  async sendPaymentFailureNotification(eventData) {
    // Implementation for sending payment failure notifications
  }

  async logPaymentFailure(eventData) {
    // Implementation for logging payment failures
  }

  async updateLoginStatistics(eventData) {
    // Implementation for updating login statistics
  }

  async checkSuspiciousActivity(eventData) {
    // Implementation for checking suspicious activity
  }

  async updateLastLogin(eventData) {
    // Implementation for updating last login
  }

  async sendWelcomeNotification(eventData) {
    // Implementation for sending welcome notifications
  }

  async updateFailedLoginCount(eventData) {
    // Implementation for updating failed login count
  }

  async checkBruteForceAttack(eventData) {
    // Implementation for checking brute force attacks
  }

  async sendPasswordChangeNotification(eventData) {
    // Implementation for sending password change notifications
  }

  async updateSecurityLog(eventData) {
    // Implementation for updating security log
  }

  async sendTwoFactorSetupNotification(eventData) {
    // Implementation for sending 2FA setup notifications
  }

  async updateSecuritySettings(eventData) {
    // Implementation for updating security settings
  }

  async initializeTenantSettings(eventData) {
    // Implementation for initializing tenant settings
  }

  async sendTenantWelcomeNotification(eventData) {
    // Implementation for sending tenant welcome notifications
  }

  async updateTenantCache(eventData) {
    // Implementation for updating tenant cache
  }

  async logTenantChanges(eventData) {
    // Implementation for logging tenant changes
  }

  async suspendTenantOperations(eventData) {
    // Implementation for suspending tenant operations
  }

  async sendTenantSuspensionNotification(eventData) {
    // Implementation for sending tenant suspension notifications
  }

  async updateAuditStatistics(eventData) {
    // Implementation for updating audit statistics
  }

  async handleSecurityViolation(eventData) {
    // Implementation for handling security violations
  }

  async sendSecurityAlert(eventData) {
    // Implementation for sending security alerts
  }

  async updateSecurityMonitoring(eventData) {
    // Implementation for updating security monitoring
  }

  async logSecurityViolation(eventData) {
    // Implementation for logging security violations
  }
}

module.exports = new EnhancedEventService(); 