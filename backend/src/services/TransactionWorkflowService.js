const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const CustomerService = require('./CustomerService');
const NotificationService = require('./NotificationService');

class TransactionWorkflowService {
    /**
     * Create a new transaction with enhanced workflow
     * @param {Object} transactionData - Transaction data including customer and payment details
     * @returns {Promise<Object>} Created transaction
     */
    static async createTransaction(transactionData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const {
                tenant_id,
                customer_id,
                customer_type,
                type,
                currency_from,
                currency_to,
                amount_from,
                amount_to,
                rate,
                commission,
                payment_method,
                split_payments,
                exchange_account
            } = transactionData;

            // Verify customer type and get customer details
            const customer = await CustomerService.getCustomerById(customer_id);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Create transaction with enhanced workflow
            const transaction = new Transaction({
                tenant_id,
                customer_id,
                customer_type: customer_type || customer.type,
                type,
                currency_from,
                currency_to,
                amount_from,
                amount_to,
                rate,
                commission,
                transaction_flow: {
                    status: 'pending_payment',
                    payment_type: 'direct_deposit',
                    payment_destination: exchange_account ? 'exchange_account' : 'other_accounts'
                },
                payment_status: 'pending',
                payment_details: {
                    total_amount: amount_from,
                    paid_amount: 0,
                    remaining_amount: amount_from,
                    payment_method,
                    payment_reference: '',
                    payment_notes: ''
                },
                split_payments: split_payments || [],
                exchange_account: exchange_account ? {
                    account_id: exchange_account.account_id,
                    balance: 0,
                    currency: currency_to
                } : null,
                metadata: {
                    payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                    customer_notes: transactionData.customer_notes || '',
                    exchange_notes: transactionData.exchange_notes || ''
                }
            });

            await transaction.save({ session });

            // Send notification to customer
            await NotificationService.sendTransactionCreatedNotification(transaction);

            await session.commitTransaction();
            return transaction;

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error creating transaction:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Add split payment accounts to a transaction
     * @param {string} transactionId - Transaction ID
     * @param {Array} splitAccounts - Array of account details for split payments
     * @returns {Promise<Object>} Updated transaction
     */
    static async addSplitPayments(transactionId, splitAccounts) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transaction = await Transaction.findById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Calculate total amount from split accounts
            const totalSplitAmount = splitAccounts.reduce((sum, account) => sum + account.amount, 0);
            if (totalSplitAmount !== transaction.amount_from) {
                throw new Error('Total split amount must match transaction amount');
            }

            // Add split payment accounts
            transaction.split_payments = splitAccounts.map(account => ({
                account_name: account.account_name,
                account_number: account.account_number,
                bank_name: account.bank_name,
                amount: account.amount,
                currency: transaction.currency_from,
                status: 'pending'
            }));

            await transaction.save({ session });
            await session.commitTransaction();
            return transaction;

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error adding split payments:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Upload receipt for a split payment
     * @param {string} transactionId - Transaction ID
     * @param {string} accountNumber - Account number for the split payment
     * @param {Object} receiptData - Receipt data including URL and amount
     * @returns {Promise<Object>} Updated transaction
     */
    static async uploadSplitPaymentReceipt(transactionId, accountNumber, receiptData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transaction = await Transaction.findById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Find the split payment
            const splitPayment = transaction.split_payments.find(
                payment => payment.account_number === accountNumber
            );
            if (!splitPayment) {
                throw new Error('Split payment account not found');
            }

            // Update split payment with receipt
            splitPayment.receipt_url = receiptData.receipt_url;
            splitPayment.receipt_uploaded_at = new Date();
            splitPayment.status = 'completed';

            // Update transaction payment status
            const totalPaid = transaction.split_payments.reduce((sum, payment) => {
                return sum + (payment.status === 'completed' ? payment.amount : 0);
            }, 0);

            transaction.payment_details.paid_amount = totalPaid;
            transaction.payment_details.remaining_amount = 
                transaction.payment_details.total_amount - totalPaid;

            if (totalPaid >= transaction.payment_details.total_amount) {
                transaction.payment_status = 'completed';
                transaction.transaction_flow.status = 'payment_received';
            } else if (totalPaid > 0) {
                transaction.payment_status = 'partial';
            }

            await transaction.save({ session });
            await session.commitTransaction();

            // Send notification
            await NotificationService.sendPaymentReceiptUploadedNotification(transaction, splitPayment);

            return transaction;

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error uploading split payment receipt:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Update transaction flow status
     * @param {string} transactionId - Transaction ID
     * @param {string} newStatus - New status
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Updated transaction
     */
    static async updateTransactionFlow(transactionId, newStatus, options = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const transaction = await Transaction.findById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            // Update transaction flow
            transaction.transaction_flow.status = newStatus;
            if (options.payment_type) {
                transaction.transaction_flow.payment_type = options.payment_type;
            }
            if (options.payment_destination) {
                transaction.transaction_flow.payment_destination = options.payment_destination;
            }

            // Handle specific status changes
            if (newStatus === 'completed') {
                // Update exchange account balance if applicable
                if (transaction.exchange_account) {
                    await this.updateExchangeAccountBalance(
                        transaction.exchange_account.account_id,
                        transaction.amount_to,
                        transaction.currency_to
                    );
                }
            }

            await transaction.save({ session });
            await session.commitTransaction();

            // Send notification
            await NotificationService.sendTransactionStatusUpdateNotification(transaction);

            return transaction;

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error updating transaction flow:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Update exchange account balance
     * @param {string} accountId - Exchange account ID
     * @param {number} amount - Amount to add
     * @param {string} currency - Currency
     * @returns {Promise<Object>} Updated account
     */
    static async updateExchangeAccountBalance(_accountId, _amount, _currency) { // Parameters marked as unused
        // Implementation depends on your exchange account service
        // This is a placeholder for the actual implementation
        return Promise.resolve({ success: true });
    }
}

module.exports = TransactionWorkflowService; 