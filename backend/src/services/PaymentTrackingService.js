const mongoose = require("mongoose");
const logger = require("../utils/logger");
const Transaction = require("../models/Transaction");
const AccountService = require("./AccountService");
const NotificationService = require("./NotificationService");

class PaymentTrackingService {
  /**
   * Create a new transaction with payment tracking
   * @param {Object} transactionData - Transaction data including payment details
   * @returns {Promise<Object>} Created transaction
   */
  static async createTransactionWithPayment(transactionData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        tenant_id,
        customer_id,
        type,
        currency_from,
        currency_to,
        amount_from,
        amount_to,
        rate,
        commission,
        payment_method,
        source_account,
        destination_account,
      } = transactionData;

      // Create transaction with payment tracking
      const transaction = new Transaction({
        tenant_id,
        customer_id,
        type,
        currency_from,
        currency_to,
        amount_from,
        amount_to,
        rate,
        commission,
        payment_status: "pending",
        payment_details: {
          total_amount: amount_from,
          paid_amount: 0,
          remaining_amount: amount_from,
          payment_method,
          payment_reference: "",
          payment_notes: "",
        },
        accounts: {
          source: {
            accountId: source_account,
            currency: currency_from,
            amount: amount_from,
          },
          destination: {
            accountId: destination_account,
            currency: currency_to,
            amount: amount_to,
          },
        },
        portal_status: "pending",
        metadata: {
          payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        },
      });

      await transaction.save({ session });

      // Generate customer portal URL
      const portalUrl = await this.generateCustomerPortalUrl(transaction._id);
      transaction.metadata.customer_portal_url = portalUrl;
      await transaction.save({ session });

      // Send notification to customer
      await NotificationService.sendTransactionCreatedNotification(transaction);

      await session.commitTransaction();
      return transaction;
    } catch (error) {
      await session.abortTransaction();
      logger.error("Error creating transaction with payment:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update payment status for a transaction
   * @param {string} transactionId - Transaction ID
   * @param {Object} paymentUpdate - Payment update details
   * @returns {Promise<Object>} Updated transaction
   */
  static async updatePaymentStatus(transactionId, paymentUpdate) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      const { paid_amount, payment_method, payment_reference, payment_notes } =
        paymentUpdate;

      // Update payment details
      transaction.payment_details.paid_amount += paid_amount;
      transaction.payment_details.remaining_amount =
        transaction.payment_details.total_amount -
        transaction.payment_details.paid_amount;

      if (payment_method) {
        transaction.payment_details.payment_method = payment_method;
      }
      if (payment_reference) {
        transaction.payment_details.payment_reference = payment_reference;
      }
      if (payment_notes) {
        transaction.payment_details.payment_notes = payment_notes;
      }

      // Update payment status
      if (transaction.payment_details.remaining_amount <= 0) {
        transaction.payment_status = "completed";
        // Update account balances
        await AccountService.updateBalancesForTransaction(transaction);
      } else if (transaction.payment_details.paid_amount > 0) {
        transaction.payment_status = "partial";
      }

      await transaction.save({ session });

      // Send notification
      await NotificationService.sendPaymentUpdateNotification(transaction);

      await session.commitTransaction();
      return transaction;
    } catch (error) {
      await session.abortTransaction();
      logger.error("Error updating payment status:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Generate a secure customer portal URL
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<string>} Portal URL
   */
  static async generateCustomerPortalUrl(transactionId) {
    // In a real implementation, this would generate a secure, signed URL
    // For now, we'll use a simple format
    return `/customer-portal/transaction/${transactionId}`;
  }

  /**
   * Record a portal action
   * @param {string} transactionId - Transaction ID
   * @param {Object} actionData - Action details
   * @returns {Promise<Object>} Updated transaction
   */
  static async recordPortalAction(transactionId, actionData) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const { action, user, notes } = actionData;

    transaction.portal_actions.push({
      action,
      timestamp: new Date(),
      user,
      notes,
    });

    // Update portal status based on action
    if (action === "view") {
      transaction.portal_status = "viewed";
    } else if (action === "approve") {
      transaction.portal_status = "approved";
    } else if (action === "reject") {
      transaction.portal_status = "rejected";
    }

    await transaction.save();
    return transaction;
  }

  /**
   * Get transaction payment summary
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Payment summary
   */
  static async getPaymentSummary(transactionId) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    return {
      transaction_id: transaction._id,
      payment_status: transaction.payment_status,
      total_amount: transaction.payment_details.total_amount,
      paid_amount: transaction.payment_details.paid_amount,
      remaining_amount: transaction.payment_details.remaining_amount,
      payment_method: transaction.payment_details.payment_method,
      payment_reference: transaction.payment_details.payment_reference,
      payment_notes: transaction.payment_details.payment_notes,
      portal_status: transaction.portal_status,
      portal_url: transaction.metadata.customer_portal_url,
      payment_deadline: transaction.metadata.payment_deadline,
    };
  }
}

module.exports = PaymentTrackingService;
