// backend/src/models/sequelize/JournalEntry.js - Double-entry bookkeeping Journal Entry Model
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const JournalEntry = sequelizeManager.getInstance().define('JournalEntry', {
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
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Entry identification
  entryNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'entry_number'
  },
  entryType: {
    type: DataTypes.ENUM(
      'manual',         // Manual journal entry
      'automatic',      // System-generated entry
      'adjustment',     // Adjustment entry
      'reversal',       // Reversal entry
      'closing',        // Period closing entry
      'opening'         // Period opening entry
    ),
    defaultValue: 'automatic',
    field: 'entry_type'
  },
  
  // Entry details
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'transaction_date'
  },
  postingDate: {
    type: DataTypes.DATE,
    field: 'posting_date'
  },
  
  // Financial details
  totalDebitAmount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    defaultValue: 0,
    field: 'total_debit_amount'
  },
  totalCreditAmount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    defaultValue: 0,
    field: 'total_credit_amount'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  
  // Status and control
  status: {
    type: DataTypes.ENUM('draft', 'posted', 'reversed', 'cancelled'),
    defaultValue: 'draft'
  },
  isReversed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_reversed'
  },
  reversedBy: {
    type: DataTypes.UUID,
    field: 'reversed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reversedAt: {
    type: DataTypes.DATE,
    field: 'reversed_at'
  },
  reversalReason: {
    type: DataTypes.TEXT,
    field: 'reversal_reason'
  },
  
  // Approval workflow
  approvedBy: {
    type: DataTypes.UUID,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    field: 'approved_at'
  },
  
  // Period information
  fiscalYear: {
    type: DataTypes.INTEGER,
    field: 'fiscal_year'
  },
  fiscalPeriod: {
    type: DataTypes.INTEGER,
    field: 'fiscal_period'
  },
  
  // Source information
  sourceModule: {
    type: DataTypes.ENUM(
      'cash_management',
      'bank_operations',
      'exchanges',
      'remittances',
      'p2p_trading',
      'commission_management',
      'manual_entry',
      'system_adjustment',
      'period_closing'
    ),
    field: 'source_module'
  },
  sourceTransactionId: {
    type: DataTypes.UUID,
    field: 'source_transaction_id'
  },
  
  // Double-entry line items (stored as JSONB for flexibility)
  lineItems: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    field: 'line_items',
    validate: {
      isValidDoubleEntry(value) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('Journal entry must have line items');
        }
        
        let totalDebits = 0;
        let totalCredits = 0;
        
        for (const item of value) {
          if (!item.accountCode || !item.amount) {
            throw new Error('Each line item must have account code and amount');
          }
          
          if (item.type === 'debit') {
            totalDebits += parseFloat(item.amount);
          } else if (item.type === 'credit') {
            totalCredits += parseFloat(item.amount);
          }
        }
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          throw new Error('Total debits must equal total credits');
        }
      }
    }
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Audit fields
  notes: {
    type: DataTypes.TEXT
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'journal_entries',
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['entry_number']
    },
    {
      fields: ['tenant_id', 'status']
    },
    {
      fields: ['tenant_id', 'transaction_date']
    },
    {
      fields: ['tenant_id', 'fiscal_year', 'fiscal_period']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['source_module']
    },
    {
      fields: ['source_transaction_id']
    }
  ],
  hooks: {
    beforeCreate: async (entry) => {
      if (!entry.entryNumber) {
        entry.entryNumber = await JournalEntry.generateEntryNumber();
      }
      if (!entry.transactionDate) {
        entry.transactionDate = new Date();
      }
      
      // Calculate totals from line items
      entry.calculateTotals();
    },
    beforeUpdate: async (entry) => {
      if (entry.changed('lineItems')) {
        entry.calculateTotals();
      }
      if (entry.changed('status') && entry.status === 'posted' && !entry.postingDate) {
        entry.postingDate = new Date();
      }
    }
  }
});

// Instance methods
JournalEntry.prototype.calculateTotals = function() {
  let totalDebits = 0;
  let totalCredits = 0;
  
  if (this.lineItems && Array.isArray(this.lineItems)) {
    for (const item of this.lineItems) {
      const amount = parseFloat(item.amount) || 0;
      if (item.type === 'debit') {
        totalDebits += amount;
      } else if (item.type === 'credit') {
        totalCredits += amount;
      }
    }
  }
  
  this.totalDebitAmount = totalDebits;
  this.totalCreditAmount = totalCredits;
};

JournalEntry.prototype.isBalanced = function() {
  return Math.abs(this.totalDebitAmount - this.totalCreditAmount) < 0.01;
};

JournalEntry.prototype.post = async function(userId) {
  if (!this.isBalanced()) {
    throw new Error('Journal entry is not balanced');
  }
  
  return this.update({
    status: 'posted',
    postingDate: new Date(),
    approvedBy: userId,
    approvedAt: new Date()
  });
};

JournalEntry.prototype.reverse = async function(userId, reason) {
  if (this.status !== 'posted') {
    throw new Error('Only posted entries can be reversed');
  }
  
  return this.update({
    status: 'reversed',
    isReversed: true,
    reversedBy: userId,
    reversedAt: new Date(),
    reversalReason: reason
  });
};

// Class methods
JournalEntry.generateEntryNumber = async function() {
  const prefix = 'JE';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}${year}${timestamp}${random}`;
};

JournalEntry.findByPeriod = function(fiscalYear, fiscalPeriod, tenantId) {
  return this.findAll({
    where: {
      tenantId,
      fiscalYear,
      fiscalPeriod,
      status: 'posted'
    },
    order: [['transactionDate', 'ASC']]
  });
};

JournalEntry.findByDateRange = function(startDate, endDate, tenantId) {
  return this.findAll({
    where: {
      tenantId,
      transactionDate: {
        [sequelizeManager.getInstance().Sequelize.Op.between]: [startDate, endDate]
      },
      status: 'posted'
    },
    order: [['transactionDate', 'ASC']]
  });
};

module.exports = JournalEntry;