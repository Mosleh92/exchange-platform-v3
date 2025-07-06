const BankAccount = require('../models/BankAccount');
const logger = require('../utils/logger');

class BankAccountService {

    /**
     * Create a new bank account for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {Object} bankAccountData - The data for the new bank account.
     * @returns {Promise<Object>} The created bank account object.
     */
    static async createBankAccount(tenantId, bankAccountData) {
        try {
            const newBankAccount = new BankAccount({
                ...bankAccountData,
                tenant_id: tenantId
            });
            await newBankAccount.save();
            logger.info('Bank account created successfully', { accountId: newBankAccount._id, tenantId });
            return newBankAccount;
        } catch (error) {
            logger.error('Error creating bank account:', { error: error.message, tenantId, bankAccountData });
            if (error.code === 11000) {
                throw new Error('حساب بانکی با این شماره قبلاً ثبت شده است.');
            }
            throw new Error('خطا در ایجاد حساب بانکی: ' + error.message);
        }
    }

    /**
     * Get all bank accounts for a specific tenant, with optional filters.
     * @param {string} tenantId - The ID of the tenant.
     * @param {Object} query - Optional filter query (e.g., { currency: 'AED' }).
     * @returns {Promise<Array>} A list of bank account objects.
     */
    static async getBankAccounts(tenantId, query = {}) {
        try {
            const accounts = await BankAccount.find({ tenant_id: tenantId, ...query }).sort({ created_at: -1 });
            return accounts;
        } catch (error) {
            logger.error('Error fetching bank accounts:', { error: error.message, tenantId, query });
            throw new Error('خطا در دریافت لیست حساب‌های بانکی: ' + error.message);
        }
    }

    /**
     * Get a single bank account by its ID for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the bank account.
     * @returns {Promise<Object|null>} The bank account object or null if not found.
     */
    static async getBankAccountById(tenantId, accountId) {
        try {
            const account = await BankAccount.findOne({ _id: accountId, tenant_id: tenantId });
            if (!account) {
                logger.warn('Bank account not found or does not belong to tenant', { accountId, tenantId });
                return null;
            }
            return account;
        } catch (error) {
            logger.error('Error fetching bank account by ID:', { error: error.message, tenantId, accountId });
            throw new Error('خطا در دریافت اطلاعات حساب بانکی: ' + error.message);
        }
    }

    /**
     * Update an existing bank account for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the bank account to update.
     * @param {Object} updateData - The data to update.
     * @returns {Promise<Object|null>} The updated bank account object or null if not found.
     */
    static async updateBankAccount(tenantId, accountId, updateData) {
        try {
            const updatedAccount = await BankAccount.findOneAndUpdate(
                { _id: accountId, tenant_id: tenantId },
                { $set: updateData },
                { new: true, runValidators: true }
            );
            if (!updatedAccount) {
                logger.warn('Bank account not found for update or does not belong to tenant', { accountId, tenantId, updateData });
                return null;
            }
            logger.info('Bank account updated successfully', { accountId, tenantId });
            return updatedAccount;
        } catch (error) {
            logger.error('Error updating bank account:', { error: error.message, tenantId, accountId, updateData });
            if (error.code === 11000) {
                throw new Error('شماره حساب بانکی تکراری است.');
            }
            throw new Error('خطا در به‌روزرسانی حساب بانکی: ' + error.message);
        }
    }

    /**
     * Delete a bank account for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} accountId - The ID of the bank account to delete.
     * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
     */
    static async deleteBankAccount(tenantId, accountId) {
        try {
            const result = await BankAccount.deleteOne({ _id: accountId, tenant_id: tenantId });
            if (result.deletedCount === 0) {
                logger.warn('Bank account not found for deletion or does not belong to tenant', { accountId, tenantId });
                return false;
            }
            logger.info('Bank account deleted successfully', { accountId, tenantId });
            return true;
        } catch (error) {
            logger.error('Error deleting bank account:', { error: error.message, tenantId, accountId });
            throw new Error('خطا در حذف حساب بانکی: ' + error.message);
        }
    }
}

module.exports = BankAccountService; 