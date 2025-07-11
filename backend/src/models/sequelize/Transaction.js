// backend/src/models/sequelize/Transaction.js - Sequelize Transaction Model
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const Transaction = sequelizeManager.getInstance().define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  fromAccountId: {
    type: DataTypes.UUID,
    field: 'from_account_id',
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  toAccountId: {
    type: DataTypes.UUID,
    field: 'to_account_id',
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  
  // Financial Module Types (25+ types for complete accounting)
  transactionType: {
    type: DataTypes.ENUM(
      // Core cash operations
      'cash_receipt',
      'cash_payment',
      
      // Banking operations
      'bank_deposit',
      'bank_withdrawal',
      
      // Check operations
      'check_received',
      'check_issued',
      'check_bounced',
      'check_cleared',
      
      // Transfers
      'internal_transfer',
      'external_transfer',
      'inter_branch_transfer',
      
      // Exchange operations
      'currency_exchange_single',
      'currency_exchange_dual',
      'spot_exchange',
      'forward_exchange',
      
      // Remittance services
      'remittance_send',
      'remittance_receive',
      'remittance_pickup',
      'remittance_delivery',
      
      // Commission and fees
      'commission_earned',
      'commission_paid',
      'service_fee',
      'processing_fee',
      'maintenance_fee',
      
      // P2P and marketplace
      'p2p_order',
      'p2p_settlement',
      'marketplace_trade',
      
      // Reconciliation
      'reconciliation_adjustment',
      'balance_correction',
      'accounting_adjustment',
      
      // Asset management
      'asset_acquisition',
      'asset_disposal',
      'depreciation',
      
      // Liability management
      'debt_incurred',
      'debt_payment',
      'interest_payment',
      'loan_disbursement',
      
      // Tax and compliance
      'tax_payment',
      'regulatory_fee',
      'compliance_adjustment'
    ),
    allowNull: false,
    field: 'transaction_type'
  },
  
  // Financial details
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    validate: {
      len: [3, 3]
    }
  },
  exchangeRate: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 1.0,
    field: 'exchange_rate'
  },
  equivalentAmount: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'equivalent_amount'
  },
  baseCurrency: {
    type: DataTypes.STRING(3),
    field: 'base_currency'
  },
  
  // Commission and fees
  commissionAmount: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'commission_amount'
  },
  feeAmount: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'fee_amount'
  },
  netAmount: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'net_amount'
  },
  
  // Status and workflow
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'on_hold', 'rejected'),
    defaultValue: 'pending'
  },
  workflowStage: {
    type: DataTypes.ENUM('initiated', 'verified', 'approved', 'processed', 'settled', 'completed'),
    defaultValue: 'initiated',
    field: 'workflow_stage'
  },
  
  // Reference and documentation
  reference: {
    type: DataTypes.STRING,
    unique: true
  },
  externalReference: {
    type: DataTypes.STRING,
    field: 'external_reference'
  },
  description: {
    type: DataTypes.TEXT
  },
  memo: {
    type: DataTypes.TEXT
  },
  
  // Timing
  valueDate: {
    type: DataTypes.DATE,
    field: 'value_date'
  },
  processedAt: {
    type: DataTypes.DATE,
    field: 'processed_at'
  },
  settlementDate: {
    type: DataTypes.DATE,
    field: 'settlement_date'
  },
  
  // Approval workflow
  initiatedBy: {
    type: DataTypes.UUID,
    field: 'initiated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.UUID,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  processedBy: {
    type: DataTypes.UUID,
    field: 'processed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Double-entry bookkeeping
  journalEntryId: {
    type: DataTypes.UUID,
    field: 'journal_entry_id',
    references: {
      model: 'journal_entries',
      key: 'id'
    }
  },
  debitAccount: {
    type: DataTypes.STRING,
    field: 'debit_account'
  },
  creditAccount: {
    type: DataTypes.STRING,
    field: 'credit_account'
  },
  
  // Risk and compliance
  riskScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    },
    field: 'risk_score'
  },
  complianceFlags: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'compliance_flags'
  },
  
  // Customer information
  customerInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'customer_info'
  },
  beneficiaryInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'beneficiary_info'
  },
  
  // Location and channel
  branchId: {
    type: DataTypes.UUID,
    field: 'branch_id',
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  channel: {
    type: DataTypes.ENUM('web', 'mobile', 'api', 'teller', 'atm', 'pos'),
    defaultValue: 'web'
  },
  deviceInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'device_info'
  },
  locationInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'location_info'
  },
  
  // Integration and external systems
  bankTransactionId: {
    type: DataTypes.STRING,
    field: 'bank_transaction_id'
  },
  swiftReference: {
    type: DataTypes.STRING,
    field: 'swift_reference'
  },
  blockchainTxHash: {
    type: DataTypes.STRING,
    field: 'blockchain_tx_hash'
  },
  
  // Error handling
  errorCode: {
    type: DataTypes.STRING,
    field: 'error_code'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    field: 'error_message'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'retry_count'
  },
  
  // Metadata and custom fields
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  customFields: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'custom_fields'
  }
}, {
  tableName: 'transactions',
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['reference']
    },
    {
      fields: ['tenant_id', 'status']
    },
    {
      fields: ['tenant_id', 'transaction_type']
    },
    {
      fields: ['tenant_id', 'created_at']
    },
    {
      fields: ['from_account_id']
    },
    {
      fields: ['to_account_id']
    },
    {
      fields: ['initiated_by']
    },
    {
      fields: ['branch_id']
    },
    {
      fields: ['value_date']
    },
    {
      fields: ['amount']
    },
    {
      fields: ['currency']
    },
    {
      fields: ['workflow_stage']
    }
  ],
  hooks: {
    beforeCreate: async (transaction) => {
      if (!transaction.reference) {
        transaction.reference = await Transaction.generateReference();
      }
      if (!transaction.valueDate) {
        transaction.valueDate = new Date();
      }
      if (transaction.amount && transaction.exchangeRate) {
        transaction.equivalentAmount = transaction.amount * transaction.exchangeRate;
      }
      transaction.netAmount = transaction.amount - (transaction.commissionAmount || 0) - (transaction.feeAmount || 0);
    },
    beforeUpdate: async (transaction) => {
      if (transaction.changed('amount') || transaction.changed('exchangeRate')) {
        transaction.equivalentAmount = transaction.amount * transaction.exchangeRate;
      }
      if (transaction.changed('amount') || transaction.changed('commissionAmount') || transaction.changed('feeAmount')) {
        transaction.netAmount = transaction.amount - (transaction.commissionAmount || 0) - (transaction.feeAmount || 0);
      }
      if (transaction.changed('status') && transaction.status === 'completed' && !transaction.processedAt) {
        transaction.processedAt = new Date();
      }
    }
  }
});

// Instance methods
Transaction.prototype.isCompleted = function() {
  return this.status === 'completed';
};

Transaction.prototype.isPending = function() {
  return this.status === 'pending';
};

Transaction.prototype.canBeProcessed = function() {
  return ['pending', 'on_hold'].includes(this.status);
};

Transaction.prototype.calculateFees = function() {
  // Implementation would depend on business rules
  return {
    commission: this.commissionAmount || 0,
    fees: this.feeAmount || 0,
    total: (this.commissionAmount || 0) + (this.feeAmount || 0)
  };
};

// Class methods
Transaction.generateReference = async function() {
  const prefix = 'TXN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

Transaction.findByReference = function(reference) {
  return this.findOne({ where: { reference } });
};

Transaction.findByStatus = function(status, tenantId) {
  return this.findAll({
    where: {
      status,
      tenantId
    },
    order: [['createdAt', 'DESC']]
  });
};

Transaction.findByDateRange = function(startDate, endDate, tenantId) {
  return this.findAll({
    where: {
      tenantId,
      createdAt: {
        [sequelizeManager.getInstance().Sequelize.Op.between]: [startDate, endDate]
      }
    },
    order: [['createdAt', 'DESC']]
  });
};

module.exports = Transaction;