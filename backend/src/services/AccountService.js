const Account = require('../models/Account');
const logger = require('../utils/logger');

class AccountService {
    /**
     * Create a new account for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} userId - The ID of the user creating the account.
     * @param {Object} accountData - The account data (e.g., account_name, customer_id, country, initial balances).
     * @returns {Promise<Object>} The created account object.
     */
    static async createAccount(tenantId, userId, accountData) {
        try {
            const newAccount = new Account({
                ...accountData,
                tenant_id: tenantId,
                created_by: userId,
                // Ensure balances map is initialized if not provided
                balances: accountData.balances || {}
            });
            await newAccount.save();
            logger.info('Account created successfully', { accountId: newAccount._id, tenantId });
            return newAccount;
        } catch (error) {
            logger.error('Error creating account:', { error: error.message, tenantId, accountData });
            if (error.code === 11000) {
                throw new Error('شماره حساب یا نام حساب برای این سازمان قبلاً ثبت شده است.');
            }
            throw new Error('خطا در ثبت حساب جدید: ' + error.message);
        }
    }

    /**
     * Get an account by its ID for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the account.
     * @returns {Promise<Object>} The account object.
     */
    static async getAccount(tenantId, accountId) {
        try {
            const account = await Account.findOne({ _id: accountId, tenant_id: tenantId });
            if (!account) {
                throw new Error('حساب یافت نشد.');
            }
            return account;
        } catch (error) {
            logger.error('Error fetching account by ID:', { error: error.message, tenantId, accountId });
            throw new Error('خطا در دریافت حساب: ' + error.message);
        }
    }

    /**
     * Get all accounts for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {Object} query - Optional query parameters for filtering (e.g., customer_id, account_name).
     * @returns {Promise<Array>} List of account objects.
     */
    static async getAccounts(tenantId, query = {}) {
        try {
            const filter = { tenant_id: tenantId };
            if (query.customer_id) filter.customer_id = query.customer_id;
            if (query.account_name) filter.account_name = { $regex: query.account_name, $options: 'i' };
            if (query.account_number) filter.account_number = query.account_number;
            if (query.status) filter.status = query.status;

            const accounts = await Account.find(filter).sort({ created_at: -1 });
            return accounts;
        } catch (error) {
            logger.error('Error fetching accounts:', { error: error.message, tenantId, query });
            throw new Error('خطا در دریافت لیست حساب‌ها: ' + error.message);
        }
    }

    /**
     * Update an account's details for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the account to update.
     * @param {string} userId - The ID of the user performing the update.
     * @param {Object} updateData - The data to update (excluding balances, which are handled by dedicated methods).
     * @returns {Promise<Object>} The updated account object.
     */
    static async updateAccount(tenantId, accountId, userId, updateData) {
        try {
            const account = await Account.findOne({ _id: accountId, tenant_id: tenantId });
            if (!account) {
                throw new Error('حساب یافت نشد.');
            }

            // Prevent direct modification of balances via this method
            delete updateData.balances;

            Object.assign(account, updateData);
            account.updated_by = userId;
            await account.save();
            logger.info('Account updated successfully', { accountId, tenantId });
            return account;
        } catch (error) {
            logger.error('Error updating account:', { error: error.message, tenantId, accountId, updateData });
            if (error.code === 11000) {
                throw new Error('شماره حساب یا نام حساب برای این سازمان قبلاً ثبت شده است.');
            }
            throw new Error('خطا در به‌روزرسانی حساب: ' + error.message);
        }
    }

    /**
     * Update a specific balance type for a currency within an account.
     * This is the core method for adjusting balances.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the account.
     * @param {string} currency - The currency code (e.g., 'AED', 'IRR').
     * @param {'available'|'onHold'|'pendingWithdrawals'|'unconverted'} balanceType - The type of balance to update.
     * @param {number} amount - The amount to add or subtract (can be negative).
     * @returns {Promise<Object>} The updated account object.
     */
    static async updateBalance(tenantId, accountId, currency, balanceType, amount) {
        try {
            const account = await Account.findOne({ _id: accountId, tenant_id: tenantId });
            if (!account) {
                throw new Error('حساب یافت نشد.');
            }

            if (!account.balances.has(currency)) {
                account.balances.set(currency, { available: 0, onHold: 0, pendingWithdrawals: 0, unconverted: 0 });
            }

            const currentBalance = account.balances.get(currency);
            const newBalance = currentBalance[balanceType] + amount;

            // Basic validation: ensure balances don't go negative unless it's a deduction from an already positive balance
            // More complex checks (e.g., available - onHold >= 0) will be handled by higher-level services (HoldManager, etc.)
            if (newBalance < 0 && balanceType === 'available') {
                // Allow negative available balance only if it's due to a withdrawal from an already positive balance
                // This logic might need refinement based on exact accounting rules (e.g., overdrafts)
                if (currentBalance[balanceType] + amount < 0) {
                     // This means a withdrawal exceeded current available balance
                    // For now, we will allow it and let higher level logic (e.g. Withdrawal Orchestrator) handle it
                    // or throw an error based on business rules.
                }
            } else if (newBalance < 0 && balanceType !== 'available') {
                // For non-available balances, they typically shouldn't go negative
                throw new Error(`موجودی ${balanceType} نمی‌تواند منفی شود برای ارز ${currency}.`);
            }
            
            currentBalance[balanceType] = newBalance;
            account.markModified('balances'); // Mark balances Map for Mongoose to save changes
            await account.save();

            logger.info(`Balance updated: ${balanceType} for account ${accountId} in ${currency}`, { amount, newBalance: currentBalance[balanceType] });
            return account;
        } catch (error) {
            logger.error('Error updating balance:', { error: error.message, tenantId, accountId, currency, balanceType, amount });
            throw new Error('خطا در به‌روزرسانی موجودی: ' + error.message);
        }
    }

    /**
     * Delete an account for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the account to delete.
     * @returns {Promise<Object>} The deleted account object.
     */
    static async deleteAccount(tenantId, accountId) {
        try {
            const account = await Account.findOneAndDelete({ _id: accountId, tenant_id: tenantId });
            if (!account) {
                throw new Error('حساب یافت نشد.');
            }
            logger.info('Account deleted successfully', { accountId, tenantId });
            return account;
        } catch (error) {
            logger.error('Error deleting account:', { error: error.message, tenantId, accountId });
            throw new Error('خطا در حذف حساب: ' + error.message);
        }
    }

    /**
     * Initialize a new currency balance for an account if it doesn't exist.
     * @param {Object} account - The account document.
     * @param {string} currency - The currency code.
     */
    static initializeCurrencyBalance(account, currency) {
        if (!account.balances.has(currency)) {
            account.balances.set(currency, { available: 0, onHold: 0, pendingWithdrawals: 0, unconverted: 0 });
            account.markModified('balances');
        }
    }
}

module.exports = AccountService; 