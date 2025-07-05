const mongoose = require('mongoose');
const AccountService = require('./AccountService');
const Transaction = require('../models/Transaction'); // Assuming Hold is a type of Transaction
const logger = require('../utils/logger');

class HoldManager {
    /**
     * Create a hold on a specified amount in an account.
     * This moves funds from 'available' to 'onHold'.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the account.
     * @param {string} currency - The currency code (e.g., 'AED', 'IRR').
     * @param {number} amount - The amount to put on hold.
     * @param {string} reason - The reason for the hold (e.g., 'customer_agreement', 'compliance_check').
     * @param {Object} options - Additional options like holdUntil, initiatedBy, notes.
     * @returns {Promise<Object>} The created hold transaction.
     */
    static async createHold(tenantId, accountId, currency, amount, reason, options = {}) {
        if (amount <= 0) {
            throw new Error('مبلغ برای Hold باید مثبت باشد.');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Get the account and check available balance
            const account = await AccountService.getAccount(tenantId, accountId);
            AccountService.initializeCurrencyBalance(account, currency); // Ensure currency exists

            const currentAvailable = account.balances.get(currency).available;
            if (currentAvailable < amount) {
                throw new Error('موجودی کافی برای Hold کردن نیست.');
            }

            // 2. Adjust balances in the AccountService (move from available to onHold)
            await AccountService.updateBalance(tenantId, accountId, currency, 'available', -amount, { session });
            await AccountService.updateBalance(tenantId, accountId, currency, 'onHold', amount, { session });

            // 3. Record the hold as a special transaction type
            const holdTransaction = new Transaction({
                tenant_id: tenantId,
                type: 'hold',
                currency_from: currency,
                currency_to: currency,
                amount_from: amount,
                amount_to: amount,
                rate: 1, // Rate is 1 for hold as it's not a currency conversion
                commission: 0,
                net_amount: amount,
                status: 'active',
                holdDetails: {
                    holdUntil: options.holdUntil || null,
                    reason: reason
                },
                metadata: {
                    initiatedBy: options.initiatedBy || 'system',
                    notes: options.notes || ''
                },
                // Assuming customer_id and customer_name might come from the context or be optional for holds
                customer_id: options.customerId || null, 
                customer_name: options.customerName || 'System Hold',
                created_by: options.userId || null,
                created_by_name: options.userName || 'System',
                transaction_code: `HOLD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Generate unique code
            });

            await holdTransaction.save({ session });

            await session.commitTransaction();

            logger.info('Hold created successfully', { holdId: holdTransaction._id, accountId, currency, amount, tenantId });
            return holdTransaction;
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error creating hold:', { error: error.message, tenantId, accountId, currency, amount, reason, options });
            throw new Error('خطا در ایجاد Hold: ' + error.message);
        } finally {
            session.endSession();
        }
    }

    /**
     * Release a hold on an account.
     * This moves funds from 'onHold' back to 'available'.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} holdTransactionId - The ID of the hold transaction to release.
     * @param {Object} releaseOptions - Options for release like releasedBy, notes, transferDetails.
     * @returns {Promise<Object>} The updated hold transaction and success status.
     */
    static async releaseHold(tenantId, holdTransactionId, releaseOptions = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Find the hold transaction
            const holdTransaction = await Transaction.findOne({
                _id: holdTransactionId,
                tenant_id: tenantId,
                type: 'hold',
                status: 'active'
            }).session(session);

            if (!holdTransaction) {
                throw new Error('Hold تراکنش فعال یافت نشد.');
            }

            const accountId = holdTransaction.accounts.source.accountId; // Assuming accounts field from your model
            const currency = holdTransaction.accounts.source.currency;
            const amount = holdTransaction.accounts.source.amount;

            // 2. Adjust balances in the AccountService (move from onHold to available)
            await AccountService.updateBalance(tenantId, accountId, currency, 'onHold', -amount, { session });
            await AccountService.updateBalance(tenantId, accountId, currency, 'available', amount, { session });

            // 3. Update the status of the hold transaction
            holdTransaction.status = 'released';
            holdTransaction.metadata.releasedBy = releaseOptions.releasedBy || 'system';
            holdTransaction.metadata.releaseNotes = releaseOptions.notes || '';
            holdTransaction.timestamps.completedAt = new Date();
            await holdTransaction.save({ session });

            await session.commitTransaction();

            logger.info('Hold released successfully', { holdId: holdTransaction._id, accountId, currency, amount, tenantId });
            return { success: true, holdTransaction };
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error releasing hold:', { error: error.message, tenantId, holdTransactionId, releaseOptions });
            throw new Error('خطا در آزادسازی Hold: ' + error.message);
        } finally {
            session.endSession();
        }
    }

    /**
     * Get all active holds for a specific account and currency (optional)
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the account.
     * @param {string} [currency] - Optional currency filter.
     * @returns {Promise<Array>} List of active hold transactions.
     */
    static async getActiveHolds(tenantId, accountId, currency = null) {
        try {
            const filter = {
                tenant_id: tenantId,
                type: 'hold',
                status: 'active',
                'accounts.source.accountId': accountId
            };
            if (currency) {
                filter['accounts.source.currency'] = currency;
            }
            const holds = await Transaction.find(filter).sort({ created_at: -1 });
            return holds;
        } catch (error) {
            logger.error('Error fetching active holds:', { error: error.message, tenantId, accountId, currency });
            throw new Error('خطا در دریافت Holdهای فعال: ' + error.message);
        }
    }
}

module.exports = HoldManager; 