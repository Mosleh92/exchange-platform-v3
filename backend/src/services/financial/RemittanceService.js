// src/services/financial/RemittanceService.js
const AccountingService = require('./AccountingService');
const CurrencyExchangeService = require('./CurrencyExchangeService');
const { Transaction, AccountBalance, User } = require('../../models/postgresql');

/**
 * Remittance Service
 * Handles international money transfers with compliance and tracking
 */
class RemittanceService {
  constructor() {
    this.remittanceTypes = ['send', 'receive'];
    this.remittanceStatus = ['pending', 'processing', 'sent', 'received', 'completed', 'failed', 'cancelled'];
    this.remittanceFeeStructure = {
      domestic: 0.01,      // 1% for domestic transfers
      international: 0.025, // 2.5% for international transfers
      sameDay: 0.05,       // 5% for same-day delivery
      instant: 0.1         // 10% for instant transfers
    };
    
    // Country codes and their corresponding currencies
    this.countryCurrencies = {
      'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'EU': 'EUR', 'JP': 'JPY',
      'AU': 'AUD', 'CH': 'CHF', 'CN': 'CNY', 'IN': 'INR', 'MX': 'MXN',
      'BR': 'BRL', 'ZA': 'ZAR', 'SG': 'SGD', 'HK': 'HKD', 'KR': 'KRW'
    };
    
    // Processing times by delivery method
    this.processingTimes = {
      standard: 3 * 24 * 60 * 60 * 1000,  // 3 days
      express: 24 * 60 * 60 * 1000,       // 1 day
      sameDay: 8 * 60 * 60 * 1000,        // 8 hours
      instant: 30 * 60 * 1000              // 30 minutes
    };
  }
  
  /**
   * Send remittance
   */
  async sendRemittance(remittanceData) {
    const {
      tenantId,
      senderId,
      receiverInfo,
      amount,
      sourceCurrency,
      destinationCurrency,
      destinationCountry,
      deliveryMethod = 'standard',
      purpose = 'personal',
      description = '',
      requiresKYC = true
    } = remittanceData;
    
    try {
      // Validate remittance request
      const validation = this.validateRemittanceRequest(remittanceData);
      if (!validation.isValid) {
        throw new Error(`Invalid remittance request: ${validation.errors.join(', ')}`);
      }
      
      // Get sender information
      const sender = await User.findByPk(senderId);
      if (!sender) {
        throw new Error('Sender not found');
      }
      
      // Check KYC compliance if required
      if (requiresKYC && sender.kycStatus !== 'approved') {
        throw new Error('KYC verification required for international remittances');
      }
      
      // Calculate fees and exchange rate
      const feeCalculation = await this.calculateRemittanceFee({
        amount,
        sourceCurrency,
        destinationCurrency,
        destinationCountry,
        deliveryMethod,
        senderCountry: sender.address?.country
      });
      
      // Verify sender has sufficient balance
      const senderBalance = await AccountBalance.findOne({
        where: { userId: senderId, currency: sourceCurrency }
      });
      
      const totalDeduction = parseFloat(amount) + feeCalculation.totalFee;
      if (!senderBalance || parseFloat(senderBalance.availableBalance) < totalDeduction) {
        throw new Error('Insufficient balance for remittance');
      }
      
      // Create remittance transaction
      const remittanceResult = await this.createRemittanceTransaction({
        tenantId,
        senderId,
        receiverInfo,
        amount,
        sourceCurrency,
        destinationCurrency,
        feeCalculation,
        deliveryMethod,
        purpose,
        description
      });
      
      // Update sender balance
      await senderBalance.subtractBalance(totalDeduction, 'available');
      
      // Create compliance record
      await this.createComplianceRecord({
        remittanceId: remittanceResult.remittanceId,
        senderId,
        receiverInfo,
        amount,
        purpose,
        riskScore: feeCalculation.riskScore
      });
      
      // Schedule processing based on delivery method
      await this.scheduleRemittanceProcessing(remittanceResult.remittanceId, deliveryMethod);
      
      return {
        success: true,
        remittanceId: remittanceResult.remittanceId,
        trackingNumber: remittanceResult.trackingNumber,
        estimatedDelivery: new Date(Date.now() + this.processingTimes[deliveryMethod]),
        totalFee: feeCalculation.totalFee,
        exchangeRate: feeCalculation.exchangeRate,
        receiverAmount: feeCalculation.receiverAmount,
        status: 'pending'
      };
      
    } catch (error) {
      throw new Error(`Remittance send failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate remittance fees
   */
  async calculateRemittanceFee(feeData) {
    const {
      amount,
      sourceCurrency,
      destinationCurrency,
      destinationCountry,
      deliveryMethod,
      senderCountry = 'US'
    } = feeData;
    
    // Determine if domestic or international
    const isDomestic = senderCountry === destinationCountry;
    
    // Base fee rate
    let baseFeeRate = isDomestic ? 
      this.remittanceFeeStructure.domestic : 
      this.remittanceFeeStructure.international;
    
    // Add delivery method premium
    if (deliveryMethod === 'sameDay') {
      baseFeeRate += this.remittanceFeeStructure.sameDay;
    } else if (deliveryMethod === 'instant') {
      baseFeeRate += this.remittanceFeeStructure.instant;
    }
    
    // Calculate base fee
    const baseFee = parseFloat(amount) * baseFeeRate;
    
    // Get exchange rate if currencies are different
    let exchangeRate = 1;
    let exchangeFee = 0;
    
    if (sourceCurrency !== destinationCurrency) {
      exchangeRate = await CurrencyExchangeService.getExchangeRate(sourceCurrency, destinationCurrency);
      exchangeFee = parseFloat(amount) * 0.002; // 0.2% exchange fee
    }
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore({
      amount: parseFloat(amount),
      isDomestic,
      deliveryMethod,
      destinationCountry
    });
    
    // Risk-based fee adjustment
    const riskAdjustment = riskScore > 0.7 ? parseFloat(amount) * 0.01 : 0; // 1% for high risk
    
    // Total fee calculation
    const totalFee = baseFee + exchangeFee + riskAdjustment;
    const receiverAmount = parseFloat(amount) * exchangeRate;
    
    return {
      baseFee,
      exchangeFee,
      riskAdjustment,
      totalFee,
      exchangeRate,
      receiverAmount,
      riskScore,
      isDomestic
    };
  }
  
  /**
   * Create remittance transaction
   */
  async createRemittanceTransaction(transactionData) {
    const {
      tenantId,
      senderId,
      receiverInfo,
      amount,
      sourceCurrency,
      destinationCurrency,
      feeCalculation,
      deliveryMethod,
      purpose,
      description
    } = transactionData;
    
    // Generate tracking number
    const trackingNumber = this.generateTrackingNumber();
    
    // Create main remittance transaction
    const remittanceResult = await AccountingService.createDoubleEntryTransaction({
      tenantId,
      fromUserId: senderId,
      toUserId: null, // Intermediate account for processing
      amount,
      currency: sourceCurrency,
      type: 'remittance_send',
      description: `Remittance Send: ${amount} ${sourceCurrency} to ${receiverInfo.name}`,
      fee: feeCalculation.totalFee,
      exchangeRate: feeCalculation.exchangeRate,
      counterpartAmount: feeCalculation.receiverAmount,
      counterpartCurrency: destinationCurrency,
      metadata: {
        remittanceType: 'send',
        trackingNumber,
        receiver: receiverInfo,
        deliveryMethod,
        purpose,
        description,
        estimatedDelivery: new Date(Date.now() + this.processingTimes[deliveryMethod]),
        complianceChecked: false,
        riskScore: feeCalculation.riskScore,
        isDomestic: feeCalculation.isDomestic
      }
    });
    
    return {
      remittanceId: remittanceResult.referenceNumber,
      trackingNumber,
      transactions: remittanceResult.transactions
    };
  }
  
  /**
   * Process remittance (simulated external processing)
   */
  async processRemittance(remittanceId) {
    try {
      const remittanceTransaction = await Transaction.findOne({
        where: {
          referenceNumber: remittanceId,
          type: 'remittance_send'
        }
      });
      
      if (!remittanceTransaction) {
        throw new Error('Remittance transaction not found');
      }
      
      // Simulate processing steps
      await remittanceTransaction.update({
        status: 'processing',
        metadata: {
          ...remittanceTransaction.metadata,
          processingStartedAt: new Date().toISOString()
        }
      });
      
      // Simulate external transfer
      await this.simulateExternalTransfer(remittanceTransaction);
      
      // Mark as sent
      await remittanceTransaction.update({
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          ...remittanceTransaction.metadata,
          sentAt: new Date().toISOString(),
          externalReferenceId: `EXT-${Date.now()}`,
          deliveryConfirmed: true
        }
      });
      
      return {
        success: true,
        remittanceId,
        status: 'completed',
        externalReferenceId: remittanceTransaction.metadata.externalReferenceId
      };
      
    } catch (error) {
      throw new Error(`Remittance processing failed: ${error.message}`);
    }
  }
  
  /**
   * Receive remittance (for incoming transfers)
   */
  async receiveRemittance(receiveData) {
    const {
      tenantId,
      receiverId,
      senderInfo,
      amount,
      currency,
      externalReferenceId,
      purpose = 'personal',
      description = ''
    } = receiveData;
    
    try {
      // Find or create receiver
      const receiver = await User.findByPk(receiverId);
      if (!receiver) {
        throw new Error('Receiver not found');
      }
      
      // Create receive transaction
      const receiveResult = await AccountingService.createDoubleEntryTransaction({
        tenantId,
        fromUserId: null, // From external source
        toUserId: receiverId,
        amount,
        currency,
        type: 'remittance_receive',
        description: `Remittance Receive: ${amount} ${currency} from ${senderInfo.name}`,
        metadata: {
          remittanceType: 'receive',
          sender: senderInfo,
          externalReferenceId,
          purpose,
          description,
          receivedAt: new Date().toISOString()
        }
      });
      
      // Update receiver balance
      const receiverBalance = await AccountBalance.findOrCreate({
        where: { userId: receiverId, currency },
        defaults: {
          userId: receiverId,
          currency,
          availableBalance: 0
        }
      });
      
      await receiverBalance[0].addBalance(amount, 'available');
      
      return {
        success: true,
        remittanceId: receiveResult.referenceNumber,
        amount,
        currency,
        externalReferenceId
      };
      
    } catch (error) {
      throw new Error(`Remittance receive failed: ${error.message}`);
    }
  }
  
  /**
   * Track remittance status
   */
  async trackRemittance(trackingNumber, userId = null) {
    try {
      const remittanceTransaction = await Transaction.findOne({
        where: {
          'metadata.trackingNumber': trackingNumber
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });
      
      if (!remittanceTransaction) {
        throw new Error('Remittance not found');
      }
      
      // Check if user has permission to view this remittance
      if (userId && remittanceTransaction.userId !== userId) {
        throw new Error('Access denied to this remittance');
      }
      
      const metadata = remittanceTransaction.metadata;
      
      return {
        trackingNumber,
        remittanceId: remittanceTransaction.referenceNumber,
        status: remittanceTransaction.status,
        amount: parseFloat(remittanceTransaction.amount),
        currency: remittanceTransaction.currency,
        receiverAmount: remittanceTransaction.counterpartAmount,
        receiverCurrency: remittanceTransaction.counterpartCurrency,
        exchangeRate: remittanceTransaction.exchangeRate,
        fee: parseFloat(remittanceTransaction.fee),
        sender: remittanceTransaction.user,
        receiver: metadata.receiver,
        deliveryMethod: metadata.deliveryMethod,
        purpose: metadata.purpose,
        description: metadata.description,
        estimatedDelivery: metadata.estimatedDelivery,
        sentAt: metadata.sentAt,
        externalReferenceId: metadata.externalReferenceId,
        createdAt: remittanceTransaction.createdAt,
        timeline: this.generateRemittanceTimeline(remittanceTransaction)
      };
      
    } catch (error) {
      throw new Error(`Remittance tracking failed: ${error.message}`);
    }
  }
  
  /**
   * Cancel remittance
   */
  async cancelRemittance(remittanceId, userId, reason = 'User cancellation') {
    try {
      const remittanceTransaction = await Transaction.findOne({
        where: {
          referenceNumber: remittanceId,
          userId,
          type: 'remittance_send'
        }
      });
      
      if (!remittanceTransaction) {
        throw new Error('Remittance not found');
      }
      
      if (remittanceTransaction.status === 'completed') {
        throw new Error('Cannot cancel completed remittance');
      }
      
      if (remittanceTransaction.status === 'processing') {
        throw new Error('Cannot cancel remittance in processing');
      }
      
      // Refund amount to sender
      const refundAmount = parseFloat(remittanceTransaction.amount) + parseFloat(remittanceTransaction.fee);
      
      const senderBalance = await AccountBalance.findOne({
        where: { userId, currency: remittanceTransaction.currency }
      });
      
      if (senderBalance) {
        await senderBalance.addBalance(refundAmount, 'available');
      }
      
      // Update transaction status
      await remittanceTransaction.update({
        status: 'cancelled',
        metadata: {
          ...remittanceTransaction.metadata,
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason,
          refundAmount
        }
      });
      
      return {
        success: true,
        remittanceId,
        status: 'cancelled',
        refundAmount
      };
      
    } catch (error) {
      throw new Error(`Remittance cancellation failed: ${error.message}`);
    }
  }
  
  /**
   * Get remittance history
   */
  async getRemittanceHistory(userId, tenantId, filters = {}) {
    const {
      type = 'all', // 'send', 'receive', 'all'
      status = 'all',
      currency = null,
      limit = 50,
      offset = 0
    } = filters;
    
    const whereClause = {
      tenantId,
      type: type === 'all' ? ['remittance_send', 'remittance_receive'] : [`remittance_${type}`]
    };
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (status !== 'all') {
      whereClause.status = status;
    }
    
    if (currency) {
      whereClause.currency = currency;
    }
    
    const remittances = await Transaction.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    return remittances.map(remittance => ({
      id: remittance.id,
      remittanceId: remittance.referenceNumber,
      trackingNumber: remittance.metadata?.trackingNumber,
      type: remittance.type,
      status: remittance.status,
      amount: parseFloat(remittance.amount),
      currency: remittance.currency,
      fee: parseFloat(remittance.fee),
      user: remittance.user,
      metadata: remittance.metadata,
      createdAt: remittance.createdAt,
      completedAt: remittance.completedAt
    }));
  }
  
  /**
   * Helper methods
   */
  
  generateTrackingNumber() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `RMT-${timestamp}-${random}`.toUpperCase();
  }
  
  calculateRiskScore(riskData) {
    const { amount, isDomestic, deliveryMethod, destinationCountry } = riskData;
    
    let score = 0;
    
    // Amount-based risk
    if (amount >= 10000) score += 0.3;
    else if (amount >= 5000) score += 0.2;
    else if (amount >= 1000) score += 0.1;
    
    // Geographic risk
    if (!isDomestic) score += 0.2;
    
    // High-risk countries (simplified)
    const highRiskCountries = ['AF', 'KP', 'IR', 'SY'];
    if (highRiskCountries.includes(destinationCountry)) score += 0.4;
    
    // Delivery method risk
    if (deliveryMethod === 'instant') score += 0.2;
    
    return Math.min(score, 1);
  }
  
  async simulateExternalTransfer(remittanceTransaction) {
    // Simulate processing delay based on delivery method
    const metadata = remittanceTransaction.metadata;
    const delay = this.processingTimes[metadata.deliveryMethod] / 1000; // Convert to seconds
    
    // In production, this would integrate with external payment networks
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 5000))); // Max 5 second delay for testing
  }
  
  generateRemittanceTimeline(remittanceTransaction) {
    const timeline = [
      {
        status: 'created',
        timestamp: remittanceTransaction.createdAt,
        description: 'Remittance request created'
      }
    ];
    
    const metadata = remittanceTransaction.metadata;
    
    if (metadata.processingStartedAt) {
      timeline.push({
        status: 'processing',
        timestamp: metadata.processingStartedAt,
        description: 'Processing started'
      });
    }
    
    if (metadata.sentAt) {
      timeline.push({
        status: 'sent',
        timestamp: metadata.sentAt,
        description: 'Funds sent to recipient'
      });
    }
    
    if (remittanceTransaction.completedAt) {
      timeline.push({
        status: 'completed',
        timestamp: remittanceTransaction.completedAt,
        description: 'Remittance completed'
      });
    }
    
    return timeline;
  }
  
  async scheduleRemittanceProcessing(remittanceId, deliveryMethod) {
    // In production, this would queue the remittance for processing
    // based on the delivery method timing
    setTimeout(async () => {
      try {
        await this.processRemittance(remittanceId);
      } catch (error) {
        console.error(`Scheduled remittance processing failed for ${remittanceId}:`, error);
      }
    }, deliveryMethod === 'instant' ? 30000 : 300000); // 30s for instant, 5min for others in demo
  }
  
  async createComplianceRecord(complianceData) {
    const {
      remittanceId,
      senderId,
      receiverInfo,
      amount,
      purpose,
      riskScore
    } = complianceData;
    
    // In production, this would create compliance records for AML/KYC
    // and potentially flag transactions for manual review
    
    if (riskScore > 0.7 || parseFloat(amount) > 10000) {
      // Flag for manual review
      console.log(`High-risk remittance flagged for review: ${remittanceId}`);
    }
  }
  
  validateRemittanceRequest(remittanceData) {
    const {
      senderId, receiverInfo, amount, sourceCurrency,
      destinationCurrency, destinationCountry
    } = remittanceData;
    
    const errors = [];
    
    if (!senderId) {
      errors.push('Sender ID is required');
    }
    
    if (!receiverInfo || !receiverInfo.name) {
      errors.push('Receiver information is required');
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (!sourceCurrency || !destinationCurrency) {
      errors.push('Source and destination currencies are required');
    }
    
    if (!destinationCountry) {
      errors.push('Destination country is required');
    }
    
    // Minimum amount validation
    if (parseFloat(amount) < 1) {
      errors.push('Minimum remittance amount is 1');
    }
    
    // Maximum amount validation (regulatory compliance)
    if (parseFloat(amount) > 50000) {
      errors.push('Maximum remittance amount exceeded. Please contact support for large transfers.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new RemittanceService();