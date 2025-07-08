const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");

class FinancialService {
  // Atomic balance update with race condition prevention
  async updateBalance(
    customerId,
    currency,
    amount,
    transactionType,
    metadata = {},
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate inputs
      if (!customerId || !currency || typeof amount !== "number") {
        throw new Error("Invalid parameters for balance update");
      }

      if (amount === 0) {
        throw new Error("Amount cannot be zero");
      }

      // For debits, ensure sufficient balance
      if (amount < 0) {
        const customer = await Customer.findById(customerId).session(session);
        if (!customer) {
          throw new Error("Customer not found");
        }

        const currentBalance = customer.balances.get(currency) || 0;
        if (currentBalance + amount < 0) {
          throw new Error(
            `Insufficient balance. Current: ${currentBalance}, Requested: ${Math.abs(amount)}`,
          );
        }
      }

      // Atomic balance update
      const updatedCustomer = await Customer.findByIdAndUpdate(
        customerId,
        {
          $inc: { [`balances.${currency}`]: amount },
          $set: { updatedAt: new Date() },
        },
        {
          session,
          new: true,
          runValidators: true,
        },
      );

      if (!updatedCustomer) {
        throw new Error("Customer not found");
      }

      // Create transaction record
      const transaction = new Transaction({
        customerId,
        tenantId: updatedCustomer.tenantId,
        branchId: updatedCustomer.branchId,
        type: transactionType,
        currency,
        amount,
        balanceAfter: updatedCustomer.balances.get(currency),
        metadata,
        status: "completed",
        createdAt: new Date(),
      });

      await transaction.save({ session });

      // Log the financial operation
      await this.logFinancialOperation(
        "BALANCE_UPDATE",
        {
          customerId,
          currency,
          amount,
          transactionType,
          balanceAfter: updatedCustomer.balances.get(currency),
          metadata,
        },
        session,
      );

      await session.commitTransaction();

      return {
        customer: updatedCustomer,
        transaction,
        newBalance: updatedCustomer.balances.get(currency),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Secure exchange operation
  async processExchange(
    customerId,
    fromCurrency,
    toCurrency,
    amount,
    exchangeRate,
    metadata = {},
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate exchange rate (prevent manipulation)
      const validRate = await this.validateExchangeRate(
        fromCurrency,
        toCurrency,
        exchangeRate,
      );
      if (!validRate) {
        throw new Error("Invalid or outdated exchange rate");
      }

      // Calculate conversion
      const convertedAmount = amount * exchangeRate;

      // Debit from currency
      await this.updateBalance(
        customerId,
        fromCurrency,
        -amount,
        "EXCHANGE_DEBIT",
        {
          ...metadata,
          toCurrency,
          exchangeRate,
          convertedAmount,
        },
      );

      // Credit to currency
      await this.updateBalance(
        customerId,
        toCurrency,
        convertedAmount,
        "EXCHANGE_CREDIT",
        {
          ...metadata,
          fromCurrency,
          exchangeRate,
          originalAmount: amount,
        },
      );

      await session.commitTransaction();

      return {
        success: true,
        fromCurrency,
        toCurrency,
        amount,
        convertedAmount,
        exchangeRate,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Validate exchange rate against manipulation
  async validateExchangeRate(fromCurrency, toCurrency, providedRate) {
    // Get latest rate from database
    const latestRate = await ExchangeRate.findOne({
      fromCurrency,
      toCurrency,
      status: "active",
    }).sort({ createdAt: -1 });

    if (!latestRate) {
      throw new Error("Exchange rate not found");
    }

    // Check if rate is within acceptable variance (e.g., 5%)
    const variance = Math.abs(providedRate - latestRate.rate) / latestRate.rate;
    if (variance > 0.05) {
      throw new Error("Exchange rate variance too high");
    }

    // Check if rate is not too old (e.g., 1 hour)
    const rateAge =
      (Date.now() - latestRate.createdAt.getTime()) / (1000 * 60 * 60);
    if (rateAge > 1) {
      throw new Error("Exchange rate is outdated");
    }

    return true;
  }

  // Financial operation logging
  async logFinancialOperation(operation, details, session = null) {
    const log = new AuditLog({
      eventType: operation,
      category: "FINANCIAL",
      details,
      timestamp: new Date(),
      severity: "HIGH",
    });

    if (session) {
      await log.save({ session });
    } else {
      await log.save();
    }
  }
}

module.exports = new FinancialService();
