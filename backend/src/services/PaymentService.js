const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const Web3 = require('web3');
const redis = require('redis');
const moment = require('moment');

class PaymentService {
  constructor() {
    this.wallets = new Map(); // UserId -> Wallet
    this.transactions = new Map(); // TransactionId -> Transaction
    this.paymentMethods = new Map(); // UserId -> PaymentMethods
    
    this.redis = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.config = {
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
      supportedCryptos: ['BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'DOT'],
      minDeposit: 10, // Minimum deposit amount
      maxDeposit: 100000, // Maximum deposit amount
      processingFee: 0.029, // 2.9% processing fee
      fixedFee: 0.30, // $0.30 fixed fee
      withdrawalFee: 0.01, // 1% withdrawal fee
      cryptoNetworkFees: {
        BTC: 0.0001,
        ETH: 0.005,
        USDT: 0.001,
        BNB: 0.0005
      }
    };
    
    this.paymentProviders = {
      stripe: this.initializeStripe(),
      paypal: this.initializePayPal(),
      crypto: this.initializeCrypto()
    };
    
    this.init();
  }

  async init() {
    try {
      await this.redis.connect();
      await this.initializeWallets();
      await this.startTransactionMonitoring();
      
      console.log('Payment Service initialized successfully');
    } catch (error) {
      console.error('Payment Service initialization failed:', error);
      throw error;
    }
  }

  // 💳 Payment Provider Initialization
  initializeStripe() {
    return {
      createPaymentIntent: async (amount, currency) => {
        return await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          automatic_payment_methods: {
            enabled: true,
          },
        });
      },
      
      confirmPayment: async (paymentIntentId) => {
        return await stripe.paymentIntents.retrieve(paymentIntentId);
      }
    };
  }

  initializePayPal() {
    const environment = new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    );
    const client = new paypal.core.PayPalHttpClient(environment);
    
    return {
      createOrder: async (amount, currency) => {
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: currency,
              value: amount.toString()
            }
          }]
        });
        
        return await client.execute(request);
      },
      
      captureOrder: async (orderId) => {
        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        return await client.execute(request);
      }
    };
  }

  initializeCrypto() {
    const web3 = new Web3(process.env.ETHEREUM_RPC_URL);
    
    return {
      web3,
      generateAddress: (network) => {
        const account = web3.eth.accounts.create();
        return {
          address: account.address,
          privateKey: account.privateKey,
          network
        };
      },
      
      getBalance: async (address, network) => {
        if (network === 'ETH') {
          const balance = await web3.eth.getBalance(address);
          return web3.utils.fromWei(balance, 'ether');
        }
        // Add other networks as needed
        return 0;
      },
      
      sendTransaction: async (fromAddress, toAddress, amount, privateKey, network) => {
        if (network === 'ETH') {
          const nonce = await web3.eth.getTransactionCount(fromAddress);
          const gasPrice = await web3.eth.getGasPrice();
          
          const transaction = {
            from: fromAddress,
            to: toAddress,
            value: web3.utils.toWei(amount.toString(), 'ether'),
            gas: 21000,
            gasPrice: gasPrice,
            nonce: nonce
          };
          
          const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
          return await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        }
        throw new Error(`Unsupported network: ${network}`);
      }
    };
  }

  // 💰 Wallet Management
  async initializeWallets() {
    // Initialize wallets for existing users
    const users = await this.getUsers(); // Mock function
    
    for (const user of users) {
      await this.createWallet(user.id);
    }
  }

  async createWallet(userId) {
    const wallet = {
      userId,
      balances: {},
      addresses: {},
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    // Initialize balances for all supported currencies
    for (const currency of this.config.supportedCurrencies) {
      wallet.balances[currency] = 0;
    }

    for (const crypto of this.config.supportedCryptos) {
      wallet.balances[crypto] = 0;
      wallet.addresses[crypto] = this.paymentProviders.crypto.generateAddress(crypto);
    }

    this.wallets.set(userId, wallet);
    await this.saveWalletToDatabase(wallet);
    
    return wallet;
  }

  async getWallet(userId) {
    let wallet = this.wallets.get(userId);
    
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }
    
    return wallet;
  }

  async updateWalletBalance(userId, currency, amount, type = 'add') {
    const wallet = await this.getWallet(userId);
    
    if (type === 'add') {
      wallet.balances[currency] = (wallet.balances[currency] || 0) + amount;
    } else if (type === 'subtract') {
      wallet.balances[currency] = (wallet.balances[currency] || 0) - amount;
    }
    
    wallet.lastUpdated = Date.now();
    this.wallets.set(userId, wallet);
    await this.saveWalletToDatabase(wallet);
    
    return wallet;
  }

  // 💳 Payment Processing
  async processDeposit(userId, amount, currency, paymentMethod, paymentData) {
    try {
      // Validate deposit
      const validation = this.validateDeposit(amount, currency);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Calculate fees
      const fees = this.calculateFees(amount, currency);
      const netAmount = amount - fees.total;

      // Process payment based on method
      let paymentResult;
      switch (paymentMethod) {
        case 'stripe':
          paymentResult = await this.processStripePayment(amount, currency, paymentData);
          break;
        case 'paypal':
          paymentResult = await this.processPayPalPayment(amount, currency, paymentData);
          break;
        case 'crypto':
          paymentResult = await this.processCryptoPayment(amount, currency, paymentData);
          break;
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      if (paymentResult.status === 'success') {
        // Update wallet balance
        await this.updateWalletBalance(userId, currency, netAmount, 'add');
        
        // Create transaction record
        const transaction = await this.createTransaction({
          userId,
          type: 'deposit',
          amount,
          currency,
          netAmount,
          fees: fees.total,
          paymentMethod,
          status: 'completed',
          paymentData: paymentResult
        });

        return {
          success: true,
          transactionId: transaction.id,
          amount: netAmount,
          fees: fees.total
        };
      } else {
        throw new Error(`Payment failed: ${paymentResult.error}`);
      }
    } catch (error) {
      throw new Error(`Deposit processing failed: ${error.message}`);
    }
  }

  async processWithdrawal(userId, amount, currency, withdrawalMethod, withdrawalData) {
    try {
      // Validate withdrawal
      const validation = this.validateWithdrawal(userId, amount, currency);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Calculate fees
      const fees = this.calculateWithdrawalFees(amount, currency);
      const netAmount = amount - fees.total;

      // Process withdrawal
      let withdrawalResult;
      switch (withdrawalMethod) {
        case 'bank':
          withdrawalResult = await this.processBankWithdrawal(amount, currency, withdrawalData);
          break;
        case 'crypto':
          withdrawalResult = await this.processCryptoWithdrawal(amount, currency, withdrawalData);
          break;
        default:
          throw new Error(`Unsupported withdrawal method: ${withdrawalMethod}`);
      }

      if (withdrawalResult.status === 'success') {
        // Update wallet balance
        await this.updateWalletBalance(userId, currency, amount, 'subtract');
        
        // Create transaction record
        const transaction = await this.createTransaction({
          userId,
          type: 'withdrawal',
          amount,
          currency,
          netAmount,
          fees: fees.total,
          withdrawalMethod,
          status: 'completed',
          withdrawalData: withdrawalResult
        });

        return {
          success: true,
          transactionId: transaction.id,
          amount: netAmount,
          fees: fees.total
        };
      } else {
        throw new Error(`Withdrawal failed: ${withdrawalResult.error}`);
      }
    } catch (error) {
      throw new Error(`Withdrawal processing failed: ${error.message}`);
    }
  }

  // 🔐 Payment Method Management
  async addPaymentMethod(userId, paymentMethod, paymentData) {
    const validation = this.validatePaymentMethod(paymentMethod, paymentData);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const userPaymentMethods = this.paymentMethods.get(userId) || [];
    
    const newPaymentMethod = {
      id: this.generatePaymentMethodId(),
      type: paymentMethod,
      data: this.encryptPaymentData(paymentData),
      isDefault: userPaymentMethods.length === 0,
      createdAt: Date.now(),
      lastUsed: null
    };

    userPaymentMethods.push(newPaymentMethod);
    this.paymentMethods.set(userId, userPaymentMethods);
    
    await this.savePaymentMethodsToDatabase(userId, userPaymentMethods);
    
    return newPaymentMethod;
  }

  async removePaymentMethod(userId, paymentMethodId) {
    const userPaymentMethods = this.paymentMethods.get(userId) || [];
    const updatedMethods = userPaymentMethods.filter(method => method.id !== paymentMethodId);
    
    this.paymentMethods.set(userId, updatedMethods);
    await this.savePaymentMethodsToDatabase(userId, updatedMethods);
    
    return { success: true };
  }

  // 💸 Transaction Management
  async createTransaction(transactionData) {
    const transaction = {
      id: this.generateTransactionId(),
      ...transactionData,
      timestamp: Date.now(),
      reference: this.generateReference()
    };

    this.transactions.set(transaction.id, transaction);
    await this.saveTransactionToDatabase(transaction);
    
    return transaction;
  }

  async getTransaction(transactionId) {
    return this.transactions.get(transactionId);
  }

  async getUserTransactions(userId, filters = {}) {
    let transactions = Array.from(this.transactions.values())
      .filter(tx => tx.userId === userId);

    // Apply filters
    if (filters.type) {
      transactions = transactions.filter(tx => tx.type === filters.type);
    }
    
    if (filters.currency) {
      transactions = transactions.filter(tx => tx.currency === filters.currency);
    }
    
    if (filters.status) {
      transactions = transactions.filter(tx => tx.status === filters.status);
    }
    
    if (filters.startDate) {
      transactions = transactions.filter(tx => tx.timestamp >= filters.startDate);
    }
    
    if (filters.endDate) {
      transactions = transactions.filter(tx => tx.timestamp <= filters.endDate);
    }

    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  }

  // 🔍 Validation & Security
  validateDeposit(amount, currency) {
    if (amount < this.config.minDeposit) {
      return { valid: false, error: `Minimum deposit amount is ${this.config.minDeposit} ${currency}` };
    }
    
    if (amount > this.config.maxDeposit) {
      return { valid: false, error: `Maximum deposit amount is ${this.config.maxDeposit} ${currency}` };
    }
    
    if (!this.config.supportedCurrencies.includes(currency) && !this.config.supportedCryptos.includes(currency)) {
      return { valid: false, error: `Unsupported currency: ${currency}` };
    }
    
    return { valid: true };
  }

  validateWithdrawal(userId, amount, currency) {
    const wallet = this.wallets.get(userId);
    if (!wallet) {
      return { valid: false, error: 'Wallet not found' };
    }
    
    const balance = wallet.balances[currency] || 0;
    if (balance < amount) {
      return { valid: false, error: 'Insufficient balance' };
    }
    
    return { valid: true };
  }

  validatePaymentMethod(paymentMethod, paymentData) {
    const requiredFields = {
      stripe: ['cardNumber', 'expiryMonth', 'expiryYear', 'cvc'],
      paypal: ['email'],
      crypto: ['address']
    };
    
    const required = requiredFields[paymentMethod];
    if (!required) {
      return { valid: false, error: `Unsupported payment method: ${paymentMethod}` };
    }
    
    for (const field of required) {
      if (!paymentData[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    
    return { valid: true };
  }

  // 💰 Fee Calculations
  calculateFees(amount, currency) {
    const processingFee = amount * this.config.processingFee;
    const fixedFee = this.config.fixedFee;
    const total = processingFee + fixedFee;
    
    return {
      processingFee,
      fixedFee,
      total
    };
  }

  calculateWithdrawalFees(amount, currency) {
    if (this.config.supportedCryptos.includes(currency)) {
      const networkFee = this.config.cryptoNetworkFees[currency] || 0;
      const withdrawalFee = amount * this.config.withdrawalFee;
      return {
        withdrawalFee,
        networkFee,
        total: withdrawalFee + networkFee
      };
    } else {
      const withdrawalFee = amount * this.config.withdrawalFee;
      return {
        withdrawalFee,
        networkFee: 0,
        total: withdrawalFee
      };
    }
  }

  // 🔐 Security & Encryption
  encryptPaymentData(data) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      algorithm
    };
  }

  decryptPaymentData(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipher(algorithm, key);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  // 🔄 Payment Processing Methods
  async processStripePayment(amount, currency, paymentData) {
    try {
      const paymentIntent = await this.paymentProviders.stripe.createPaymentIntent(amount, currency);
      
      return {
        status: 'success',
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async processPayPalPayment(amount, currency, paymentData) {
    try {
      const order = await this.paymentProviders.paypal.createOrder(amount, currency);
      const capture = await this.paymentProviders.paypal.captureOrder(order.result.id);
      
      return {
        status: 'success',
        orderId: order.result.id,
        captureId: capture.result.purchase_units[0].payments.captures[0].id,
        amount: amount,
        currency: currency
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async processCryptoPayment(amount, currency, paymentData) {
    try {
      // Verify crypto payment (mock implementation)
      const isValid = await this.verifyCryptoPayment(paymentData);
      
      if (isValid) {
        return {
          status: 'success',
          txHash: paymentData.txHash,
          amount: amount,
          currency: currency
        };
      } else {
        return {
          status: 'failed',
          error: 'Invalid crypto payment'
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  async verifyCryptoPayment(paymentData) {
    // Mock verification - in real implementation, verify on blockchain
    return paymentData.txHash && paymentData.txHash.length > 0;
  }

  async processBankWithdrawal(amount, currency, withdrawalData) {
    // Mock bank withdrawal processing
    return {
      status: 'success',
      reference: this.generateReference(),
      estimatedDelivery: moment().add(3, 'days').toDate()
    };
  }

  async processCryptoWithdrawal(amount, currency, withdrawalData) {
    try {
      const result = await this.paymentProviders.crypto.sendTransaction(
        withdrawalData.fromAddress,
        withdrawalData.toAddress,
        amount,
        withdrawalData.privateKey,
        currency
      );
      
      return {
        status: 'success',
        txHash: result.transactionHash,
        network: currency
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  // 📊 Monitoring & Analytics
  async startTransactionMonitoring() {
    setInterval(() => {
      this.monitorTransactions();
    }, 60000); // Check every minute
  }

  async monitorTransactions() {
    const pendingTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.status === 'pending');
    
    for (const transaction of pendingTransactions) {
      await this.checkTransactionStatus(transaction);
    }
  }

  async checkTransactionStatus(transaction) {
    // Check if pending transactions have been confirmed
    if (transaction.paymentMethod === 'crypto') {
      const isConfirmed = await this.verifyCryptoTransaction(transaction);
      if (isConfirmed) {
        transaction.status = 'completed';
        await this.updateWalletBalance(transaction.userId, transaction.currency, transaction.netAmount, 'add');
      }
    }
  }

  async verifyCryptoTransaction(transaction) {
    // Mock verification - in real implementation, check blockchain
    return Math.random() > 0.5; // 50% chance of confirmation
  }

  // 🔧 Utility Methods
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generatePaymentMethodId() {
    return `PM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateReference() {
    return `REF_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  // 📊 Reporting
  async generatePaymentReport(timeRange = '24h') {
    const startTime = moment().subtract(1, timeRange).toDate();
    
    const transactions = Array.from(this.transactions.values())
      .filter(tx => tx.timestamp >= startTime.getTime());

    const report = {
      period: timeRange,
      totalTransactions: transactions.length,
      totalVolume: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      totalFees: transactions.reduce((sum, tx) => sum + tx.fees, 0),
      deposits: transactions.filter(tx => tx.type === 'deposit'),
      withdrawals: transactions.filter(tx => tx.type === 'withdrawal'),
      byCurrency: this.groupTransactionsByCurrency(transactions),
      byPaymentMethod: this.groupTransactionsByPaymentMethod(transactions)
    };

    return report;
  }

  groupTransactionsByCurrency(transactions) {
    const grouped = {};
    
    transactions.forEach(tx => {
      if (!grouped[tx.currency]) {
        grouped[tx.currency] = { count: 0, volume: 0 };
      }
      grouped[tx.currency].count++;
      grouped[tx.currency].volume += tx.amount;
    });
    
    return grouped;
  }

  groupTransactionsByPaymentMethod(transactions) {
    const grouped = {};
    
    transactions.forEach(tx => {
      const method = tx.paymentMethod || tx.withdrawalMethod;
      if (!grouped[method]) {
        grouped[method] = { count: 0, volume: 0 };
      }
      grouped[method].count++;
      grouped[method].volume += tx.amount;
    });
    
    return grouped;
  }

  // 🗄️ Database Operations (Mock)
  async saveWalletToDatabase(wallet) {
    // Mock database save
    await this.redis.set(`wallet:${wallet.userId}`, JSON.stringify(wallet));
  }

  async savePaymentMethodsToDatabase(userId, paymentMethods) {
    // Mock database save
    await this.redis.set(`payment_methods:${userId}`, JSON.stringify(paymentMethods));
  }

  async saveTransactionToDatabase(transaction) {
    // Mock database save
    await this.redis.set(`transaction:${transaction.id}`, JSON.stringify(transaction));
  }

  async getUsers() {
    // Mock user retrieval
    return [{ id: 'user1' }, { id: 'user2' }];
  }
}

module.exports = new PaymentService(); 