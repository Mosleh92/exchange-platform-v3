// backend/src/models/CommissionStructure.js
const mongoose = require('mongoose');

const commissionStructureSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['trading', 'deposit', 'withdrawal', 'referral', 'staking'],
        required: true
    },
    
    // Trading Commission
    tradingFees: {
        maker: {
            percentage: { type: Number, default: 0.1 }, // 0.1%
            fixedAmount: { type: Number, default: 0 }
        },
        taker: {
            percentage: { type: Number, default: 0.1 }, // 0.1%
            fixedAmount: { type: Number, default: 0 }
        }
    },
    
    // Volume-based tiers
    volumeTiers: [{
        minVolume: { type: Number, required: true }, // 30-day volume in USD
        maxVolume: { type: Number },
        maker: {
            percentage: { type: Number, required: true },
            fixedAmount: { type: Number, default: 0 }
        },
        taker: {
            percentage: { type: Number, required: true },
            fixedAmount: { type: Number, default: 0 }
        },
        benefits: [String] // Additional benefits like reduced withdrawal fees
    }],
    
    // Deposit/Withdrawal Fees
    depositFees: [{
        currency: { type: String, required: true },
        percentage: { type: Number, default: 0 },
        fixedAmount: { type: Number, default: 0 },
        minAmount: { type: Number, default: 0 },
        maxAmount: { type: Number }
    }],
    
    withdrawalFees: [{
        currency: { type: String, required: true },
        percentage: { type: Number, default: 0 },
        fixedAmount: { type: Number, required: true },
        minAmount: { type: Number, required: true },
        maxAmount: { type: Number },
        processingTime: { type: String, default: '1-24 hours' }
    }],
    
    // Special conditions
    conditions: {
        minTradeAmount: { type: Number, default: 0 },
        maxTradeAmount: { type: Number },
        excludedPairs: [String],
        onlyPairs: [String],
        geographicRestrictions: [String],
        userTierRestrictions: [String]
    },
    
    // Referral commission
    referralCommission: {
        level1: { type: Number, default: 50 }, // 50% of commission
        level2: { type: Number, default: 25 }, // 25% of commission
        level3: { type: Number, default: 10 }, // 10% of commission
        maxLevels: { type: Number, default: 3 }
    },
    
    // Status and validity
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    
    // Tenant/Organization specific
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant'
    },
    
    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
commissionStructureSchema.index({ tenantId: 1, type: 1, isActive: 1 });
commissionStructureSchema.index({ 'volumeTiers.minVolume': 1 });
commissionStructureSchema.index({ startDate: 1, endDate: 1 });

// Virtual for current tier based on user volume
commissionStructureSchema.virtual('currentTier').get(function() {
    // This will be populated by the service based on user's volume
    return this._currentTier;
});

// Method to get applicable tier for a user volume
commissionStructureSchema.methods.getTierForVolume = function(volume) {
    if (!this.volumeTiers || this.volumeTiers.length === 0) {
        return {
            maker: this.tradingFees.maker,
            taker: this.tradingFees.taker
        };
    }
    
    // Sort tiers by minVolume in descending order
    const sortedTiers = this.volumeTiers.sort((a, b) => b.minVolume - a.minVolume);
    
    // Find the appropriate tier
    for (const tier of sortedTiers) {
        if (volume >= tier.minVolume && (!tier.maxVolume || volume < tier.maxVolume)) {
            return tier;
        }
    }
    
    // Return default if no tier matches
    return {
        maker: this.tradingFees.maker,
        taker: this.tradingFees.taker
    };
};

// Method to calculate commission for a trade
commissionStructureSchema.methods.calculateTradingCommission = function(orderType, amount, volume = 0) {
    const tier = this.getTierForVolume(volume);
    const feeStructure = orderType === 'maker' ? tier.maker : tier.taker;
    
    const percentageFee = (amount * feeStructure.percentage) / 100;
    const totalFee = percentageFee + (feeStructure.fixedAmount || 0);
    
    return {
        percentage: feeStructure.percentage,
        percentageFee: percentageFee,
        fixedFee: feeStructure.fixedAmount || 0,
        totalFee: totalFee,
        tier: tier
    };
};

// Method to calculate withdrawal fee
commissionStructureSchema.methods.calculateWithdrawalFee = function(currency, amount) {
    const feeStructure = this.withdrawalFees.find(fee => fee.currency === currency);
    
    if (!feeStructure) {
        return {
            error: 'Fee structure not found for currency',
            currency: currency
        };
    }
    
    const percentageFee = (amount * feeStructure.percentage) / 100;
    let totalFee = percentageFee + feeStructure.fixedAmount;
    
    // Apply min/max limits
    if (feeStructure.minAmount && totalFee < feeStructure.minAmount) {
        totalFee = feeStructure.minAmount;
    }
    if (feeStructure.maxAmount && totalFee > feeStructure.maxAmount) {
        totalFee = feeStructure.maxAmount;
    }
    
    return {
        percentage: feeStructure.percentage,
        percentageFee: percentageFee,
        fixedFee: feeStructure.fixedAmount,
        totalFee: totalFee,
        processingTime: feeStructure.processingTime,
        currency: currency
    };
};

module.exports = mongoose.model('CommissionStructure', commissionStructureSchema);

// backend/src/services/commissionService.js
const CommissionStructure = require('../models/CommissionStructure');
const User = require('../models/User');
const Trade = require('../models/Trade');

class CommissionService {
    /**
     * Get active commission structure for tenant
     */
    async getActiveCommissionStructure(tenantId, type = 'trading') {
        try {
            const now = new Date();
            
            const structure = await CommissionStructure.findOne({
                tenantId: tenantId,
                type: type,
                isActive: true,
                startDate: { $lte: now },
                $or: [
                    { endDate: null },
                    { endDate: { $gt: now } }
                ]
            }).sort({ createdAt: -1 });
            
            return structure;
        } catch (error) {
            throw new Error(`خطا در دریافت ساختار کمیسیون: ${error.message}`);
        }
    }
    
    /**
     * Calculate user's 30-day trading volume
     */
    async calculateUserVolume(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const pipeline = [
                {
                    $match: {
                        $or: [
                            { buyerId: userId },
                            { sellerId: userId }
                        ],
                        status: 'completed',
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalVolume: { $sum: { $multiply: ['$quantity', '$price'] } },
                        tradeCount: { $sum: 1 }
                    }
                }
            ];
            
            const result = await Trade.aggregate(pipeline);
            
            return {
                volume: result[0]?.totalVolume || 0,
                tradeCount: result[0]?.tradeCount || 0,
                period: days
            };
        } catch (error) {
            throw new Error(`خطا در محاسبه حجم معاملات: ${error.message}`);
        }
    }
    
    /**
     * Calculate commission for a trade
     */
    async calculateTradingCommission(userId, orderType, amount, pair, tenantId) {
        try {
            // Get user's volume
            const userVolume = await this.calculateUserVolume(userId);
            
            // Get commission structure
            const structure = await this.getActiveCommissionStructure(tenantId, 'trading');
            
            if (!structure) {
                throw new Error('ساختار کمیسیون یافت نشد');
            }
            
            // Check if pair is excluded or included
            if (structure.conditions.excludedPairs && 
                structure.conditions.excludedPairs.includes(pair)) {
                throw new Error('این جفت ارز از کمیسیون معاف است');
            }
            
            if (structure.conditions.onlyPairs && 
                structure.conditions.onlyPairs.length > 0 && 
                !structure.conditions.onlyPairs.includes(pair)) {
                throw new Error('این جفت ارز مشمول کمیسیون نیست');
            }
            
            // Check minimum trade amount
            if (amount < structure.conditions.minTradeAmount) {
                throw new Error(`حداقل مبلغ معامله ${structure.conditions.minTradeAmount} است`);
            }
            
            // Check maximum trade amount
            if (structure.conditions.maxTradeAmount && 
                amount > structure.conditions.maxTradeAmount) {
                throw new Error(`حداکثر مبلغ معامله ${structure.conditions.maxTradeAmount} است`);
            }
            
            // Calculate commission
            const commission = structure.calculateTradingCommission(
                orderType, 
                amount, 
                userVolume.volume
            );
            
            return {
                ...commission,
                userVolume: userVolume.volume,
                volumePeriod: '30 days',
                pair: pair,
                structure: structure.name
            };
        } catch (error) {
            throw new Error(`خطا در محاسبه کمیسیون: ${error.message}`);
        }
    }
    
    /**
     * Calculate withdrawal fee
     */
    async calculateWithdrawalFee(currency, amount, tenantId) {
        try {
            const structure = await this.getActiveCommissionStructure(tenantId, 'withdrawal');
            
            if (!structure) {
                throw new Error('ساختار کارمزد برداشت یافت نشد');
            }
            
            return structure.calculateWithdrawalFee(currency, amount);
        } catch (error) {
            throw new Error(`خطا در محاسبه کارمزد برداشت: ${error.message}`);
        }
    }
    
    /**
     * Create default commission structure for tenant
     */
    async createDefaultCommissionStructure(tenantId, createdBy) {
        try {
            const defaultStructure = new CommissionStructure({
                name: 'ساختار کمیسیون پیش‌فرض',
                description: 'ساختار کمیسیون استاندارد برای تمام معاملات',
                type: 'trading',
                tenantId: tenantId,
                tradingFees: {
                    maker: { percentage: 0.1, fixedAmount: 0 },
                    taker: { percentage: 0.1, fixedAmount: 0 }
                },
                volumeTiers: [
                    {
                        minVolume: 0,
                        maxVolume: 10000,
                        maker: { percentage: 0.1, fixedAmount: 0 },
                        taker: { percentage: 0.1, fixedAmount: 0 },
                        benefits: ['ساختار کمیسیون استاندارد']
                    },
                    {
                        minVolume: 10000,
                        maxVolume: 50000,
                        maker: { percentage: 0.08, fixedAmount: 0 },
                        taker: { percentage: 0.09, fixedAmount: 0 },
                        benefits: ['کمیسیون کاهش یافته', 'پشتیبانی اولویت‌دار']
                    },
                    {
                        minVolume: 50000,
                        maxVolume: 100000,
                        maker: { percentage: 0.06, fixedAmount: 0 },
                        taker: { percentage: 0.08, fixedAmount: 0 },
                        benefits: ['کمیسیون ویژه', 'API اختصاصی', 'پشتیبانی VIP']
                    },
                    {
                        minVolume: 100000,
                        maker: { percentage: 0.05, fixedAmount: 0 },
                        taker: { percentage: 0.07, fixedAmount: 0 },
                        benefits: ['کمترین کمیسیون', 'API پیشرفته', 'مدیر حساب اختصاصی']
                    }
                ],
                withdrawalFees: [
                    { currency: 'BTC', percentage: 0, fixedAmount: 0.0005, minAmount: 0.0005 },
                    { currency: 'ETH', percentage: 0, fixedAmount: 0.01, minAmount: 0.01 },
                    { currency: 'USDT', percentage: 0, fixedAmount: 5, minAmount: 5 },
                    { currency: 'USD', percentage: 0, fixedAmount: 10, minAmount: 10 }
                ],
                depositFees: [
                    { currency: 'BTC', percentage: 0, fixedAmount: 0 },
                    { currency: 'ETH', percentage: 0, fixedAmount: 0 },
                    { currency: 'USDT', percentage: 0, fixedAmount: 0 },
                    { currency: 'USD', percentage: 2.5, fixedAmount: 0, minAmount: 5 }
                ],
                referralCommission: {
                    level1: 50,
                    level2: 25,
                    level3: 10,
                    maxLevels: 3
                },
                conditions: {
                    minTradeAmount: 10,
                    maxTradeAmount: null,
                    excludedPairs: [],
                    onlyPairs: [],
                    geographicRestrictions: [],
                    userTierRestrictions: []
                },
                isActive: true,
                createdBy: createdBy
            });
            
            await defaultStructure.save();
            return defaultStructure;
        } catch (error) {
            throw new Error(`خطا در ایجاد ساختار کمیسیون: ${error.message}`);
        }
    }
    
    /**
     * Get user's current tier information
     */
    async getUserTierInfo(userId, tenantId) {
        try {
            const userVolume = await this.calculateUserVolume(userId);
            const structure = await this.getActiveCommissionStructure(tenantId, 'trading');
            
            if (!structure) {
                throw new Error('ساختار کمیسیون یافت نشد');
            }
            
            const currentTier = structure.getTierForVolume(userVolume.volume);
            
            // Find next tier
            const sortedTiers = structure.volumeTiers.sort((a, b) => a.minVolume - b.minVolume);
            const currentTierIndex = sortedTiers.findIndex(tier => 
                userVolume.volume >= tier.minVolume && 
                (!tier.maxVolume || userVolume.volume < tier.maxVolume)
            );
            
            const nextTier = currentTierIndex < sortedTiers.length - 1 ? 
                sortedTiers[currentTierIndex + 1] : null;
            
            return {
                currentVolume: userVolume.volume,
                currentTier: currentTier,
                nextTier: nextTier,
                volumeToNextTier: nextTier ? nextTier.minVolume - userVolume.volume : 0,
                allTiers: sortedTiers
            };
        } catch (error) {
            throw new Error(`خطا در دریافت اطلاعات سطح کاربر: ${error.message}`);
        }
    }
}

module.exports = new CommissionService();
