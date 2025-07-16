const logger = require('../utils/logger');
const ExchangeRateService = require('./exchangeRateService');

class AccountingService {
    /**
     * Calculate transaction amounts, net amounts, and commissions based on type, rates, and fees.
     * @param {Object} transaction - Transaction data including type, amounts, currencies, fee_type, fee_value.
     * @returns {Promise<Object>} Calculated amounts, rate, net_amount, and commission.
     */
    static async calculateTransactionAmounts(transaction) {
        try {
            const {
                type,
                amount_from,
                currency_from,
                currency_to,
                fee_type,
                fee_value,
            } = transaction;

            let calculatedAmountTo = 0;
            let commission = 0;
            let rate = 1;

            if (type === 'buy_aed' || type === 'sell_aed' || type === 'exchange') {
                rate = await ExchangeRateService.getApplicableRate(currency_from, currency_to, type);
                if (rate === null) {
                    throw new Error('Applicable exchange rate not found.');
                }
            }

            switch (type) {
                case 'buy_aed':
                    calculatedAmountTo = amount_from / rate;
                    break;

                case 'sell_aed':
                    calculatedAmountTo = amount_from * rate;
                    break;

                case 'withdraw_aed':
                case 'withdraw_irr':
                    calculatedAmountTo = amount_from;
                    break;
                case 'hold':
                case 'release_hold':
                    calculatedAmountTo = amount_from;
                    break;
                case 'exchange':
                    if (currency_from === 'IRR' && currency_to === 'AED') {
                        calculatedAmountTo = amount_from / rate;
                    } else if (currency_from === 'AED' && currency_to === 'IRR') {
                        calculatedAmountTo = amount_from * rate;
                    } else {
                        throw new Error('Unsupported exchange currency pair.');
                    }
                    break;

                default:
                    throw new Error('Invalid transaction type.');
            }

            if (fee_type && fee_value !== undefined) {
                if (fee_type === 'percentage') {
                    commission = (amount_from * parseFloat(fee_value)) / 100;
                } else if (fee_type === 'fixed') {
                    commission = parseFloat(fee_value);
                } else {
                    logger.warn(`Unknown fee type: ${fee_type}. No commission applied.`);
                }
            }
            const netAmount = calculatedAmountTo - commission;

            return {
                amount_to: calculatedAmountTo,
                rate: rate,
                commission: commission,
                net_amount: netAmount,
                receivedIRR: (currency_to === 'IRR' && type !== 'withdraw_irr') ? calculatedAmountTo : (currency_from === 'IRR' && type !== 'withdraw_irr' ? amount_from : 0),
                receivedAED: (currency_to === 'AED' && type !== 'withdraw_aed') ? calculatedAmountTo : (currency_from === 'AED' && type !== 'withdraw_aed' ? amount_from : 0),
                withdrawalAED: (type === 'withdraw_aed') ? amount_from : 0,
                withdrawalIRR: (type === 'withdraw_irr') ? amount_from : 0,
            };
        } catch (error) {
            logger.error('Transaction calculation error:', { message: error.message, transaction });
            throw new Error('خطا در محاسبه مبلغ تراکنش: ' + error.message);
        }
    }

    /**
     * Calculate account balances from transactions
     * @param {Array} transactions - List of transactions
     * @returns {Object} Account balances and totals
     */
    static calculateBalances(transactions) {
        try {
            // Calculate totals
            const totals = transactions.reduce((acc, t) => ({
                receivedAED: acc.receivedAED + (t.receivedAED || 0),
                receivedIRR: acc.receivedIRR + (t.receivedIRR || 0),
                amountAED: acc.amountAED + (t.amountAED || 0),
                amountIRR: acc.amountIRR + (t.amountIRR || 0),
                withdrawalAED: acc.withdrawalAED + (t.withdrawalAED || 0),
                withdrawalIRR: acc.withdrawalIRR + (t.withdrawalIRR || 0)
            }), {
                receivedAED: 0,
                receivedIRR: 0,
                amountAED: 0,
                amountIRR: 0,
                withdrawalAED: 0,
                withdrawalIRR: 0
            });

            // Calculate final balances
            const balances = {
                aedBalance: totals.amountAED - totals.withdrawalAED,
                irrBalance: totals.amountIRR - totals.withdrawalIRR
            };

            // Calculate unconverted amounts
            const unconverted = transactions.reduce((acc, t) => ({
                aedUnconverted: acc.aedUnconverted + (
                    !t.exchangeRateAEDIRR ? (t.receivedAED || 0) : 0
                ),
                irrUnconverted: acc.irrUnconverted + (
                    !t.exchangeRateIRRAED ? (t.receivedIRR || 0) : 0
                )
            }), {
                aedUnconverted: 0,
                irrUnconverted: 0
            });

            // Determine account status
            const status = {
                aedStatus: this.determineAccountStatus(balances.aedBalance),
                irrStatus: this.determineAccountStatus(balances.irrBalance)
            };

            return {
                ...totals,
                ...balances,
                ...unconverted,
                ...status
            };
        } catch (error) {
            logger.error('Balance calculation error:', error);
            throw error;
        }
    }

    /**
     * Determine account status based on balance
     * @param {number} balance - Account balance
     * @returns {Object} Status information
     */
    static determineAccountStatus(balance) {
        if (balance > 0) {
            return {
                text: 'بدهکار',
                class: 'status-debit',
                code: 'DEBIT'
            };
        } else if (balance < 0) {
            return {
                text: 'بستانکار',
                class: 'status-credit',
                code: 'CREDIT'
            };
        } else {
            return {
                text: 'وضعیت عادی',
                class: 'status-normal',
                code: 'NORMAL'
            };
        }
    }

    /**
     * Validate transaction data
     * @param {Object} transaction - Transaction data to validate
     * @returns {Object} Validation result
     */
    static validateTransaction(transaction) {
        const errors = [];

        // Required fields
        if (!transaction.type) {
            errors.push('نوع تراکنش الزامی است');
        }
        if (!transaction.date) {
            errors.push('تاریخ تراکنش الزامی است');
        }

        // Type-specific validations
        switch (transaction.type) {
            case 'buy_aed':
                if (!transaction.receivedIRR) {
                    errors.push('مبلغ تومان برای خرید درهم الزامی است');
                }
                if (!transaction.exchangeRateIRRAED) {
                    errors.push('نرخ تبدیل تومان به درهم الزامی است');
                }
                break;

            case 'sell_aed':
                if (!transaction.receivedAED) {
                    errors.push('مبلغ درهم برای فروش درهم الزامی است');
                }
                if (!transaction.exchangeRateAEDIRR) {
                    errors.push('نرخ تبدیل درهم به تومان الزامی است');
                }
                break;

            case 'withdraw_aed':
                if (!transaction.receivedAED) {
                    errors.push('مبلغ برداشت درهم الزامی است');
                }
                break;

            case 'withdraw_irr':
                if (!transaction.receivedIRR) {
                    errors.push('مبلغ برداشت تومان الزامی است');
                }
                break;

            case 'exchange':
                if (!transaction.exchangeRateIRRAED || !transaction.exchangeRateAEDIRR) {
                    errors.push('نرخ‌های تبدیل برای تبدیل ارز الزامی است');
                }
                if (!transaction.receivedIRR && !transaction.receivedAED) {
                    errors.push('حداقل یکی از مبالغ تومان یا درهم برای تبدیل الزامی است');
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = AccountingService; 