// src/models/postgresql/Transaction.js
module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Tenant isolation
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Tenants',
        key: 'id'
      },
      field: 'tenant_id'
    },
    
    // User involved in transaction
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      field: 'user_id'
    },
    
    // Account balance reference (optional for some transaction types)
    accountBalanceId: {
      type: DataTypes.UUID,
      references: {
        model: 'AccountBalances',
        key: 'id'
      },
      field: 'account_balance_id'
    },
    
    // Transaction type and category
    type: {
      type: DataTypes.ENUM(
        'deposit', 'withdrawal', 'transfer', 'exchange', 'p2p_trade',
        'fee', 'commission', 'interest', 'refund', 'reversal',
        'cash_receipt', 'cash_payment', 'check_received', 'check_payment',
        'bank_deposit', 'bank_withdrawal', 'remittance_send', 'remittance_receive',
        'inter_branch_transfer', 'currency_exchange', 'reconciliation'
      ),
      allowNull: false
    },
    
    category: {
      type: DataTypes.ENUM(
        'financial', 'operational', 'administrative', 'compliance', 'adjustment'
      ),
      defaultValue: 'financial'
    },
    
    // Main transaction amount with 8 decimal precision
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0
      }
    },
    
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      validate: {
        len: [3, 3],
        isUppercase: true
      }
    },
    
    // For currency exchange transactions
    counterpartAmount: {
      type: DataTypes.DECIMAL(20, 8),
      field: 'counterpart_amount',
      validate: {
        isDecimal: true,
        min: 0
      }
    },
    
    counterpartCurrency: {
      type: DataTypes.STRING(3),
      field: 'counterpart_currency',
      validate: {
        len: [3, 3],
        isUppercase: true
      }
    },
    
    exchangeRate: {
      type: DataTypes.DECIMAL(15, 8),
      field: 'exchange_rate',
      validate: {
        isDecimal: true,
        min: 0
      }
    },
    
    // Transaction status
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'),
      defaultValue: 'pending'
    },
    
    // Unique reference number for tracking
    referenceNumber: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'reference_number'
    },
    
    // External reference (from payment gateways, banks, etc.)
    externalReference: {
      type: DataTypes.STRING(255),
      field: 'external_reference'
    },
    
    // Transaction description and notes
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    internalNotes: {
      type: DataTypes.TEXT,
      field: 'internal_notes'
    },
    
    // Double-entry bookkeeping fields
    debitAccount: {
      type: DataTypes.STRING(100),
      field: 'debit_account'
    },
    
    creditAccount: {
      type: DataTypes.STRING(100),
      field: 'credit_account'
    },
    
    journalEntryId: {
      type: DataTypes.UUID,
      field: 'journal_entry_id',
      references: {
        model: 'JournalEntries',
        key: 'id'
      }
    },
    
    // Fees and charges
    fee: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      validate: {
        min: 0,
        isDecimal: true
      }
    },
    
    feeCurrency: {
      type: DataTypes.STRING(3),
      field: 'fee_currency',
      validate: {
        len: [3, 3],
        isUppercase: true
      }
    },
    
    commission: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      validate: {
        min: 0,
        isDecimal: true
      }
    },
    
    commissionCurrency: {
      type: DataTypes.STRING(3),
      field: 'commission_currency',
      validate: {
        len: [3, 3],
        isUppercase: true
      }
    },
    
    // Counterparty information
    counterpartyId: {
      type: DataTypes.UUID,
      field: 'counterparty_id',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    counterpartyType: {
      type: DataTypes.ENUM('user', 'bank', 'exchange', 'merchant', 'system'),
      field: 'counterparty_type'
    },
    
    counterpartyInfo: {
      type: DataTypes.JSONB,
      field: 'counterparty_info',
      defaultValue: {}
    },
    
    // Risk and compliance
    riskScore: {
      type: DataTypes.DECIMAL(3, 2),
      field: 'risk_score',
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1
      }
    },
    
    complianceStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'flagged', 'rejected'),
      defaultValue: 'pending',
      field: 'compliance_status'
    },
    
    amlStatus: {
      type: DataTypes.ENUM('clear', 'review', 'flagged', 'blocked'),
      defaultValue: 'clear',
      field: 'aml_status'
    },
    
    // Approval workflow
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'requires_approval'
    },
    
    approvedBy: {
      type: DataTypes.UUID,
      field: 'approved_by',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    approvedAt: {
      type: DataTypes.DATE,
      field: 'approved_at'
    },
    
    rejectedBy: {
      type: DataTypes.UUID,
      field: 'rejected_by',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    rejectedAt: {
      type: DataTypes.DATE,
      field: 'rejected_at'
    },
    
    rejectionReason: {
      type: DataTypes.TEXT,
      field: 'rejection_reason'
    },
    
    // Processing information
    processedAt: {
      type: DataTypes.DATE,
      field: 'processed_at'
    },
    
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at'
    },
    
    failedAt: {
      type: DataTypes.DATE,
      field: 'failed_at'
    },
    
    errorCode: {
      type: DataTypes.STRING(50),
      field: 'error_code'
    },
    
    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message'
    },
    
    // Metadata for additional information
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {
        source: 'manual',
        ipAddress: null,
        userAgent: null,
        deviceId: null,
        location: null,
        channel: 'web'
      }
    },
    
    // Linked transactions (for reversals, exchanges, etc.)
    parentTransactionId: {
      type: DataTypes.UUID,
      field: 'parent_transaction_id',
      references: {
        model: 'Transactions',
        key: 'id'
      }
    },
    
    relatedTransactionId: {
      type: DataTypes.UUID,
      field: 'related_transaction_id',
      references: {
        model: 'Transactions',
        key: 'id'
      }
    },
    
    // Batch processing
    batchId: {
      type: DataTypes.UUID,
      field: 'batch_id'
    },
    
    batchSequence: {
      type: DataTypes.INTEGER,
      field: 'batch_sequence'
    },
    
    // Reconciliation
    reconciledAt: {
      type: DataTypes.DATE,
      field: 'reconciled_at'
    },
    
    reconciledBy: {
      type: DataTypes.UUID,
      field: 'reconciled_by',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    // Audit fields
    createdBy: {
      type: DataTypes.UUID,
      field: 'created_by',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    updatedBy: {
      type: DataTypes.UUID,
      field: 'updated_by',
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'transactions',
    timestamps: true,
    paranoid: true,
    
    indexes: [
      // Unique constraint
      { fields: ['reference_number'], unique: true },
      
      // Performance indexes
      { fields: ['tenant_id'] },
      { fields: ['user_id'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['currency'] },
      { fields: ['created_at'] },
      { fields: ['completed_at'] },
      { fields: ['compliance_status'] },
      { fields: ['aml_status'] },
      { fields: ['external_reference'] },
      
      // Composite indexes for common queries
      { fields: ['tenant_id', 'user_id'] },
      { fields: ['tenant_id', 'type'] },
      { fields: ['tenant_id', 'status'] },
      { fields: ['user_id', 'type'] },
      { fields: ['user_id', 'status'] },
      { fields: ['type', 'status'] },
      { fields: ['currency', 'status'] },
      { fields: ['created_at', 'status'] },
      { fields: ['tenant_id', 'created_at'] },
      { fields: ['user_id', 'created_at'] },
      
      // Partial indexes for performance
      {
        fields: ['amount'],
        where: { amount: { [sequelize.Sequelize.Op.gte]: 10000 } },
        name: 'idx_transactions_high_value'
      },
      {
        fields: ['completed_at'],
        where: { status: 'completed' },
        name: 'idx_transactions_completed'
      },
      {
        fields: ['requires_approval'],
        where: { requires_approval: true },
        name: 'idx_transactions_pending_approval'
      }
    ],
    
    scopes: {
      pending: {
        where: { status: 'pending' }
      },
      
      completed: {
        where: { status: 'completed' }
      },
      
      byType: (type) => ({
        where: { type }
      }),
      
      byUser: (userId) => ({
        where: { userId }
      }),
      
      byTenant: (tenantId) => ({
        where: { tenantId }
      }),
      
      byCurrency: (currency) => ({
        where: { currency }
      }),
      
      highValue: (threshold = 10000) => ({
        where: {
          amount: {
            [sequelize.Sequelize.Op.gte]: threshold
          }
        }
      }),
      
      needsApproval: {
        where: {
          requiresApproval: true,
          approvedAt: null,
          rejectedAt: null
        }
      },
      
      recent: (days = 30) => ({
        where: {
          createdAt: {
            [sequelize.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        }
      })
    },
    
    hooks: {
      beforeCreate: async (transaction) => {
        // Generate reference number if not provided
        if (!transaction.referenceNumber) {
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substr(2, 5);
          transaction.referenceNumber = `TXN-${timestamp}-${random}`.toUpperCase();
        }
        
        // Set default fee currency to transaction currency
        if (transaction.fee > 0 && !transaction.feeCurrency) {
          transaction.feeCurrency = transaction.currency;
        }
        
        // Set default commission currency to transaction currency
        if (transaction.commission > 0 && !transaction.commissionCurrency) {
          transaction.commissionCurrency = transaction.currency;
        }
        
        // Calculate risk score based on amount and type
        transaction.riskScore = calculateRiskScore(transaction);
      },
      
      beforeUpdate: async (transaction) => {
        // Update timestamps based on status changes
        if (transaction.changed('status')) {
          const now = new Date();
          
          switch (transaction.status) {
            case 'processing':
              transaction.processedAt = now;
              break;
            case 'completed':
              transaction.completedAt = now;
              break;
            case 'failed':
              transaction.failedAt = now;
              break;
          }
        }
      },
      
      afterUpdate: async (transaction) => {
        // Update account balances when transaction is completed
        if (transaction.changed('status') && transaction.status === 'completed') {
          await updateAccountBalances(transaction);
        }
      }
    }
  });
  
  // Helper function to calculate risk score
  function calculateRiskScore(transaction) {
    let score = 0;
    
    // Amount-based risk
    if (transaction.amount >= 100000) score += 0.4;
    else if (transaction.amount >= 50000) score += 0.3;
    else if (transaction.amount >= 10000) score += 0.2;
    else if (transaction.amount >= 1000) score += 0.1;
    
    // Type-based risk
    const highRiskTypes = ['withdrawal', 'remittance_send', 'p2p_trade'];
    if (highRiskTypes.includes(transaction.type)) score += 0.3;
    
    // Currency-based risk
    const cryptoCurrencies = ['BTC', 'ETH', 'LTC', 'XRP'];
    if (cryptoCurrencies.includes(transaction.currency)) score += 0.2;
    
    return Math.min(score, 1); // Cap at 1.0
  }
  
  // Helper function to update account balances
  async function updateAccountBalances(transaction) {
    // This would implement the actual balance updates
    // based on transaction type and double-entry rules
    // Implementation depends on specific business logic
  }
  
  // Instance methods
  Transaction.prototype.approve = async function(approvedBy) {
    return await this.update({
      approvedBy,
      approvedAt: new Date(),
      status: 'processing'
    });
  };
  
  Transaction.prototype.reject = async function(rejectedBy, reason) {
    return await this.update({
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason,
      status: 'cancelled'
    });
  };
  
  Transaction.prototype.markAsCompleted = async function() {
    return await this.update({
      status: 'completed',
      completedAt: new Date()
    });
  };
  
  Transaction.prototype.markAsFailed = async function(errorCode, errorMessage) {
    return await this.update({
      status: 'failed',
      failedAt: new Date(),
      errorCode,
      errorMessage
    });
  };
  
  Transaction.prototype.reverse = async function(reason, createdBy) {
    // Create a reversal transaction
    const reversalTransaction = await Transaction.create({
      tenantId: this.tenantId,
      userId: this.userId,
      accountBalanceId: this.accountBalanceId,
      type: 'reversal',
      amount: this.amount,
      currency: this.currency,
      description: `Reversal of ${this.referenceNumber}: ${reason}`,
      parentTransactionId: this.id,
      status: 'completed',
      createdBy
    });
    
    return reversalTransaction;
  };
  
  Transaction.prototype.reconcile = async function(reconciledBy) {
    return await this.update({
      reconciledAt: new Date(),
      reconciledBy
    });
  };
  
  Transaction.prototype.getNetAmount = function() {
    return parseFloat(this.amount) - parseFloat(this.fee) - parseFloat(this.commission);
  };
  
  Transaction.prototype.isHighValue = function(threshold = 10000) {
    return parseFloat(this.amount) >= threshold;
  };
  
  Transaction.prototype.requiresManualReview = function() {
    return this.riskScore >= 0.7 || 
           this.isHighValue() || 
           this.amlStatus !== 'clear' || 
           this.complianceStatus === 'flagged';
  };
  
  // Class methods
  Transaction.generateReferenceNumber = function(prefix = 'TXN') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  };
  
  Transaction.findByReference = async function(referenceNumber) {
    return await Transaction.findOne({
      where: { referenceNumber },
      include: [
        { model: sequelize.models.User, as: 'user' },
        { model: sequelize.models.AccountBalance, as: 'accountBalance' }
      ]
    });
  };
  
  // Model associations
  Transaction.associate = (models) => {
    // Transaction belongs to tenant
    Transaction.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });
    
    // Transaction belongs to user
    Transaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // Transaction belongs to account balance
    Transaction.belongsTo(models.AccountBalance, {
      foreignKey: 'accountBalanceId',
      as: 'accountBalance'
    });
    
    // Transaction belongs to counterparty user
    Transaction.belongsTo(models.User, {
      foreignKey: 'counterpartyId',
      as: 'counterparty'
    });
    
    // Transaction belongs to approver
    Transaction.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
    
    // Transaction belongs to rejecter
    Transaction.belongsTo(models.User, {
      foreignKey: 'rejectedBy',
      as: 'rejecter'
    });
    
    // Self-referential associations
    Transaction.belongsTo(models.Transaction, {
      foreignKey: 'parentTransactionId',
      as: 'parentTransaction'
    });
    
    Transaction.hasMany(models.Transaction, {
      foreignKey: 'parentTransactionId',
      as: 'childTransactions'
    });
    
    Transaction.belongsTo(models.Transaction, {
      foreignKey: 'relatedTransactionId',
      as: 'relatedTransaction'
    });
    
    // Transaction belongs to creator and updater
    Transaction.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    Transaction.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
    
    Transaction.belongsTo(models.User, {
      foreignKey: 'reconciledBy',
      as: 'reconciler'
    });
  };
  
  return Transaction;
};