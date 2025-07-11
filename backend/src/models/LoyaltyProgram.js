// backend/src/models/LoyaltyProgram.js
const mongoose = require('mongoose');

const loyaltyProgramSchema = new mongoose.Schema({
    // User information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    
    // Current loyalty status
    status: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
        default: 'bronze'
    },
    
    // Points system
    points: {
        // Current available points
        current: {
            type: Number,
            default: 0,
            min: 0
        },
        
        // Total points earned lifetime
        totalEarned: {
            type: Number,
            default: 0
        },
        
        // Total points spent
        totalSpent: {
            type: Number,
            default: 0
        },
        
        // Points earned this month
        thisMonth: {
            type: Number,
            default: 0
        },
        
        // Points expiry tracking
        expiring: [{
            amount: Number,
            expiryDate: Date,
            source: String
        }]
    },
    
    // Activity tracking
    activity: {
        // Trading activity
        trades: {
            total: { type: Number, default: 0 },
            thisMonth: { type: Number, default: 0 },
            volume: { type: Number, default: 0 },
            volumeThisMonth: { type: Number, default: 0 }
        },
        
        // Login streak
        loginStreak: {
            current: { type: Number, default: 0 },
            longest: { type: Number, default: 0 },
            lastLogin: Date
        },
        
        // Referral activity
        referrals: {
            total: { type: Number, default: 0 },
            active: { type: Number, default: 0 },
            thisMonth: { type: Number, default: 0 }
        },
        
        // Social activity
        social: {
            shares: { type: Number, default: 0 },
            reviews: { type: Number, default: 0 },
            feedback: { type: Number, default: 0 }
        },
        
        // Educational activity
        education: {
            coursesCompleted: { type: Number, default: 0 },
            quizzesCompleted: { type: Number, default: 0 },
            articlesRead: { type: Number, default: 0 }
        }
    },
    
    // Benefits and perks
    benefits: {
        // Commission discounts
        commissionDiscount: {
            percentage: { type: Number, default: 0 },
            maxAmount: { type: Number, default: 0 }
        },
        
        // Withdrawal fee discounts
        withdrawalFeeDiscount: {
            percentage: { type: Number, default: 0 },
            freeWithdrawalsPerMonth: { type: Number, default: 0 },
            usedThisMonth: { type: Number, default: 0 }
        },
        
        // Enhanced features
        features: {
            prioritySupport: { type: Boolean, default: false },
            advancedCharts: { type: Boolean, default: false },
            higherLimits: { type: Boolean, default: false },
            exclusiveEvents: { type: Boolean, default: false },
            personalAccountManager: { type: Boolean, default: false }
        },
        
        // API benefits
        api: {
            higherRateLimit: { type: Number, default: 0 },
            additionalEndpoints: [String],
            webhookPriority: { type: Boolean, default: false }
        }
    },
    
    // Achievements and badges
    achievements: [{
        id: String,
        name: String,
        description: String,
        icon: String,
        category: {
            type: String,
            enum: ['trading', 'social', 'loyalty', 'referral', 'educational', 'special']
        },
        rarity: {
            type: String,
            enum: ['common', 'rare', 'epic', 'legendary']
        },
        pointsAwarded: Number,
        unlockedAt: {
            type: Date,
            default: Date.now
        },
        metadata: mongoose.Schema.Types.Mixed
    }],
    
    // Challenges and missions
    challenges: [{
        id: String,
        name: String,
        description: String,
        type: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'special', 'milestone']
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'expired', 'locked'],
            default: 'active'
        },
        progress: {
            current: { type: Number, default: 0 },
            target: Number,
            percentage: { type: Number, default: 0 }
        },
        rewards: {
            points: Number,
            badges: [String],
            bonuses: [{
                type: String,
                amount: Number,
                currency: String
            }]
        },
        startDate: Date,
        endDate: Date,
        completedAt: Date
    }],
    
    // Tier progression
    tierProgress: {
        // Current tier requirements
        currentTier: {
            name: String,
            requiredPoints: Number,
            requiredVolume: Number,
            requiredTrades: Number
        },
        
        // Next tier information
        nextTier: {
            name: String,
            requiredPoints: Number,
            requiredVolume: Number,
            requiredTrades: Number,
            pointsNeeded: Number,
            volumeNeeded: Number,
            tradesNeeded: Number
        },
        
        // Progress towards next tier
        progress: {
            points: { type: Number, default: 0 },
            volume: { type: Number, default: 0 },
            trades: { type: Number, default: 0 }
        }
    },
    
    // Special events and promotions
    events: [{
        eventId: String,
        name: String,
        type: String,
        participation: {
            joined: { type: Boolean, default: false },
            joinedAt: Date,
            completed: { type: Boolean, default: false },
            completedAt: Date
        },
        progress: mongoose.Schema.Types.Mixed,
        rewards: [{
            type: String,
            amount: Number,
            claimed: { type: Boolean, default: false },
            claimedAt: Date
        }]
    }],
    
    // Tenant/Organization
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    
    // Metadata
    metadata: {
        lastActivityDate: {
            type: Date,
            default: Date.now
        },
        lastPointsEarned: Date,
        lastTierChange: Date,
        totalDaysActive: { type: Number, default: 0 },
        preferences: {
            notifications: { type: Boolean, default: true },
            emailUpdates: { type: Boolean, default: true },
            challengeReminders: { type: Boolean, default: true }
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
loyaltyProgramSchema.index({ userId: 1 });
loyaltyProgramSchema.index({ tenantId: 1, status: 1 });
loyaltyProgramSchema.index({ 'points.current': -1 });
loyaltyProgramSchema.index({ 'activity.trades.volume': -1 });

// Virtual for tier name
loyaltyProgramSchema.virtual('tierName').get(function() {
    const tiers = {
        bronze: 'برنز',
        silver: 'نقره',
        gold: 'طلا',
        platinum: 'پلاتین',
        diamond: 'الماس'
    };
    return tiers[this.status] || 'نامشخص';
});

// Virtual for next tier info
loyaltyProgramSchema.virtual('nextTierInfo').get(function() {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(this.status);
    
    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
        return null; // Already at highest tier
    }
    
    return tierOrder[currentIndex + 1];
});

// Method to calculate tier requirements
loyaltyProgramSchema.statics.getTierRequirements = function() {
    return {
        bronze: { points: 0, volume: 0, trades: 0 },
        silver: { points: 1000, volume: 10000, trades: 50 },
        gold: { points: 5000, volume: 50000, trades: 200 },
        platinum: { points: 15000, volume: 150000, trades: 500 },
        diamond: { points: 50000, volume: 500000, trades: 1000 }
    };
};

// Method to add points
loyaltyProgramSchema.methods.addPoints = async function(amount, source = 'unknown', expiryDays = 365) {
    this.points.current += amount;
    this.points.totalEarned += amount;
    this.points.thisMonth += amount;
    
    // Add expiry tracking
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    
    this.points.expiring.push({
        amount: amount,
        expiryDate: expiryDate,
        source: source
    });
    
    this.metadata.lastPointsEarned = new Date();
    
    // Check for tier upgrade
    await this.checkTierUpgrade();
    
    await this.save();
    return this;
};

// Method to spend points
loyaltyProgramSchema.methods.spendPoints = async function(amount, reason = 'purchase') {
    if (this.points.current < amount) {
        throw new Error('امتیاز کافی موجود نیست');
    }
    
    this.points.current -= amount;
    this.points.totalSpent += amount;
    
    // Remove expired points first (FIFO)
    let remainingToDeduct = amount;
    this.points.expiring = this.points.expiring.filter(exp => {
        if (remainingToDeduct <= 0) return true;
        
        if (exp.amount <= remainingToDeduct) {
            remainingToDeduct -= exp.amount;
            return false; // Remove this entry
        } else {
            exp.amount -= remainingToDeduct;
            remainingToDeduct = 0;
            return true;
        }
    });
    
    await this.save();
    return this;
};

// Method to check tier upgrade
loyaltyProgramSchema.methods.checkTierUpgrade = async function() {
    const requirements = this.constructor.getTierRequirements();
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    
    let newTier = this.status;
    
    for (let i = tiers.length - 1; i >= 0; i--) {
        const tier = tiers[i];
        const req = requirements[tier];
        
        if (this.points.totalEarned >= req.points &&
            this.activity.trades.volume >= req.volume &&
            this.activity.trades.total >= req.trades) {
            newTier = tier;
            break;
        }
    }
    
    if (newTier !== this.status) {
        const oldTier = this.status;
        this.status = newTier;
        this.metadata.lastTierChange = new Date();
        
        // Update benefits
        await this.updateTierBenefits();
        
        // Award tier upgrade achievement
        await this.awardAchievement({
            id: `tier_${newTier}`,
            name: `سطح ${this.tierName}`,
            description: `ارتقا به سطح ${this.tierName}`,
            category: 'loyalty',
            rarity: newTier === 'diamond' ? 'legendary' : 'epic',
            pointsAwarded: 500
        });
        
        return { upgraded: true, from: oldTier, to: newTier };
    }
    
    return { upgraded: false };
};

// Method to update tier benefits
loyaltyProgramSchema.methods.updateTierBenefits = async function() {
    const benefitsMap = {
        bronze: {
            commissionDiscount: { percentage: 0, maxAmount: 0 },
            withdrawalFeeDiscount: { percentage: 0, freeWithdrawalsPerMonth: 0 },
            features: { prioritySupport: false, advancedCharts: false, higherLimits: false }
        },
        silver: {
            commissionDiscount: { percentage: 5, maxAmount: 100 },
            withdrawalFeeDiscount: { percentage: 10, freeWithdrawalsPerMonth: 1 },
            features: { prioritySupport: true, advancedCharts: false, higherLimits: false }
        },
        gold: {
            commissionDiscount: { percentage: 10, maxAmount: 250 },
            withdrawalFeeDiscount: { percentage: 25, freeWithdrawalsPerMonth: 3 },
            features: { prioritySupport: true, advancedCharts: true, higherLimits: true }
        },
        platinum: {
            commissionDiscount: { percentage: 15, maxAmount: 500 },
            withdrawalFeeDiscount: { percentage: 50, freeWithdrawalsPerMonth: 5 },
            features: { prioritySupport: true, advancedCharts: true, higherLimits: true, exclusiveEvents: true }
        },
        diamond: {
            commissionDiscount: { percentage: 25, maxAmount: 1000 },
            withdrawalFeeDiscount: { percentage: 75, freeWithdrawalsPerMonth: 10 },
            features: { 
                prioritySupport: true, 
                advancedCharts: true, 
                higherLimits: true, 
                exclusiveEvents: true, 
                personalAccountManager: true 
            }
        }
    };
    
    const benefits = benefitsMap[this.status];
    if (benefits) {
        this.benefits = { ...this.benefits.toObject(), ...benefits };
    }
};

// Method to award achievement
loyaltyProgramSchema.methods.awardAchievement = async function(achievement) {
    // Check if already awarded
    const existing = this.achievements.find(a => a.id === achievement.id);
    if (existing) return false;
    
    this.achievements.push(achievement);
    
    // Award points if specified
    if (achievement.pointsAwarded) {
        await this.addPoints(achievement.pointsAwarded, `achievement_${achievement.id}`);
    }
    
    return true;
};

module.exports = mongoose.model('LoyaltyProgram', loyaltyProgramSchema);

// backend/src/services/loyaltyService.js
const LoyaltyProgram = require('../models/LoyaltyProgram');
const User = require('../models/User');

class LoyaltyService {
    /**
     * Initialize loyalty program for new user
     */
    async initializeLoyaltyProgram(userId, tenantId) {
        try {
            // Check if already exists
            const existing = await LoyaltyProgram.findOne({ userId: userId });
            if (existing) {
                return existing;
            }
            
            const loyaltyProgram = new LoyaltyProgram({
                userId: userId,
                tenantId: tenantId,
                status: 'bronze'
            });
            
            await loyaltyProgram.save();
            
            // Award welcome achievement
            await loyaltyProgram.awardAchievement({
                id: 'welcome',
                name: 'خوش آمدید',
                description: 'عضویت در برنامه وفاداری',
                category: 'special',
                rarity: 'common',
                pointsAwarded: 100
            });
            
            return loyaltyProgram;
        } catch (error) {
            throw new Error(`خطا در مقداردهی اولیه برنامه وفاداری: ${error.message}`);
        }
    }
    
    /**
     * Award points for various activities
     */
    async awardPointsForActivity(userId, activity, data = {}) {
        try {
            const loyalty = await LoyaltyProgram.findOne({ userId: userId });
            if (!loyalty) {
                throw new Error('برنامه وفاداری یافت نشد');
            }
            
            const pointsRules = {
                'trade_completed': { base: 10, volumeMultiplier: 0.01 }, // 10 points + 0.01 per dollar
                'daily_login': { base: 5, streakBonus: 2 },
                'referral_signup': { base: 100 },
                'referral_first_trade': { base: 200 },
                'kyc_completed': { base: 500 },
                'social_share': { base: 25, dailyLimit: 100 },
                'review_written': { base: 150 },
                'course_completed': { base: 300 },
                'quiz_completed': { base: 50 }
            };
            
            const rule = pointsRules[activity];
            if (!rule) {
                throw new Error('قانون امتیازدهی یافت نشد');
            }
            
            let pointsToAward = rule.base;
            
            // Calculate additional points based on activity
            switch (activity) {
                case 'trade_completed':
                    const volume = data.volume || 0;
                    pointsToAward += Math.floor(volume * rule.volumeMultiplier);
                    
                    // Update trading activity
                    loyalty.activity.trades.total += 1;
                    loyalty.activity.trades.thisMonth += 1;
                    loyalty.activity.trades.volume += volume;
                    loyalty.activity.trades.volumeThisMonth += volume;
                    break;
                    
                case 'daily_login':
                    // Check login streak
                    const lastLogin = loyalty.activity.loginStreak.lastLogin;
                    const now = new Date();
                    const daysSinceLastLogin = lastLogin ? 
                        Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24)) : 1;
                    
                    if (daysSinceLastLogin === 1) {
                        loyalty.activity.loginStreak.current += 1;
                        pointsToAward += loyalty.activity.loginStreak.current * rule.streakBonus;
                    } else if (daysSinceLastLogin > 1) {
                        loyalty.activity.loginStreak.current = 1;
                    }
                    
                    loyalty.activity.loginStreak.lastLogin = now;
                    if (loyalty.activity.loginStreak.current > loyalty.activity.loginStreak.longest) {
                        loyalty.activity.loginStreak.longest = loyalty.activity.loginStreak.current;
                    }
                    break;
                    
                case 'social_share':
                    // Check daily limit
                    const today = new Date().toDateString();
                    const todayShares = loyalty.activity.social.shares || 0;
                    
                    if (todayShares >= rule.dailyLimit) {
                        throw new Error('محدودیت روزانه اشتراک‌گذاری');
                    }
                    
                    loyalty.activity.social.shares += 1;
                    break;
            }
            
            await loyalty.addPoints(pointsToAward, activity);
            
            // Check for achievements
            await this.checkAchievements(loyalty, activity, data);
            
            return {
                pointsAwarded: pointsToAward,
                totalPoints: loyalty.points.current,
                activity: activity,
                newAchievements: []
            };
        } catch (error) {
            throw new Error(`خطا در اعطای امتیاز: ${error.message}`);
        }
    }
    
    /**
     * Check and award achievements
     */
    async checkAchievements(loyalty, activity, data) {
        const achievements = [];
        
        // Trading achievements
        if (activity === 'trade_completed') {
            const milestones = [
                { trades: 10, id: 'trader_10', name: 'معامله‌گر مبتدی', points: 100 },
                { trades: 50, id: 'trader_50', name: 'معامله‌گر ماهر', points: 300 },
                { trades: 100, id: 'trader_100', name: 'معامله‌گر حرفه‌ای', points: 500 },
                { trades: 500, id: 'trader_500', name: 'معامله‌گر خبره', points: 1000 },
                { trades: 1000, id: 'trader_1000', name: 'استاد معامله', points: 2000 }
            ];
            
            for (const milestone of milestones) {
                if (loyalty.activity.trades.total >= milestone.trades) {
                    const awarded = await loyalty.awardAchievement({
                        id: milestone.id,
                        name: milestone.name,
                        description: `تکمیل ${milestone.trades} معامله`,
                        category: 'trading',
                        rarity: milestone.trades >= 500 ? 'epic' : 'common',
                        pointsAwarded: milestone.points
                    });
                    
                    if (awarded) achievements.push(milestone);
                }
            }
        }
        
        // Login streak achievements
        if (activity === 'daily_login') {
            const streakMilestones = [
                { days: 7, id: 'streak_7', name: 'یک هفته مداوم' },
                { days: 30, id: 'streak_30', name: 'یک ماه مداوم' },
                { days: 100, id: 'streak_100', name: 'صد روز مداوم' }
            ];
            
            for (const milestone of streakMilestones) {
                if (loyalty.activity.loginStreak.current >= milestone.days) {
                    const awarded = await loyalty.awardAchievement({
                        id: milestone.id,
                        name: milestone.name,
                        description: `${milestone.days} روز ورود مداوم`,
                        category: 'loyalty',
                        rarity: milestone.days >= 100 ? 'legendary' : 'rare',
                        pointsAwarded: milestone.days * 10
                    });
                    
                    if (awarded) achievements.push(milestone);
                }
            }
        }
        
        return achievements;
    }
    
    /**
     * Get user loyalty dashboard
     */
    async getLoyaltyDashboard(userId) {
        try {
            const loyalty = await LoyaltyProgram.findOne({ userId: userId });
            if (!loyalty) {
                throw new Error('برنامه وفاداری یافت نشد');
            }
            
            const requirements = LoyaltyProgram.getTierRequirements();
            const nextTier = loyalty.nextTierInfo;
            
            let progressToNext = null;
            if (nextTier) {
                const nextReq = requirements[nextTier];
                progressToNext = {
                    tier: nextTier,
                    progress: {
                        points: Math.min(100, (loyalty.points.totalEarned / nextReq.points) * 100),
                        volume: Math.min(100, (loyalty.activity.trades.volume / nextReq.volume) * 100),
                        trades: Math.min(100, (loyalty.activity.trades.total / nextReq.trades) * 100)
                    },
                    needed: {
                        points: Math.max(0, nextReq.points - loyalty.points.totalEarned),
                        volume: Math.max(0, nextReq.volume - loyalty.activity.trades.volume),
                        trades: Math.max(0, nextReq.trades - loyalty.activity.trades.total)
                    }
                };
            }
            
            // Get recent achievements
            const recentAchievements = loyalty.achievements
                .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
                .slice(0, 5);
            
            // Get active challenges
            const activeChallenges = loyalty.challenges.filter(c => c.status === 'active');
            
            return {
                currentTier: loyalty.status,
                tierName: loyalty.tierName,
                points: loyalty.points,
                benefits: loyalty.benefits,
                activity: loyalty.activity,
                progressToNext: progressToNext,
                recentAchievements: recentAchievements,
                activeChallenges: activeChallenges,
                totalAchievements: loyalty.achievements.length
            };
        } catch (error) {
            throw new Error(`خطا در دریافت داشبورد وفاداری: ${error.message}`);
        }
    }
    
    /**
     * Redeem points for rewards
     */
    async redeemPoints(userId, rewardId, pointsCost) {
        try {
            const loyalty = await LoyaltyProgram.findOne({ userId: userId });
            if (!loyalty) {
                throw new Error('برنامه وفاداری یافت نشد');
            }
            
            if (loyalty.points.current < pointsCost) {
                throw new Error('امتیاز کافی برای تبدیل وجود ندارد');
            }
            
            // Define available rewards
            const rewards = {
                'commission_discount_5': { points: 1000, benefit: 'تخفیف 5% کمیسیون برای 30 روز' },
                'commission_discount_10': { points: 2500, benefit: 'تخفیف 10% کمیسیون برای 30 روز' },
                'free_withdrawal': { points: 500, benefit: 'یک برداشت رایگان' },
                'priority_support': { points: 1500, benefit: 'پشتیبانی اولویت‌دار برای 30 روز' },
                'advanced_charts': { points: 2000, benefit: 'دسترسی به نمودارهای پیشرفته برای 60 روز' },
                'trading_bonus': { points: 5000, benefit: 'بونوس 100 دلاری معاملات' }
            };
            
            const reward = rewards[rewardId];
            if (!reward) {
                throw new Error('پاداش یافت نشد');
            }
            
            if (reward.points !== pointsCost) {
                throw new Error('هزینه امتیاز نادرست است');
            }
            
            // Spend points
            await loyalty.spendPoints(pointsCost, `reward_${rewardId}`);
            
            // Apply reward (this would integrate with other systems)
            await this.applyReward(userId, rewardId, reward);
            
            return {
                success: true,
                reward: reward,
                pointsSpent: pointsCost,
                remainingPoints: loyalty.points.current
            };
        } catch (error) {
            throw new Error(`خطا در تبدیل امتیاز: ${error.message}`);
        }
    }
    
    /**
     * Apply reward to user account
     */
    async applyReward(userId, rewardId, reward) {
        // This method would integrate with other systems to apply the actual reward
        // For now, we'll just log it
        console.log(`Applied reward ${rewardId} to user ${userId}:`, reward);
        
        // In a real implementation, this might:
        // - Add temporary commission discounts
        // - Grant free withdrawals
        // - Enable premium features
        // - Add trading bonuses
        // etc.
    }
    
    /**
     * Get loyalty program leaderboard
     */
    async getLeaderboard(tenantId, period = 'all', limit = 100) {
        try {
            let matchCondition = { tenantId: tenantId };
            
            if (period === 'month') {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                matchCondition.updatedAt = { $gte: startOfMonth };
            }
            
            const leaderboard = await LoyaltyProgram.aggregate([
                { $match: matchCondition },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        userId: 1,
                        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                        status: 1,
                        totalPoints: '$points.totalEarned',
                        currentPoints: '$points.current',
                        tradingVolume: '$activity.trades.volume',
                        totalTrades: '$activity.trades.total',
                        achievementCount: { $size: '$achievements' },
                        loginStreak: '$activity.loginStreak.current'
                    }
                },
                { $sort: { totalPoints: -1 } },
                { $limit: limit }
            ]);
            
            return leaderboard;
        } catch (error) {
            throw new Error(`خطا در دریافت جدول برترین‌ها: ${error.message}`);
        }
    }
}

module.exports = new LoyaltyService();
