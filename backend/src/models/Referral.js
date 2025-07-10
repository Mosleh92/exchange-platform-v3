// backend/src/models/Referral.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const referralSchema = new mongoose.Schema({
    // Referrer (the person who refers)
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Referee (the person who was referred)
    refereeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Unique referral code
    referralCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    
    // Status of referral
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'expired', 'cancelled'],
        default: 'pending'
    },
    
    // Referral source
    source: {
        type: String,
        enum: ['link', 'code', 'email', 'social', 'api', 'other'],
        default: 'link'
    },
    
    // Commission tracking
    commission: {
        // Total commission earned
        totalEarned: {
            type: Number,
            default: 0
        },
        
        // Commission by currency
        byCurrency: [{
            currency: String,
            amount: Number,
            updatedAt: {
                type: Date,
                default: Date.now
            }
        }],
        
        // Last commission payment
        lastPayment: {
            amount: Number,
            currency: String,
            paidAt: Date,
            transactionId: String
        }
    },
    
    // Activity tracking
    activity: {
        // Registration metrics
        registrationDate: {
            type: Date,
            default: Date.now
        },
        firstTradeDate: Date,
        lastTradeDate: Date,
        
        // Volume metrics
        totalTradingVolume: {
            type: Number,
            default: 0
        },
        currentMonthVolume: {
            type: Number,
            default: 0
        },
        
        // Trade count
        totalTrades: {
            type: Number,
            default: 0
        },
        currentMonthTrades: {
            type: Number,
            default: 0
        }
    },
    
    // Tier and level information
    tier: {
        level: {
            type: Number,
            default: 1,
            min: 1,
            max: 10
        },
        commissionRate: {
            type: Number,
            default: 50 // 50% of platform commission
        },
        requirements: {
            minVolume: Number,
            minReferrals: Number,
            timeframe: String
        }
    },
    
    // Conditions and requirements
    conditions: {
        // Minimum activity required
        minTradingVolume: {
            type: Number,
            default: 1000
        },
        
        // Time limit for activation
        activationDeadline: {
            type: Date,
            default: function() {
                return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            }
        },
        
        // Geographic restrictions
        allowedCountries: [String],
        blockedCountries: [String],
        
        // User type restrictions
        allowedUserTypes: [String]
    },
    
    // Bonus and rewards
    bonuses: [{
        type: {
            type: String,
            enum: ['signup', 'first_trade', 'volume_milestone', 'loyalty', 'special']
        },
        amount: Number,
        currency: String,
        condition: String,
        awarded: {
            type: Boolean,
            default: false
        },
        awardedAt: Date,
        description: String
    }],
    
    // Tenant/Organization
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    
    // Metadata
    metadata: {
        ipAddress: String,
        userAgent: String,
        referrerUrl: String,
        campaign: String,
        medium: String,
        source: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
referralSchema.index({ referrerId: 1, status: 1 });
referralSchema.index({ refereeId: 1 });
referralSchema.index({ referralCode: 1 }, { unique: true });
referralSchema.index({ tenantId: 1, status: 1 });
referralSchema.index({ 'activity.registrationDate': -1 });

// Virtual for calculating commission rate based on tier
referralSchema.virtual('currentCommissionRate').get(function() {
    const baseRate = 50; // Base 50%
    const tierBonus = (this.tier.level - 1) * 5; // 5% per tier above 1
    return Math.min(baseRate + tierBonus, 80); // Max 80%
});

// Method to generate unique referral code
referralSchema.statics.generateReferralCode = async function(length = 8) {
    let code;
    let isUnique = false;
    
    while (!isUnique) {
        code = crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length)
            .toUpperCase();
        
        const existing = await this.findOne({ referralCode: code });
        if (!existing) {
            isUnique = true;
        }
    }
    
    return code;
};

// Method to calculate commission
referralSchema.methods.calculateCommission = function(tradeAmount, platformCommission) {
    const commissionRate = this.currentCommissionRate / 100;
    return platformCommission * commissionRate;
};

// Method to update activity
referralSchema.methods.updateActivity = async function(tradeData) {
    this.activity.lastTradeDate = new Date();
    this.activity.totalTradingVolume += tradeData.amount;
    this.activity.totalTrades += 1;
    
    // Update current month metrics
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (!this.activity.currentMonthUpdated || 
        new Date(this.activity.currentMonthUpdated).getMonth() !== currentMonth ||
        new Date(this.activity.currentMonthUpdated).getFullYear() !== currentYear) {
        this.activity.currentMonthVolume = 0;
        this.activity.currentMonthTrades = 0;
    }
    
    this.activity.currentMonthVolume += tradeData.amount;
    this.activity.currentMonthTrades += 1;
    this.activity.currentMonthUpdated = now;
    
    // Check for tier upgrade
    await this.checkTierUpgrade();
    
    await this.save();
};

// Method to check and upgrade tier
referralSchema.methods.checkTierUpgrade = async function() {
    const tierRequirements = [
        { level: 1, minVolume: 0, minReferrals: 0 },
        { level: 2, minVolume: 10000, minReferrals: 5 },
        { level: 3, minVolume: 50000, minReferrals: 15 },
        { level: 4, minVolume: 100000, minReferrals: 30 },
        { level: 5, minVolume: 250000, minReferrals: 50 },
        { level: 6, minVolume: 500000, minReferrals: 100 },
        { level: 7, minVolume: 1000000, minReferrals: 200 },
        { level: 8, minVolume: 2500000, minReferrals: 500 },
        { level: 9, minVolume: 5000000, minReferrals: 1000 },
        { level: 10, minVolume: 10000000, minReferrals: 2000 }
    ];
    
    // Count active referrals
    const activeReferrals = await this.constructor.countDocuments({
        referrerId: this.referrerId,
        status: 'active'
    });
    
    // Find appropriate tier
    for (let i = tierRequirements.length - 1; i >= 0; i--) {
        const requirement = tierRequirements[i];
        if (this.activity.totalTradingVolume >= requirement.minVolume &&
            activeReferrals >= requirement.minReferrals) {
            
            if (this.tier.level < requirement.level) {
                this.tier.level = requirement.level;
                this.tier.requirements = requirement;
                
                // Award tier upgrade bonus
                this.bonuses.push({
                    type: 'loyalty',
                    amount: requirement.level * 100, // $100 per tier
                    currency: 'USD',
                    condition: `Tier ${requirement.level} upgrade`,
                    description: `تبریک! به سطح ${requirement.level} ارتقا یافتید`,
                    awarded: false
                });
            }
            break;
        }
    }
};

module.exports = mongoose.model('Referral', referralSchema);

// backend/src/services/referralService.js
const Referral = require('../models/Referral');
const User = require('../models/User');
const CommissionService = require('./commissionService');

class ReferralService {
    /**
     * Create referral relationship
     */
    async createReferral(referrerId, refereeId, referralCode, metadata = {}) {
        try {
            // Check if referee already has a referrer
            const existingReferral = await Referral.findOne({ refereeId: refereeId });
            if (existingReferral) {
                throw new Error('کاربر قبلاً توسط شخص دیگری معرفی شده است');
            }
            
            // Check if trying to refer themselves
            if (referrerId.toString() === refereeId.toString()) {
                throw new Error('نمی‌توانید خودتان را معرفی کنید');
            }
            
            // Get referrer info
            const referrer = await User.findById(referrerId);
            if (!referrer) {
                throw new Error('کاربر معرف یافت نشد');
            }
            
            // Get referee info
            const referee = await User.findById(refereeId);
            if (!referee) {
                throw new Error('کاربر معرفی شده یافت نشد');
            }
            
            // Create referral record
            const referral = new Referral({
                referrerId: referrerId,
                refereeId: refereeId,
                referralCode: referralCode,
                tenantId: referrer.tenantId,
                status: 'pending',
                metadata: metadata,
                activity: {
                    registrationDate: new Date()
                }
            });
            
            await referral.save();
            
            // Award signup bonus to referrer
            await this.awardSignupBonus(referral);
            
            return referral;
        } catch (error) {
            throw new Error(`خطا در ایجاد ارجاع: ${error.message}`);
        }
    }
    
    /**
     * Generate unique referral code for user
     */
    async generateUserReferralCode(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }
            
            // Check if user already has a referral code
            if (user.referralCode) {
                return user.referralCode;
            }
            
            // Generate new code
            const code = await Referral.generateReferralCode();
            
            // Update user with referral code
            user.referralCode = code;
            await user.save();
            
            return code;
        } catch (error) {
            throw new Error(`خطا در تولید کد معرف: ${error.message}`);
        }
    }
    
    /**
     * Process referral commission from trade
     */
    async processReferralCommission(tradeData) {
        try {
            const { userId, amount, platformCommission, currency, tenantId } = tradeData;
            
            // Find referral relationship
            const referral = await Referral.findOne({
                refereeId: userId,
                status: { $in: ['active', 'pending'] }
            }).populate('referrerId', 'id email');
            
            if (!referral) {
                return null; // No referral relationship
            }
            
            // Activate referral if this is first trade
            if (referral.status === 'pending' && !referral.activity.firstTradeDate) {
                referral.status = 'active';
                referral.activity.firstTradeDate = new Date();
                
                // Award first trade bonus
                await this.awardFirstTradeBonus(referral);
            }
            
            // Calculate referral commission
            const commissionAmount = referral.calculateCommission(amount, platformCommission);
            
            // Update referral activity
            await referral.updateActivity({ amount: amount });
            
            // Update commission tracking
            referral.commission.totalEarned += commissionAmount;
            
            // Update currency-specific commission
            const currencyCommission = referral.commission.byCurrency.find(
                c => c.currency === currency
            );
            
            if (currencyCommission) {
                currencyCommission.amount += commissionAmount;
                currencyCommission.updatedAt = new Date();
            } else {
                referral.commission.byCurrency.push({
                    currency: currency,
                    amount: commissionAmount,
                    updatedAt: new Date()
                });
            }
            
            await referral.save();
            
            // Check for volume milestones
            await this.checkVolumeMilestones(referral);
            
            return {
                referralId: referral._id,
                referrerId: referral.referrerId._id,
                commissionAmount: commissionAmount,
                currency: currency,
                tier: referral.tier.level,
                totalEarned: referral.commission.totalEarned
            };
        } catch (error) {
            throw new Error(`خطا در پردازش کمیسیون ارجاع: ${error.message}`);
        }
    }
    
    /**
     * Get user's referral statistics
     */
    async getUserReferralStats(userId) {
        try {
            // Get referrals made by user
            const referralsMade = await Referral.find({ referrerId: userId })
                .populate('refereeId', 'firstName lastName email createdAt')
                .sort({ createdAt: -1 });
            
            // Calculate statistics
            const stats = {
                totalReferrals: referralsMade.length,
                activeReferrals: referralsMade.filter(r => r.status === 'active').length,
                pendingReferrals: referralsMade.filter(r => r.status === 'pending').length,
                totalCommissionEarned: referralsMade.reduce((sum, r) => sum + r.commission.totalEarned, 0),
                currentTier: Math.max(...referralsMade.map(r => r.tier.level), 1),
                totalVolume: referralsMade.reduce((sum, r) => sum + r.activity.totalTradingVolume, 0),
                currentMonthVolume: referralsMade.reduce((sum, r) => sum + r.activity.currentMonthVolume, 0)
            };
            
            // Get commission by currency
            const commissionByCurrency = {};
            referralsMade.forEach(referral => {
                referral.commission.byCurrency.forEach(commission => {
                    if (commissionByCurrency[commission.currency]) {
                        commissionByCurrency[commission.currency] += commission.amount;
                    } else {
                        commissionByCurrency[commission.currency] = commission.amount;
                    }
                });
            });
            
            stats.commissionByCurrency = commissionByCurrency;
            
            // Get recent referrals
            stats.recentReferrals = referralsMade.slice(0, 10).map(referral => ({
                id: referral._id,
                referee: {
                    name: `${referral.refereeId.firstName} ${referral.refereeId.lastName}`,
                    email: referral.refereeId.email,
                    joinDate: referral.refereeId.createdAt
                },
                status: referral.status,
                totalVolume: referral.activity.totalTradingVolume,
                commissionEarned: referral.commission.totalEarned,
                tier: referral.tier.level,
                registrationDate: referral.activity.registrationDate
            }));
            
            return stats;
        } catch (error) {
            throw new Error(`خطا در دریافت آمار ارجاع: ${error.message}`);
        }
    }
    
    /**
     * Award signup bonus
     */
    async awardSignupBonus(referral) {
        try {
            const signupBonus = {
                type: 'signup',
                amount: 50, // $50 signup bonus
                currency: 'USD',
                condition: 'Successful referral registration',
                description: 'پاداش ثبت‌نام کاربر معرفی شده',
                awarded: false
            };
            
            referral.bonuses.push(signupBonus);
            await referral.save();
            
            return signupBonus;
        } catch (error) {
            console.error('خطا در اعطای پاداش ثبت‌نام:', error);
        }
    }
    
    /**
     * Award first trade bonus
     */
    async awardFirstTradeBonus(referral) {
        try {
            const firstTradeBonus = {
                type: 'first_trade',
                amount: 100, // $100 first trade bonus
                currency: 'USD',
                condition: 'First trade completed',
                description: 'پاداش اولین معامله کاربر معرفی شده',
                awarded: false
            };
            
            referral.bonuses.push(firstTradeBonus);
            await referral.save();
            
            return firstTradeBonus;
        } catch (error) {
            console.error('خطا در اعطای پاداش اولین معامله:', error);
        }
    }
    
    /**
     * Check and award volume milestones
     */
    async checkVolumeMilestones(referral) {
        try {
            const milestones = [
                { volume: 10000, bonus: 200, description: 'رسیدن به حجم $10,000' },
                { volume: 50000, bonus: 500, description: 'رسیدن به حجم $50,000' },
                { volume: 100000, bonus: 1000, description: 'رسیدن به حجم $100,000' },
                { volume: 500000, bonus: 2500, description: 'رسیدن به حجم $500,000' },
                { volume: 1000000, bonus: 5000, description: 'رسیدن به حجم $1,000,000' }
            ];
            
            const currentVolume = referral.activity.totalTradingVolume;
            
            for (const milestone of milestones) {
                if (currentVolume >= milestone.volume) {
                    // Check if milestone already awarded
                    const alreadyAwarded = referral.bonuses.some(
                        bonus => bonus.type === 'volume_milestone' && 
                                bonus.condition.includes(milestone.volume.toString())
                    );
                    
                    if (!alreadyAwarded) {
                        const volumeBonus = {
                            type: 'volume_milestone',
                            amount: milestone.bonus,
                            currency: 'USD',
                            condition: `Volume milestone: $${milestone.volume}`,
                            description: milestone.description,
                            awarded: false
                        };
                        
                        referral.bonuses.push(volumeBonus);
                    }
                }
            }
            
            await referral.save();
        } catch (error) {
            console.error('خطا در بررسی نقاط عطف حجم:', error);
        }
    }
    
    /**
     * Get referral leaderboard
     */
    async getReferralLeaderboard(tenantId, period = 'all', limit = 100) {
        try {
            let matchCondition = { tenantId: tenantId };
            
            if (period === 'month') {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                matchCondition.createdAt = { $gte: startOfMonth };
            }
            
            const leaderboard = await Referral.aggregate([
                { $match: matchCondition },
                {
                    $group: {
                        _id: '$referrerId',
                        totalReferrals: { $sum: 1 },
                        activeReferrals: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        },
                        totalCommission: { $sum: '$commission.totalEarned' },
                        totalVolume: { $sum: '$activity.totalTradingVolume' },
                        avgTier: { $avg: '$tier.level' }
                    }
                },
                { $sort: { totalCommission: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        userId: '$_id',
                        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                        email: '$user.email',
                        totalReferrals: 1,
                        activeReferrals: 1,
                        totalCommission: 1,
                        totalVolume: 1,
                        avgTier: { $round: ['$avgTier', 1] }
                    }
                }
            ]);
            
            return leaderboard;
        } catch (error) {
            throw new Error(`خطا در دریافت جدول برترین‌ها: ${error.message}`);
        }
    }
}

module.exports = new ReferralService();
