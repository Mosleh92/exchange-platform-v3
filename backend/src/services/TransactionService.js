const Transaction = require("../models/Transaction");
const logger = require("../utils/logger");
const AccountingService = require("./accounting");
const AccountService = require("./AccountService");
const mongoose = require("mongoose");

class TransactionService {
  /**
   * Create a new transaction for a specific tenant.
   * This method now updates balances in the Account model.
   * @param {string} tenantId - The ID of the tenant.
   * @param {string} userId - The ID of the user creating the transaction.
   * @param {string} userName - The name of the user creating the transaction.
   * @param {Object} transactionData - The transaction data.
   * @param {string} accountId - The ID of the account affected by this transaction.
   * @returns {Promise<Object>} The created transaction.
   */
  static async createTransaction(
    tenantId,
    userId,
    userName,
    transactionData,
    accountId,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Calculate amounts using AccountingService (still useful for derived values)
      const calculatedAmounts =
        AccountingService.calculateTransactionAmounts(transactionData);

      // 2. Create the transaction record
      const newTransaction = new Transaction({
        ...transactionData,
        ...calculatedAmounts,
        tenant_id: tenantId,
        created_by: userId,
        created_by_name: userName,
        status: "completed", // Assuming transactions are completed upon creation for now
        // Link to the associated account
        accounts: {
          source: {
            accountId: accountId,
            currency: transactionData.currency_from, // Assuming currency_from is the primary currency affected
            amount: transactionData.amount_from,
          },
        },
      });

      await newTransaction.save({ session });

      // 3. Update account balances based on transaction type
      // These balance updates are simplified; a real system would have more complex ledger entries.
      if (transactionData.type === "buy_aed") {
        await AccountService.updateBalance(
          tenantId,
          accountId,
          "IRR",
          "available",
          -calculatedAmounts.receivedIRR,
          { session },
        );
        await AccountService.updateBalance(
          tenantId,
          accountId,
          "AED",
          "available",
          calculatedAmounts.amountAED,
          { session },
        );
      } else if (transactionData.type === "sell_aed") {
        await AccountService.updateBalance(
          tenantId,
          accountId,
          "AED",
          "available",
          -calculatedAmounts.receivedAED,
          { session },
        );
        await AccountService.updateBalance(
          tenantId,
          accountId,
          "IRR",
          "available",
          calculatedAmounts.amountIRR,
          { session },
        );
      } else if (transactionData.type === "withdraw_aed") {
        await AccountService.updateBalance(
          tenantId,
          accountId,
          "AED",
          "available",
          -calculatedAmounts.withdrawalAED,
          { session },
        );
      } else if (transactionData.type === "withdraw_irr") {
        await AccountService.updateBalance(
          tenantId,
          accountId,
          "IRR",
          "available",
          -calculatedAmounts.withdrawalIRR,
          { session },
        );
      } else if (transactionData.type === "exchange") {
        if (calculatedAmounts.receivedIRR) {
          await AccountService.updateBalance(
            tenantId,
            accountId,
            "IRR",
            "available",
            -calculatedAmounts.receivedIRR,
            { session },
          );
          await AccountService.updateBalance(
            tenantId,
            accountId,
            "AED",
            "available",
            calculatedAmounts.amountAED,
            { session },
          );
        } else if (calculatedAmounts.receivedAED) {
          await AccountService.updateBalance(
            tenantId,
            accountId,
            "AED",
            "available",
            -calculatedAmounts.receivedAED,
            { session },
          );
          await AccountService.updateBalance(
            tenantId,
            accountId,
            "IRR",
            "available",
            calculatedAmounts.amountIRR,
            { session },
          );
        }
      }
      // Other transaction types (e.g., deposit) would also update balances similarly

      await session.commitTransaction();

      logger.info("Transaction created successfully and balances updated", {
        transactionId: newTransaction._id,
        tenantId,
        accountId,
      });
      return newTransaction;
    } catch (error) {
      await session.abortTransaction();
      logger.error("Error creating transaction or updating balances:", {
        error: error.message,
        tenantId,
        transactionData,
        accountId,
      });
      throw new Error("خطا در ثبت تراکنش: " + error.message);
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all transactions for a specific tenant
   * @param {string} tenantId - The ID of the tenant
   * @param {Object} query - Optional query parameters for filtering
   * @returns {Promise<Array>} List of transactions
   */
  static async getTransactions(tenantId, query = {}) {
    try {
      const transactions = await Transaction.findByTenant(tenantId, query);
      return transactions;
    } catch (error) {
      logger.error("Error fetching transactions:", {
        error: error.message,
        tenantId,
        query,
      });
      throw new Error("خطا در دریافت تراکنش‌ها");
    }
  }

  /**
   * Get a single transaction by ID for a specific tenant
   * @param {string} tenantId - The ID of the tenant
   * @param {string} transactionId - The ID of the transaction
   * @returns {Promise<Object>} The transaction object
   */
  static async getTransactionById(tenantId, transactionId) {
    try {
      const transaction = await Transaction.findOne({
        _id: transactionId,
        tenant_id: tenantId,
      });
      if (!transaction) {
        throw new Error("تراکنش یافت نشد");
      }
      return transaction;
    } catch (error) {
      logger.error("Error fetching transaction by ID:", {
        error: error.message,
        tenantId,
        transactionId,
      });
      throw new Error("خطا در دریافت تراکنش");
    }
  }

  /**
   * Update a transaction for a specific tenant.
   * Note: Updating a transaction should ideally trigger corresponding balance adjustments
   * or be restricted if balances have already been affected. For simplicity, this method
   * will recalculate amounts but not re-adjust past balances in accounts. A full system
   * would require reversal/re-posting logic.
   * @param {string} tenantId - The ID of the tenant
   * @param {string} transactionId - The ID of the transaction to update
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} The updated transaction
   */
  static async updateTransaction(tenantId, transactionId, updateData) {
    try {
      const transaction = await Transaction.findOne({
        _id: transactionId,
        tenant_id: tenantId,
      });
      if (!transaction) {
        throw new Error("تراکنش یافت نشد");
      }

      // Optionally recalculate amounts if relevant fields are updated
      if (
        updateData.type ||
        updateData.receivedIRR ||
        updateData.receivedAED ||
        updateData.exchangeRateIRRAED ||
        updateData.exchangeRateAEDIRR
      ) {
        const updatedTransactionData = {
          ...transaction.toObject(), // Get current values
          ...updateData, // Apply updates
        };
        const recalculatedAmounts =
          AccountingService.calculateTransactionAmounts(updatedTransactionData);
        Object.assign(updateData, recalculatedAmounts); // Merge recalculated amounts into updateData
      }

      Object.assign(transaction, updateData);
      await transaction.save();
      logger.info("Transaction updated successfully", {
        transactionId,
        tenantId,
      });
      return transaction;
    } catch (error) {
      logger.error("Error updating transaction:", {
        error: error.message,
        tenantId,
        transactionId,
        updateData,
      });
      throw new Error("خطا در به‌روزرسانی تراکنش");
    }
  }

  /**
   * Delete a transaction for a specific tenant.
   * Note: Deleting a transaction should ideally trigger corresponding balance reversals
   * in the Account model. For simplicity, this method does not include balance reversal logic.
   * A full system would require this.
   * @param {string} tenantId - The ID of the tenant
   * @param {string} transactionId - The ID of the transaction to delete
   * @returns {Promise<Object>} The deleted transaction
   */
  static async deleteTransaction(tenantId, transactionId) {
    try {
      const transaction = await Transaction.findOneAndDelete({
        _id: transactionId,
        tenant_id: tenantId,
      });
      if (!transaction) {
        throw new Error("تراکنش یافت نشد");
      }
      logger.info("Transaction deleted successfully", {
        transactionId,
        tenantId,
      });
      return transaction;
    } catch (error) {
      logger.error("Error deleting transaction:", {
        error: error.message,
        tenantId,
        transactionId,
      });
      throw new Error("خطا در حذف تراکنش");
    }
  }

  /**
   * Validate transaction data using the AccountingService
   * @param {Object} transactionData - The transaction data to validate
   * @returns {Object} Validation result
   */
  static validateTransactionData(transactionData) {
    return AccountingService.validateTransaction(transactionData);
  }
}

module.exports = TransactionService;
