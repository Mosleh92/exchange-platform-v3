const CustomerTransaction = require('../models/CustomerTransaction');
const { consume } = require('./messageQueue');
const { sendNotification } = require('./notificationService');
const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');
const Discrepancy = require('../models/Discrepancy');
const AccountingEntry = require('../models/accounting/AccountingEntry');
const Account = require('../models/Account');
const logger = require('../utils/logger');

/**
 * Enhanced reconciliation for a single transaction
 * Includes double-entry validation and external reconciliation
 */
async function reconcileTransaction(transactionId, options = {}) {
  try {
    const tx = await CustomerTransaction.findById(transactionId).populate('customerId');
    if (!tx) {
      logger.warn('Transaction not found for reconciliation', { transactionId });
      return { success: false, error: 'Transaction not found' };
    }

    // مجموع پرداخت‌های تایید شده
    const totalPaid = (tx.paymentBreakdown || [])
      .filter(p => p.status === 'verified')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Validate accounting entries
    const accountingValidation = await validateAccountingEntries(transactionId);
    
    // External reconciliation if enabled
    let externalReconciliation = null;
    if (options.includeExternal) {
      externalReconciliation = await performExternalReconciliation(tx);
    }

    const reconciliationResult = {
      transactionId: tx._id,
      expectedAmount: tx.amount,
      actualPaid: totalPaid,
      difference: totalPaid - tx.amount,
      status: getReconciliationStatus(totalPaid, tx.amount),
      accountingValidation,
      externalReconciliation,
      timestamp: new Date()
    };

    // اگر مغایرت وجود دارد
    if (totalPaid < tx.amount) {
      await sendNotification({
        user: tx.customerId._id,
        type: 'reconciliation',
        message: `مغایرت پرداخت در تراکنش ${tx._id}: مبلغ پرداختی کمتر از مقدار مورد انتظار است.`,
        data: reconciliationResult
      });
      await sendNotification({
        user: 'adminUserId',
        type: 'reconciliation',
        message: `مغایرت پرداخت در تراکنش ${tx._id} برای کاربر ${tx.customerId._id}`,
        data: reconciliationResult
      });
    } else if (totalPaid > tx.amount) {
      await sendNotification({
        user: tx.customerId._id,
        type: 'reconciliation',
        message: `مغایرت پرداخت در تراکنش ${tx._id}: مبلغ پرداختی بیشتر از مقدار مورد انتظار است.`,
        data: reconciliationResult
      });
      await sendNotification({
        user: 'adminUserId',
        type: 'reconciliation',
        message: `مغایرت پرداخت در تراکنش ${tx._id} برای کاربر ${tx.customerId._id}`,
        data: reconciliationResult
      });
    }

    return { success: true, data: reconciliationResult };

  } catch (error) {
    logger.error('Transaction reconciliation failed', {
      transactionId,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

/**
 * Validate accounting entries for double-entry compliance
 */
async function validateAccountingEntries(transactionId) {
  try {
    const entries = await AccountingEntry.find({
      transactionId,
      status: 'posted'
    });

    if (entries.length === 0) {
      return {
        isValid: false,
        error: 'No accounting entries found',
        totalDebits: 0,
        totalCredits: 0
      };
    }

    const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    // Verify integrity hashes
    let integrityErrors = 0;
    for (const entry of entries) {
      if (!entry.verify()) {
        integrityErrors++;
      }
    }

    return {
      isValid: isBalanced && integrityErrors === 0,
      isBalanced,
      totalDebits,
      totalCredits,
      difference: totalDebits - totalCredits,
      entryCount: entries.length,
      integrityErrors
    };

  } catch (error) {
    logger.error('Accounting validation failed', { transactionId, error: error.message });
    return {
      isValid: false,
      error: error.message
    };
  }
}

/**
 * Perform external reconciliation with bank/payment provider
 */
async function performExternalReconciliation(transaction) {
  try {
    // This would integrate with external systems
    // For now, return a mock result
    return {
      provider: 'bank_system',
      status: 'matched',
      externalReference: `EXT_${transaction._id}`,
      externalAmount: transaction.amount,
      externalCurrency: transaction.fromCurrency,
      timestamp: new Date(),
      verified: true
    };
  } catch (error) {
    logger.error('External reconciliation failed', {
      transactionId: transaction._id,
      error: error.message
    });
    return {
      provider: 'bank_system',
      status: 'failed',
      error: error.message,
      timestamp: new Date(),
      verified: false
    };
  }
}

/**
 * Determine reconciliation status
 */
function getReconciliationStatus(actualPaid, expectedAmount) {
  const difference = actualPaid - expectedAmount;
  
  if (Math.abs(difference) < 0.01) {
    return 'matched';
  } else if (difference > 0) {
    return 'overpaid';
  } else {
    return 'underpaid';
  }
}

/**
 * Enhanced reconciliation for multiple transactions with comprehensive reporting
 * وضعیت‌های ممکن: paid, partial, debtor, overpaid
 */
async function reconcileTransactions(tenantId, options = {}) {
  // CRITICAL FIX: Add tenant_id filter to prevent full table scan
  if (!tenantId) {
    throw new Error('tenantId is required for reconciliation');
  }
  
  try {
    const {
      startDate,
      endDate,
      includeAccountingValidation = true,
      includeExternalReconciliation = false,
      generateReport = true
    } = options;

    // Build query
    const query = { tenant_id: tenantId };
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query);
    const report = {
      summary: {
        total: transactions.length,
        matched: 0,
        underpaid: 0,
        overpaid: 0,
        failed: 0
      },
      transactions: [],
      accountingValidation: null,
      externalReconciliation: null,
      generatedAt: new Date()
    };

    // Process each transaction
    for (const tx of transactions) {
      try {
        // Find payments
        let payments = [];
        if (tx.payments && tx.payments.length > 0) {
          payments = await Payment.find({ _id: { $in: tx.payments }, tenant_id: tenantId });
        } else {
          payments = await Payment.find({ transactionId: tx._id, tenant_id: tenantId });
        }

        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const status = getReconciliationStatus(totalPaid, tx.amount);

        // Update transaction status if changed
        if (tx.status !== status) {
          tx.status = status;
          await tx.save();
        }

        const transactionResult = {
          transactionId: tx._id,
          expectedAmount: tx.amount,
          actualPaid: totalPaid,
          difference: totalPaid - tx.amount,
          status,
          payments: payments.map(p => ({ 
            id: p._id, 
            amount: p.amount, 
            status: p.status,
            verifiedAt: p.verifiedAt
          }))
        };

        // Add accounting validation if requested
        if (includeAccountingValidation) {
          transactionResult.accountingValidation = await validateAccountingEntries(tx._id);
        }

        // Add external reconciliation if requested
        if (includeExternalReconciliation) {
          transactionResult.externalReconciliation = await performExternalReconciliation(tx);
        }

        report.transactions.push(transactionResult);

        // Update summary
        report.summary[status]++;

      } catch (error) {
        logger.error('Failed to reconcile transaction', {
          transactionId: tx._id,
          error: error.message
        });
        report.summary.failed++;
        report.transactions.push({
          transactionId: tx._id,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Generate comprehensive accounting validation report
    if (includeAccountingValidation && generateReport) {
      report.accountingValidation = await generateAccountingValidationReport(tenantId, query);
    }

    // Generate external reconciliation summary
    if (includeExternalReconciliation && generateReport) {
      report.externalReconciliation = await generateExternalReconciliationReport(tenantId, query);
    }

    // Save reconciliation report
    await saveReconciliationReport(tenantId, report);

    return report;

  } catch (error) {
    logger.error('Bulk reconciliation failed', {
      tenantId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate comprehensive accounting validation report
 */
async function generateAccountingValidationReport(tenantId, transactionQuery) {
  try {
    const transactions = await Transaction.find(transactionQuery);
    const transactionIds = transactions.map(tx => tx._id);

    const accountingEntries = await AccountingEntry.find({
      transactionId: { $in: transactionIds },
      tenantId
    });

    const report = {
      totalTransactions: transactions.length,
      totalEntries: accountingEntries.length,
      balancedTransactions: 0,
      unbalancedTransactions: 0,
      integrityErrors: 0,
      totalDebits: 0,
      totalCredits: 0,
      issues: []
    };

    // Group entries by transaction
    const entriesByTransaction = accountingEntries.reduce((acc, entry) => {
      const txId = entry.transactionId.toString();
      if (!acc[txId]) acc[txId] = [];
      acc[txId].push(entry);
      return acc;
    }, {});

    // Validate each transaction's entries
    for (const tx of transactions) {
      const txEntries = entriesByTransaction[tx._id.toString()] || [];
      
      if (txEntries.length === 0) {
        report.issues.push({
          transactionId: tx._id,
          type: 'missing_entries',
          description: 'No accounting entries found'
        });
        continue;
      }

      const txDebits = txEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const txCredits = txEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
      
      report.totalDebits += txDebits;
      report.totalCredits += txCredits;

      if (Math.abs(txDebits - txCredits) < 0.01) {
        report.balancedTransactions++;
      } else {
        report.unbalancedTransactions++;
        report.issues.push({
          transactionId: tx._id,
          type: 'unbalanced_entries',
          description: `Debits (${txDebits}) != Credits (${txCredits})`,
          difference: txDebits - txCredits
        });
      }

      // Check integrity
      for (const entry of txEntries) {
        if (!entry.verify()) {
          report.integrityErrors++;
          report.issues.push({
            transactionId: tx._id,
            entryId: entry._id,
            type: 'integrity_error',
            description: 'Entry integrity hash mismatch'
          });
        }
      }
    }

    return report;

  } catch (error) {
    logger.error('Accounting validation report generation failed', error);
    return { error: error.message };
  }
}

/**
 * Generate external reconciliation summary report
 */
async function generateExternalReconciliationReport(tenantId, transactionQuery) {
  try {
    const transactions = await Transaction.find(transactionQuery);
    
    const report = {
      totalTransactions: transactions.length,
      matched: 0,
      unmatched: 0,
      failed: 0,
      totalAmount: 0,
      matchedAmount: 0,
      unmatchedAmount: 0,
      providers: {},
      issues: []
    };

    for (const tx of transactions) {
      const externalResult = await performExternalReconciliation(tx);
      
      report.totalAmount += tx.amount;
      
      if (externalResult.status === 'matched') {
        report.matched++;
        report.matchedAmount += tx.amount;
      } else if (externalResult.status === 'failed') {
        report.failed++;
        report.issues.push({
          transactionId: tx._id,
          provider: externalResult.provider,
          error: externalResult.error
        });
      } else {
        report.unmatched++;
        report.unmatchedAmount += tx.amount;
      }

      // Track by provider
      const provider = externalResult.provider;
      if (!report.providers[provider]) {
        report.providers[provider] = { matched: 0, unmatched: 0, failed: 0 };
      }
      report.providers[provider][externalResult.status]++;
    }

    return report;

  } catch (error) {
    logger.error('External reconciliation report generation failed', error);
    return { error: error.message };
  }
}

/**
 * Save reconciliation report to database
 */
async function saveReconciliationReport(tenantId, report) {
  try {
    // Create a new model for reconciliation reports if needed
    // For now, just log the report
    logger.info('Reconciliation report generated', {
      tenantId,
      summary: report.summary,
      timestamp: report.generatedAt
    });
  } catch (error) {
    logger.error('Failed to save reconciliation report', error);
  }
}

async function reconcileTenant(tenantId) {
  const txs = await Transaction.find({ tenantId });
  for (const tx of txs) {
    const payments = await Payment.find({ transactionId: tx._id });
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    let status = 'matched';
    if (paid < tx.amount) status = 'underpaid';
    else if (paid > tx.amount) status = 'overpaid';
    else if (paid !== tx.amount) status = 'unmatched';
    await Discrepancy.updateOne(
      { transactionId: tx._id },
      {
        $set: {
          tenantId,
          branchId: tx.branchId,
          transactionId: tx._id,
          expected: tx.amount,
          paid,
          status
        }
      },
      { upsert: true }
    );
  }
}

if (process.env.NODE_ENV !== 'test') {
  consume('reconciliation', async (msg) => {
    await reconcileTransaction(msg.transactionId);
  });
}

module.exports = { reconcileTransaction, reconcileTransactions, reconcileTenant }; 