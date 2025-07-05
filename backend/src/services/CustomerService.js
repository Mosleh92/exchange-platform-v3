const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const AccountService = require('./AccountService'); // Import AccountService
const logger = require('../utils/logger');

class CustomerService {
    /**
     * Create a new customer for a specific tenant and automatically create a default account for them.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} userId - The ID of the user creating the customer.
     * @param {Object} customerData - The customer data.
     * @returns {Promise<Object>} An object containing the created customer and their default account.
     */
    static async createCustomer(tenantId, userId, customerData) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const newCustomer = new Customer({
                ...customerData,
                tenant_id: tenantId,
                created_by: userId
            });
            await newCustomer.save({ session });

            // Automatically create a default account for the new customer
            const defaultAccount = await AccountService.createAccount(tenantId, userId, {
                customer_id: newCustomer._id,
                account_name: `${newCustomer.name}'s Default Account`,
                // You might want to define a default country or initial currencies here
                country: customerData.country || 'US', // Default or from customerData
                balances: { // Initialize with zero balances for common currencies
                    'AED': { available: 0, onHold: 0, pendingWithdrawals: 0, unconverted: 0 },
                    'IRR': { available: 0, onHold: 0, pendingWithdrawals: 0, unconverted: 0 },
                    'USD': { available: 0, onHold: 0, pendingWithdrawals: 0, unconverted: 0 }
                }
            }, { session });

            await session.commitTransaction();

            logger.info('Customer and default account created successfully', { customerId: newCustomer._id, accountId: defaultAccount._id, tenantId });
            return { customer: newCustomer, account: defaultAccount };
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error creating customer and account:', { error: error.message, tenantId, customerData });
            if (error.code === 11000) {
                if (error.keyPattern.phone) {
                    throw new Error('شماره تلفن قبلاً ثبت شده است.');
                }
                if (error.keyPattern.national_id) {
                    throw new Error('کد ملی قبلاً ثبت شده است.');
                }
            }
            throw new Error('خطا در ثبت مشتری و حساب: ' + error.message);
        } finally {
            session.endSession();
        }
    }

    /**
     * Find an existing customer by phone or national ID, or create a new one along with a default account.
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} userId - The ID of the user performing the action.
     * @param {Object} customerData - Customer data to find or create.
     * @returns {Promise<Object>} An object containing the customer and their default account.
     */
    static async findOrCreateCustomerAndAccount(tenantId, userId, customerData) {
        try {
            const { phone, national_id, name } = customerData;
            let customer = null;
            let account = null;

            // Try to find customer by phone first
            if (phone) {
                const customers = await Customer.find({ tenant_id: tenantId, phone });
                if (customers.length > 0) {
                    customer = customers[0];
                }
            }

            // If not found by phone, try to find by national_id if provided
            if (!customer && national_id) {
                const customers = await Customer.find({ tenant_id: tenantId, national_id });
                if (customers.length > 0) {
                    customer = customers[0];
                }
            }
            
            // If a customer is found, try to find their default account
            if (customer) {
                // Assuming a convention for default account, e.g., one linked to customer_id
                const accounts = await AccountService.getAccounts(tenantId, { customer_id: customer._id });
                if (accounts.length > 0) {
                    account = accounts[0]; // Assuming the first account found is the default one
                } else {
                    // If customer exists but no account, create one (shouldn't happen if always created with customer)
                    account = await AccountService.createAccount(tenantId, userId, {
                        customer_id: customer._id,
                        account_name: `${customer.name}'s Default Account`,
                        country: customer.country || 'US',
                        balances: {
                            'AED': { available: 0, onHold: 0, pendingWithdrawals: 0, unconverted: 0 },
                            'IRR': { available: 0, onHold: 0, pendingWithdrawals: 0, unconverted: 0 },
                            'USD': { available: 0, onHold: 0, pendingWithdrawals: 0, unconverted: 0 }
                        }
                    });
                    logger.warn('Existing customer found without an account, created a new default account.', { customerId: customer._id, accountId: account._id, tenantId });
                }
                logger.info('Existing customer and account found.', { customerId: customer._id, accountId: account._id, tenantId });
                return { customer, account };
            } else {
                // If customer not found, create both customer and account
                logger.info('Customer not found, creating new customer and default account.', { tenantId, customerData });
                const result = await this.createCustomer(tenantId, userId, customerData); // Use the existing createCustomer logic
                return result; // This already returns { customer, account }
            }
        } catch (error) {
            logger.error('Error in findOrCreateCustomerAndAccount:', { error: error.message, tenantId, customerData });
            throw error; // Re-throw to be handled by the caller
        }
    }

    /**
     * Get all customers for a specific tenant
     * @param {string} tenantId - The ID of the tenant
     * @param {Object} query - Optional query parameters for filtering
     * @param {Object} user - The user performing the action
     * @returns {Promise<Array>} List of customers
     */
    static async getCustomers(tenantId, query = {}, user) {
        try {
            const filter = { tenant_id: tenantId };
            const { term, filter: statusFilter } = query;

            // فیلتر بر اساس نقش و شعبه
            if (user && (user.role === 'branch_manager' || user.role === 'staff')) {
                filter.branch_id = user.branchId;
            }

            if (term) {
                filter.$or = [
                    { name: { $regex: term, $options: 'i' } },
                    { phone: { $regex: term, $options: 'i' } },
                    { national_id: { $regex: term, $options: 'i' } },
                    { email: { $regex: term, $options: 'i' } }
                ];
            }

            if (statusFilter && statusFilter !== 'all') {
                if (statusFilter === 'active') {
                    filter.kyc_status = 'verified';
                } else if (statusFilter === 'inactive') {
                    filter.kyc_status = { $in: ['pending', 'rejected'] };
                }
            }

            const customers = await Customer.find(filter).sort({ created_at: -1 }).lean();
            const customersWithAccounts = await Promise.all(customers.map(async customer => {
                const accounts = await AccountService.getAccounts(tenantId, { customer_id: customer._id });
                customer.bank_accounts = accounts.map(account => ({
                    id: account._id,
                    account_name: account.account_name,
                    account_number: account.account_number,
                    bank_name: account.country
                }));
                // مجموع موجودی همه ارزها
                customer.totalBalances = {};
                accounts.forEach(account => {
                    customer.totalBalances[account.currency] = (customer.totalBalances[account.currency] || 0) + (account.availableBalance || 0);
                });
                return customer;
            }));

            return customersWithAccounts;
        } catch (error) {
            logger.error('Error fetching customers:', { error: error.message, tenantId, query });
            throw new Error('خطا در دریافت مشتریان');
        }
    }

    /**
     * Get a single customer by ID for a specific tenant
     * @param {string} tenantId - The ID of the tenant
     * @param {string} customerId - The ID of the customer
     * @returns {Promise<Object>} The customer object.
     */
    static async getCustomerById(tenantId, customerId) {
        try {
            const customer = await Customer.findOne({ _id: customerId, tenant_id: tenantId }).lean(); // Use .lean()
            if (!customer) {
                throw new Error('مشتری یافت نشد');
            }

            // Fetch associated accounts
            const accounts = await AccountService.getAccounts(tenantId, { customer_id: customer._id });
            customer.bank_accounts = accounts.map(account => ({
                id: account._id,
                account_name: account.account_name,
                account_number: account.account_number,
                bank_name: account.country // Using country as a placeholder for bank_name for now
            }));
            // مجموع موجودی همه ارزها
            customer.totalBalances = {};
            accounts.forEach(account => {
                customer.totalBalances[account.currency] = (customer.totalBalances[account.currency] || 0) + (account.availableBalance || 0);
            });
            return customer;
        } catch (error) {
            logger.error('Error fetching customer by ID:', { error: error.message, tenantId, customerId });
            throw new Error('خطا در دریافت مشتری');
        }
    }

    /**
     * Update a customer for a specific tenant
     * @param {string} tenantId - The ID of the tenant
     * @param {string} customerId - The ID of the customer to update
     * @param {string} userId - The ID of the user updating the customer
     * @param {Object} updateData - The data to update
     * @returns {Promise<Object>} The updated customer.
     */
    static async updateCustomer(tenantId, customerId, userId, updateData) {
        try {
            const customer = await Customer.findOne({ _id: customerId, tenant_id: tenantId });
            if (!customer) {
                throw new Error('مشتری یافت نشد');
            }

            Object.assign(customer, updateData);
            customer.updated_by = userId; // Set the user who updated it
            await customer.save();
            logger.info('Customer updated successfully', { customerId, tenantId });
            return customer;
        } catch (error) {
            logger.error('Error updating customer:', { error: error.message, tenantId, customerId, updateData });
            // Handle duplicate key errors specifically
            if (error.code === 11000) {
                if (error.keyPattern.phone) {
                    throw new Error('شماره تلفن قبلاً ثبت شده است.');
                }
                if (error.keyPattern.national_id) {
                    throw new Error('کد ملی قبلاً ثبت شده است.');
                }
            }
            throw new Error('خطا در به‌روزرسانی مشتری');
        }
    }

    /**
     * Delete a customer for a specific tenant
     * @param {string} tenantId - The ID of the tenant.
     * @param {string} customerId - The ID of the customer to delete.
     * @returns {Promise<Object>} The deleted customer.
     */
    static async deleteCustomer(tenantId, customerId) {
        try {
            const customer = await Customer.findOneAndDelete({ _id: customerId, tenant_id: tenantId });
            if (!customer) {
                throw new Error('مشتری یافت نشد.');
            }
            logger.info('Customer deleted successfully', { customerId, tenantId });
            return customer;
        } catch (error) {
            logger.error('Error deleting customer:', { error: error.message, tenantId, customerId });
            throw new Error('خطا در حذف مشتری');
        }
    }
}

module.exports = CustomerService; 
