const mongoose = require('mongoose');

const advancedOrderSchema = new mongoose.Schema({
  // Basic order info
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  
  // Order type
  orderType: {
    type: String,
    enum: ['market', 'limit', 'stop', 'stop_limit', 'oco', 'trailing_stop'],
    required: true
  },
  
  // Primary order details
  side: { type: String, enum: ['buy', 'sell'], required: true },
  currency: { type: String, required: true },
  baseCurrency: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.0001 },
  
  // Price levels
  limitPrice: { type: Number }, // For limit orders
  stopPrice: { type: Number },  // For stop orders
  triggerPrice: { type: Number }, // For stop-limit orders
  
  // OCO specific fields
  ocoOrders: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdvancedOrder' },
    type: { type: String, enum: ['limit', 'stop'] },
    price: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],
  
  // Trailing stop specific
  trailingStop: {
    activationPrice: { type: Number },
    callbackRate: { type: Number }, // Percentage
    trailingAmount: { type: Number }
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'active', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired'],
    default: 'pending'
  },
  
  // Execution tracking
  filledAmount: { type: Number, default: 0 },
  averagePrice: { type: Number },
  totalFee: { type: Number, default: 0 },
  
  // Time conditions
  timeInForce: {
    type: String,
    enum: ['GTC', 'IOC', 'FOK', 'GTX'], // Good Till Cancel, Immediate or Cancel, Fill or Kill, Good Till Crossing
    default: 'GTC'
  },
  expiryTime: { type: Date },
  
  // Market making specific
  isMarketMaker: { type: Boolean, default: false },
  spread: { type: Number }, // Bid-ask spread
  
  // High frequency trading
  hftSettings: {
    maxLatency: { type: Number }, // milliseconds
    cooldownPeriod: { type: Number }, // seconds
    maxOrdersPerSecond: { type: Number }
  },
  
  // Risk management
  riskSettings: {
    maxLoss: { type: Number },
    maxDrawdown: { type: Number },
    positionLimit: { type: Number }
  },
  
  // Audit trail
  executionHistory: [{
    timestamp: { type: Date, default: Date.now },
    action: { type: String, enum: ['created', 'activated', 'filled', 'cancelled', 'expired'] },
    price: { type: Number },
    amount: { type: Number },
    fee: { type: Number },
    notes: String
  }],
  
  // Metadata
  tags: [String],
  notes: String,
  externalOrderId: String, // For external exchange integration
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  activatedAt: { type: Date },
  filledAt: { type: Date },
  cancelledAt: { type: Date }
}, {
  timestamps: true
});

// Indexes for performance
advancedOrderSchema.index({ userId: 1, status: 1 });
advancedOrderSchema.index({ tenantId: 1, status: 1 });
advancedOrderSchema.index({ currency: 1, baseCurrency: 1, status: 1 });
advancedOrderSchema.index({ orderType: 1, status: 1 });
advancedOrderSchema.index({ createdAt: -1 });
advancedOrderSchema.index({ expiryTime: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
advancedOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Validate OCO orders
  if (this.orderType === 'oco' && (!this.ocoOrders || this.ocoOrders.length !== 2)) {
    return next(new Error('OCO orders must have exactly 2 sub-orders'));
  }
  
  // Validate stop-limit orders
  if (this.orderType === 'stop_limit' && (!this.stopPrice || !this.limitPrice)) {
    return next(new Error('Stop-limit orders require both stop and limit prices'));
  }
  
  next();
});

// Instance methods
advancedOrderSchema.methods.isActive = function() {
  return ['pending', 'active', 'partially_filled'].includes(this.status);
};

advancedOrderSchema.methods.canCancel = function() {
  return ['pending', 'active', 'partially_filled'].includes(this.status);
};

advancedOrderSchema.methods.getRemainingAmount = function() {
  return this.amount - this.filledAmount;
};

advancedOrderSchema.methods.isExpired = function() {
  return this.expiryTime && new Date() > this.expiryTime;
};

// Static methods
advancedOrderSchema.statics.findActiveOrders = function(userId) {
  return this.find({
    userId,
    status: { $in: ['pending', 'active', 'partially_filled'] }
  });
};

advancedOrderSchema.statics.findByCurrencyPair = function(currency, baseCurrency, status = 'active') {
  return this.find({
    currency,
    baseCurrency,
    status
  }).sort({ createdAt: -1 });
};

<<<<<<< HEAD
module.exports = mongoose.model('AdvancedOrder', advancedOrderSchema); 
=======
module.exports = mongoose.model('AdvancedOrder', advancedOrderSchema); 
>>>>>>> 9bbf1ecc9d48877375d9c66279f02298925b488d
