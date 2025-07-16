// backend/src/utils/feeCalculator.js
const CommissionService = require('../services/commissionService');

class FeeCalculator {
    constructor() {
        this.commission = CommissionService;
    }
    
    /**
     * Calculate all fees for a trade
     */
    async calculateTradeFees(tradeData) {
        try {
            const {
                userId,
                orderType, // 'maker' or 'taker'
                quantity,
                price,
                pair,
                tenantId
            } = tradeData;
            
            const amount = quantity * price;
            
            // Get trading commission
            const tradingFee = await this.commission.calculateTradingCommission(
                userId, orderType, amount, pair, tenantId
            );
            
            // Calculate network fees if applicable
            const networkFee = await this.calculateNetworkFee(pair, quantity);
            
            // Calculate any additional fees
            const additionalFees = await this.calculateAdditionalFees(tradeData);
            
            const totalFees = tradingFee.totalFee + networkFee.totalFee + additionalFees.totalFee;
            
            return {
                tradingFee: tradingFee,
                networkFee: networkFee,
                additionalFees: additionalFees,
                totalFees: totalFees,
                netAmount: amount - totalFees,
                breakdown: {
                    grossAmount: amount,
                    tradingFeeAmount: tradingFee.totalFee,
                    networkFeeAmount: networkFee.totalFee,
                    additionalFeeAmount: additionalFees.totalFee,
                    totalFeeAmount: totalFees,
                    netReceived: amount - totalFees
                }
            };
        } catch (error) {
            throw new Error(`خطا در محاسبه کارمزدها: ${error.message}`);
        }
    }
    
    /**
     * Calculate deposit fees
     */
    async calculateDepositFee(currency, amount, method, tenantId) {
        try {
            const structure = await this.commission.getActiveCommissionStructure(tenantId, 'deposit');
            
            if (!structure) {
                return { totalFee: 0, breakdown: { message: 'بدون کارمزد' } };
            }
            
            const feeStructure = structure.depositFees.find(fee => fee.currency === currency);
            
            if (!feeStructure) {
                return { totalFee: 0, breakdown: { message: 'کارمزد تعریف نشده' } };
            }
            
            const percentageFee = (amount * feeStructure.percentage) / 100;
            let totalFee = percentageFee + feeStructure.fixedAmount;
            
            // Apply minimum fee
            if (feeStructure.minAmount && totalFee < feeStructure.minAmount) {
                totalFee = feeStructure.minAmount;
            }
            
            // Apply maximum fee
            if (feeStructure.maxAmount && totalFee > feeStructure.maxAmount) {
                totalFee = feeStructure.maxAmount;
            }
            
            return {
                totalFee: totalFee,
                breakdown: {
                    currency: currency,
                    amount: amount,
                    method: method,
                    percentageFee: percentageFee,
                    fixedFee: feeStructure.fixedAmount,
                    totalFee: totalFee,
                    netDeposit: amount - totalFee
                }
            };
        } catch (error) {
            throw new Error(`خطا در محاسبه کارمزد واریز: ${error.message}`);
        }
    }
    
    /**
     * Calculate withdrawal fees
     */
    async calculateWithdrawalFee(currency, amount, method, tenantId, userId = null) {
        try {
            // Get base withdrawal fee
            const baseFee = await this.commission.calculateWithdrawalFee(currency, amount, tenantId);
            
            if (baseFee.error) {
                throw new Error(baseFee.error);
            }
            
            // Calculate network fee for crypto withdrawals
            let networkFee = 0;
            if (this.isCryptoCurrency(currency)) {
                const networkFeeData = await this.calculateNetworkFee(currency, amount);
                networkFee = networkFeeData.totalFee;
            }
            
            // Check for VIP discounts if user provided
            let discount = 0;
            if (userId) {
                discount = await this.calculateVIPDiscount(userId, tenantId, 'withdrawal');
            }
            
            const grossFee = baseFee.totalFee + networkFee;
            const discountAmount = (grossFee * discount) / 100;
            const totalFee = grossFee - discountAmount;
            
            return {
                totalFee: totalFee,
                breakdown: {
                    currency: currency,
                    amount: amount,
                    method: method,
                    baseFee: baseFee.totalFee,
                    networkFee: networkFee,
                    grossFee: grossFee,
                    discount: discount,
                    discountAmount: discountAmount,
                    totalFee: totalFee,
                    netWithdrawal: amount - totalFee,
                    processingTime: baseFee.processingTime
                }
            };
        } catch (error) {
            throw new Error(`خطا در محاسبه کارمزد برداشت: ${error.message}`);
        }
    }
    
    /**
     * Calculate network fees for cryptocurrency transactions
     */
    async calculateNetworkFee(currency, amount) {
        try {
            const networkFees = {
                'BTC': { 
                    fast: 0.0003, 
                    standard: 0.0002, 
                    slow: 0.0001,
                    estimateTime: { fast: '10 min', standard: '30 min', slow: '60 min' }
                },
                'ETH': { 
                    fast: 0.02, 
                    standard: 0.015, 
                    slow: 0.01,
                    estimateTime: { fast: '2 min', standard: '5 min', slow: '10 min' }
                },
                'USDT': { 
                    fast: 15, 
                    standard: 10, 
                    slow: 5,
                    estimateTime: { fast: '2 min', standard: '5 min', slow: '10 min' }
                },
                'BNB': { 
                    fast: 0.001, 
                    standard: 0.0008, 
                    slow: 0.0005,
                    estimateTime: { fast: '3 sec', standard: '5 sec', slow: '10 sec' }
                }
            };
            
            const feeData = networkFees[currency];
            
            if (!feeData) {
                return { 
                    totalFee: 0, 
                    breakdown: { message: 'شبکه پشتیبانی نمی‌شود' }
                };
            }
            
            return {
                totalFee: feeData.standard, // Default to standard
                breakdown: {
                    currency: currency,
                    amount: amount,
                    options: {
                        fast: { 
                            fee: feeData.fast, 
                            time: feeData.estimateTime.fast 
                        },
                        standard: { 
                            fee: feeData.standard, 
                            time: feeData.estimateTime.standard 
                        },
                        slow: { 
                            fee: feeData.slow, 
                            time: feeData.estimateTime.slow 
                        }
                    },
                    selected: 'standard'
                }
            };
        } catch (error) {
            throw new Error(`خطا در محاسبه کارمزد شبکه: ${error.message}`);
        }
    }
    
    /**
     * Calculate additional fees (premium features, rush processing, etc.)
     */
    async calculateAdditionalFees(tradeData) {
        try {
            let totalAdditionalFee = 0;
            const breakdown = {};
            
            // Rush processing fee
            if (tradeData.rushProcessing) {
                const rushFee = tradeData.amount * 0.001; // 0.1% for rush processing
                totalAdditionalFee += rushFee;
                breakdown.rushProcessing = rushFee;
            }
            
            // Premium features fee
            if (tradeData.premiumFeatures && tradeData.premiumFeatures.length > 0) {
                const premiumFee = tradeData.amount * 0.0005; // 0.05% for premium features
                totalAdditionalFee += premiumFee;
                breakdown.premiumFeatures = premiumFee;
            }
            
            // Large order fee (for orders > $100k)
            if (tradeData.amount > 100000) {
                const largeOrderFee = (tradeData.amount - 100000) * 0.0001; // 0.01% on amount above 100k
                totalAdditionalFee += largeOrderFee;
                breakdown.largeOrderFee = largeOrderFee;
            }
            
            return {
                totalFee: totalAdditionalFee,
                breakdown: breakdown
            };
        } catch (error) {
            throw new Error(`خطا در محاسبه کارمزدهای اضافی: ${error.message}`);
        }
    }
    
    /**
     * Calculate VIP discount for users
     */
    async calculateVIPDiscount(userId, tenantId, feeType = 'trading') {
        try {
            const tierInfo = await this.commission.getUserTierInfo(userId, tenantId);
            
            if (!tierInfo.currentTier || !tierInfo.currentTier.benefits) {
                return 0;
            }
            
            // Define discount rates based on tier
            const discountRates = {
                'trading': {
                    tier1: 0,    // 0% discount
                    tier2: 5,    // 5% discount
                    tier3: 10,   // 10% discount
                    tier4: 15    // 15% discount
                },
                'withdrawal': {
                    tier1: 0,    // 0% discount
                    tier2: 10,   // 10% discount
                    tier3: 25,   // 25% discount
                    tier4: 50    // 50% discount
                }
            };
            
            // Determine tier level based on volume
            let tierLevel = 'tier1';
            if (tierInfo.currentVolume >= 100000) tierLevel = 'tier4';
            else if (tierInfo.currentVolume >= 50000) tierLevel = 'tier3';
            else if (tierInfo.currentVolume >= 10000) tierLevel = 'tier2';
            
            return discountRates[feeType][tierLevel] || 0;
        } catch (error) {
            console.error('خطا در محاسبه تخفیف VIP:', error);
            return 0;
        }
    }
    
    /**
     * Get fee estimate for UI display
     */
    async getFeeEstimate(estimateData) {
        try {
            const {
                operation, // 'trade', 'deposit', 'withdrawal'
                userId,
                tenantId,
                currency,
                amount,
                orderType,
                pair,
                method
            } = estimateData;
            
            let feeData = {};
            
            switch (operation) {
                case 'trade':
                    feeData = await this.calculateTradeFees({
                        userId,
                        orderType,
                        quantity: amount / estimateData.price,
                        price: estimateData.price,
                        pair,
                        tenantId
                    });
                    break;
                    
                case 'deposit':
                    feeData = await this.calculateDepositFee(currency, amount, method, tenantId);
                    break;
                    
                case 'withdrawal':
                    feeData = await this.calculateWithdrawalFee(currency, amount, method, tenantId, userId);
                    break;
                    
                default:
                    throw new Error('نوع عملیات نامعتبر');
            }
            
            return {
                operation: operation,
                currency: currency,
                amount: amount,
                estimatedFee: feeData.totalFee,
                breakdown: feeData.breakdown,
                timestamp: new Date()
            };
        } catch (error) {
            throw new Error(`خطا در برآورد کارمزد: ${error.message}`);
        }
    }
    
    /**
     * Bulk fee calculation for multiple operations
     */
    async calculateBulkFees(operations) {
        try {
            const results = [];
            
            for (const operation of operations) {
                try {
                    const feeData = await this.getFeeEstimate(operation);
                    results.push({
                        success: true,
                        operationId: operation.id,
                        data: feeData
                    });
                } catch (error) {
                    results.push({
                        success: false,
                        operationId: operation.id,
                        error: error.message
                    });
                }
            }
            
            const totalEstimatedFees = results
                .filter(r => r.success)
                .reduce((sum, r) => sum + r.data.estimatedFee, 0);
            
            return {
                results: results,
                summary: {
                    total: operations.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length,
                    totalEstimatedFees: totalEstimatedFees
                }
            };
        } catch (error) {
            throw new Error(`خطا در محاسبه کارمزدهای گروهی: ${error.message}`);
        }
    }
    
    /**
     * Helper method to check if currency is cryptocurrency
     */
    isCryptoCurrency(currency) {
        const cryptoCurrencies = ['BTC', 'ETH', 'LTC', 'XRP', 'ADA', 'DOT', 'BNB', 'USDT', 'USDC'];
        return cryptoCurrencies.includes(currency.toUpperCase());
    }
    
    /**
     * Get fee schedule for a tenant
     */
    async getFeeSchedule(tenantId, type = 'all') {
        try {
            const schedules = {};
            
            if (type === 'all' || type === 'trading') {
                schedules.trading = await this.commission.getActiveCommissionStructure(tenantId, 'trading');
            }
            
            if (type === 'all' || type === 'deposit') {
                schedules.deposit = await this.commission.getActiveCommissionStructure(tenantId, 'deposit');
            }
            
            if (type === 'all' || type === 'withdrawal') {
                schedules.withdrawal = await this.commission.getActiveCommissionStructure(tenantId, 'withdrawal');
            }
            
            return schedules;
        } catch (error) {
            throw new Error(`خطا در دریافت جدول کارمزدها: ${error.message}`);
        }
    }
}

module.exports = new FeeCalculator();
