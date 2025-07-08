// backend/src/controllers/transaction.controller.js
// کد قبلی شما + اصلاحات فارسی:

const { getTenantConnection } = require("../config/database");
const logger = require("../utils/logger");
const {
  generateTransactionCode,
  calculateCommission,
} = require("../utils/helpers");
const { broadcastToTenant } = require("../config/socket");
const PersianUtils = require("../utils/persian");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const ExchangeRate = require("../models/ExchangeRate");
const User = require("../models/User");
const { on } = require("../services/eventDispatcher");
const CustomerTransaction = require("../models/CustomerTransaction");
const TransactionService = require("../services/TransactionService");
const RemittanceService = require("../services/RemittanceService");
const HoldingService = require("../services/HoldingService");
const validator = require("validator");

class TransactionController {
  async createTransaction(req, res) {
    try {
      const {
        type,
        fromCurrency,
        toCurrency,
        amount,
        paymentMethod,
        deliveryMethod,
        notes,
        receiverInfo,
      } = req.body;

      const userId = req.user.userId;
      const tenantId = req.user.tenantId;

      // Validate exchange rate
      const exchangeRate = await ExchangeRate.getCurrentRate(
        tenantId,
        fromCurrency,
        toCurrency,
      );
      if (!exchangeRate) {
        return res.status(400).json({
          success: false,
          message: "نرخ ارز برای این جفت ارز یافت نشد",
        });
      }

      // Calculate conversion
      const conversion = exchangeRate.calculateConversion(
        amount,
        type === "currency_buy" ? "buy" : "sell",
      );

      // Validate amount limits
      if (!exchangeRate.isAmountValid(amount)) {
        return res.status(400).json({
          success: false,
          message: `مقدار باید بین ${exchangeRate.minAmount} و ${exchangeRate.maxAmount} باشد`,
        });
      }

      // Check customer account balance for sell transactions
      if (type === "currency_sell") {
        const customerAccount = await Account.findOne({
          customerId: userId,
          tenantId,
          currency: fromCurrency,
          status: "active",
        });

        if (!customerAccount || customerAccount.availableBalance < amount) {
          return res.status(400).json({
            success: false,
            message: "موجودی کافی نیست",
          });
        }
      }

      // Create transaction
      const transaction = new Transaction({
        transactionId: Transaction.generateTransactionId(),
        tenantId,
        customerId: userId,
        type,
        fromCurrency,
        toCurrency,
        amount,
        exchangeRate: conversion.rate,
        convertedAmount: conversion.convertedAmount,
        commission: conversion.commission,
        totalAmount: conversion.totalCost,
        remainingAmount: conversion.totalCost,
        paymentMethod,
        deliveryMethod,
        notes: { customer: notes },
        receiverInfo,
        audit: { createdBy: userId },
      });

      await transaction.save();

      res.status(201).json({
        success: true,
        message: "تراکنش با موفقیت ایجاد شد",
        data: { transaction },
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در ایجاد تراکنش",
      });
    }
  }

  async getTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const tenantId = req.user.tenantId;

      const transaction = await Transaction.findOne({
        transactionId,
        tenantId,
      })
        .populate("customerId", "name email phone")
        .populate("fromAccount")
        .populate("toAccount");

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "تراکنش یافت نشد",
        });
      }

      res.json({
        success: true,
        data: { transaction },
      });
    } catch (error) {
      console.error("Get transaction error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت تراکنش",
      });
    }
  }

  async getCustomerTransactions(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        status,
        fromDate,
        toDate,
      } = req.query;
      const userId = req.user.userId;
      const tenantId = req.user.tenantId;

      const query = { tenantId, customerId: userId };

      if (type) query.type = type;
      if (status) query.status = status;
      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
      }

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate("fromAccount")
        .populate("toAccount");

      const total = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Get customer transactions error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت تراکنش‌ها",
      });
    }
  }

  async addPayment(req, res) {
    try {
      const { transactionId } = req.params;
      const { amount, method, reference, receipt } = req.body;
      const userId = req.user.userId;
      const tenantId = req.user.tenantId;

      const transaction = await Transaction.findOne({
        transactionId,
        tenantId,
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "تراکنش یافت نشد",
        });
      }

      if (transaction.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "تراکنش قبلاً تکمیل شده است",
        });
      }

      const paymentData = {
        amount,
        method,
        reference,
        receipt,
        paidAt: new Date(),
      };

      await transaction.addPayment(paymentData);

      res.json({
        success: true,
        message: "پرداخت با موفقیت اضافه شد",
        data: { transaction },
      });
    } catch (error) {
      console.error("Add payment error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در اضافه کردن پرداخت",
      });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { transactionId } = req.params;
      const { paymentIndex } = req.body;
      const userId = req.user.userId;
      const tenantId = req.user.tenantId;

      const transaction = await Transaction.findOne({
        transactionId,
        tenantId,
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "تراکنش یافت نشد",
        });
      }

      await transaction.verifyPayment(paymentIndex, userId);

      // If transaction is completed, update customer account
      if (transaction.status === "completed") {
        await this.updateCustomerAccount(transaction);
      }

      res.json({
        success: true,
        message: "پرداخت با موفقیت تأیید شد",
        data: { transaction },
      });
    } catch (error) {
      console.error("Verify payment error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در تأیید پرداخت",
      });
    }
  }

  async cancelTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;
      const tenantId = req.user.tenantId;

      const transaction = await Transaction.findOne({
        transactionId,
        tenantId,
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "تراکنش یافت نشد",
        });
      }

      await transaction.cancel(reason, userId);

      res.json({
        success: true,
        message: "تراکنش با موفقیت لغو شد",
        data: { transaction },
      });
    } catch (error) {
      console.error("Cancel transaction error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در لغو تراکنش",
      });
    }
  }

  async getTransactionStats(req, res) {
    try {
      const { fromDate, toDate, type, status } = req.query;
      const tenantId = req.user.tenantId;

      const filters = {};
      if (fromDate || toDate) {
        filters.createdAt = {};
        if (fromDate) filters.createdAt.$gte = new Date(fromDate);
        if (toDate) filters.createdAt.$lte = new Date(toDate);
      }
      if (type) filters.type = type;
      if (status) filters.status = status;

      const stats = await Transaction.getStats(tenantId, filters);

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      console.error("Get transaction stats error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت آمار تراکنش‌ها",
      });
    }
  }

  async updateCustomerAccount(transaction) {
    try {
      if (transaction.type === "currency_buy") {
        // Customer is buying foreign currency, so we credit their foreign currency account
        let toAccount = await Account.findOne({
          customerId: transaction.customerId,
          tenantId: transaction.tenantId,
          currency: transaction.toCurrency,
          status: "active",
        });

        if (!toAccount) {
          // Create new account if it doesn't exist
          toAccount = new Account({
            accountNumber: Account.generateAccountNumber(
              transaction.toCurrency,
              transaction.tenantId,
            ),
            customerId: transaction.customerId,
            tenantId: transaction.tenantId,
            currency: transaction.toCurrency,
            status: "active",
          });
        }

        await toAccount.addTransaction(transaction.convertedAmount, "credit");
      } else if (transaction.type === "currency_sell") {
        // Customer is selling foreign currency, so we debit their foreign currency account
        const fromAccount = await Account.findOne({
          customerId: transaction.customerId,
          tenantId: transaction.tenantId,
          currency: transaction.fromCurrency,
          status: "active",
        });

        if (fromAccount) {
          await fromAccount.addTransaction(transaction.amount, "debit");
        }
      }
    } catch (error) {
      console.error("Update customer account error:", error);
      throw error;
    }
  }

  // Get all transactions for the logged-in customer (customer portal)
  async getMyTransactions(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        status,
        fromDate,
        toDate,
      } = req.query;
      const customerId = req.user._id || req.user.userId;
      const tenantId = req.user.tenantId;
      const query = { tenantId, customerId };
      if (type) query.type = type;
      if (status) query.status = status;
      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
      }
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      const total = await Transaction.countDocuments(query);
      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Get my transactions error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت تراکنش‌های شما",
        error: error.message,
      });
    }
  }

  // Get all pending deposits for the logged-in customer (customer portal)
  async getMyPendingDeposits(req, res) {
    try {
      const customerId = req.user._id || req.user.userId;
      const tenantId = req.user.tenantId;
      const query = {
        tenantId,
        customerId,
        type: "deposit",
        status: { $in: ["pending", "under_review"] },
      };
      const deposits = await Transaction.find(query).sort({ createdAt: -1 });
      res.json({
        success: true,
        data: deposits,
      });
    } catch (error) {
      console.error("Get my pending deposits error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در دریافت واریزهای در انتظار",
        error: error.message,
      });
    }
  }

  // Create a new buy/sell order for the logged-in customer (customer portal)
  async createMyOrder(req, res) {
    try {
      const customerId = req.user._id || req.user.userId;
      const tenantId = req.user.tenantId;
      const { orderType, currency, amount, description } = req.body;
      if (!["buy", "sell"].includes(orderType)) {
        return res
          .status(400)
          .json({ success: false, message: "نوع سفارش نامعتبر است" });
      }
      const type = orderType === "buy" ? "exchange_buy" : "exchange_sell";
      const transaction = new Transaction({
        tenantId,
        customerId,
        type,
        currency,
        amount,
        status: "pending",
        description: description || "",
        audit: { createdBy: customerId },
      });
      await transaction.save();
      res.status(201).json({
        success: true,
        message: "درخواست شما ثبت شد و در انتظار بررسی است",
        data: transaction,
      });
    } catch (error) {
      console.error("Create my order error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در ثبت سفارش",
        error: error.message,
      });
    }
  }

  // Unified transaction creation handler
  async createUnifiedTransaction(req, res) {
    const { type } = req.body;
    try {
      let result;
      switch (type) {
        case "currency_buy":
        case "currency_sell":
          result = await TransactionService.handleCurrencyOrder(req);
          break;
        case "remittance":
          result = await RemittanceService.handleRemittance(req);
          break;
        case "hold":
          result = await HoldingService.handleHold(req);
          break;
        // سایر انواع تراکنش در آینده
        default:
          return res
            .status(400)
            .json({ success: false, message: "نوع تراکنش نامعتبر است" });
      }
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateTransaction(req, res) {
    try {
      const { tenantId, transactionId } = req.params;
      const updateData = req.body;
      const transaction = await Transaction.findOneAndUpdate(
        { _id: transactionId, tenantId },
        updateData,
        { new: true },
      );
      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "تراکنش یافت نشد" });
      }
      res.json({
        success: true,
        message: "تراکنش با موفقیت ویرایش شد",
        data: transaction,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteTransaction(req, res) {
    try {
      const { tenantId, transactionId } = req.params;
      const transaction = await Transaction.findOneAndDelete({
        _id: transactionId,
        tenantId,
      });
      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "تراکنش یافت نشد" });
      }
      res.json({ success: true, message: "تراکنش با موفقیت حذف شد" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

on("ReceiptUploaded", async ({ transactionId }) => {
  const transaction = await CustomerTransaction.findById(transactionId);
  if (!transaction) return;
  // مجموع پرداخت‌های تایید شده
  const totalPaid = (transaction.paymentBreakdown || [])
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  if (totalPaid >= transaction.amount) {
    transaction.status = "completed";
    await transaction.save();
  } else {
    transaction.status = "under_review";
    await transaction.save();
  }
});

module.exports = new TransactionController();
