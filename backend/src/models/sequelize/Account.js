// backend/src/models/sequelize/Account.js - Sequelize Account Model
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const Account = sequelizeManager.getInstance().define('Account', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  branchId: {
    type: DataTypes.UUID,
    field: 'branch_id',
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  
  // Account identification
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'account_number'
  },
  accountType: {
    type: DataTypes.ENUM(
      'cash',           // Cash account
      'bank',           // Bank account
      'crypto',         // Cryptocurrency wallet
      'p2p',            // P2P trading account
      'commission',     // Commission account
      'suspense',       // Suspense account
      'clearing',       // Clearing account
      'nostro',         // Nostro account (foreign currency)
      'vostro',         // Vostro account (customer foreign currency)
      'internal'        // Internal system account
    ),
    defaultValue: 'cash',
    field: 'account_type'
  },
  
  // Financial details
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  balance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    validate: {
      min: -999999999999
    }
  },
  availableBalance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'available_balance'
  },
  frozenBalance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'frozen_balance'
  },
  pendingBalance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'pending_balance'
  },
  
  // Limits and restrictions
  dailyLimit: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'daily_limit'
  },
  monthlyLimit: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'monthly_limit'
  },
  yearlyLimit: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'yearly_limit'
  },
  minimumBalance: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'minimum_balance'
  },
  maximumBalance: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'maximum_balance'
  },
  
  // Account status and control
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'frozen', 'closed', 'suspended'),
    defaultValue: 'active'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  },
  allowDebit: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'allow_debit'
  },
  allowCredit: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'allow_credit'
  },
  requireApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'require_approval'
  },
  
  // External account details (for bank accounts)
  bankName: {
    type: DataTypes.STRING,
    field: 'bank_name'
  },
  bankCode: {
    type: DataTypes.STRING,
    field: 'bank_code'
  },
  swiftCode: {
    type: DataTypes.STRING,
    field: 'swift_code'
  },
  iban: {
    type: DataTypes.STRING
  },
  routingNumber: {
    type: DataTypes.STRING,
    field: 'routing_number'
  },
  
  // Crypto wallet details
  walletAddress: {
    type: DataTypes.STRING,
    field: 'wallet_address'
  },
  privateKeyEncrypted: {
    type: DataTypes.TEXT,
    field: 'private_key_encrypted'
  },
  publicKey: {
    type: DataTypes.TEXT,
    field: 'public_key'
  },
  network: {
    type: DataTypes.STRING // ETH, BTC, TRX, etc.
  },
  
  // Interest and fees
  interestRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0,
    field: 'interest_rate'
  },
  maintenanceFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'maintenance_fee'
  },
  transactionFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'transaction_fee'
  },
  
  // Accounting details
  accountCode: {
    type: DataTypes.STRING,
    field: 'account_code'
  },
  glAccountCode: {
    type: DataTypes.STRING,
    field: 'gl_account_code'
  },
  costCenter: {
    type: DataTypes.STRING,
    field: 'cost_center'
  },
  
  // Dates
  openedDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'opened_date'
  },
  closedDate: {
    type: DataTypes.DATE,
    field: 'closed_date'
  },
  lastTransactionDate: {
    type: DataTypes.DATE,
    field: 'last_transaction_date'
  },
  
  // Statistics
  totalCredits: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'total_credits'
  },
  totalDebits: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0,
    field: 'total_debits'
  },
  transactionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'transaction_count'
  },
  
  // Additional details
  description: {
    type: DataTypes.TEXT
  },
  notes: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'accounts',
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['account_number']
    },
    {
      fields: ['tenant_id', 'user_id']
    },
    {
      fields: ['tenant_id', 'account_type']
    },
    {
      fields: ['tenant_id', 'currency']
    },
    {
      fields: ['tenant_id', 'status']
    },
    {
      fields: ['branch_id']
    },
    {
      fields: ['bank_code']
    },
    {
      fields: ['wallet_address']
    },
    {
      fields: ['account_code']
    }
  ],
  hooks: {
    beforeCreate: async (account) => {
      if (!account.accountNumber) {
        account.accountNumber = await Account.generateAccountNumber(account.accountType);
      }
      account.availableBalance = account.balance - account.frozenBalance;
    },
    beforeUpdate: async (account) => {
      if (account.changed('balance') || account.changed('frozenBalance')) {
        account.availableBalance = account.balance - account.frozenBalance;
      }
      if (account.changed('status') && account.status === 'closed' && !account.closedDate) {
        account.closedDate = new Date();
      }
    }
  }
});

// Instance methods
Account.prototype.isActive = function() {
  return this.status === 'active';
};

Account.prototype.isFrozen = function() {
  return this.status === 'frozen';
};

Account.prototype.canDebit = function(amount) {
  if (!this.allowDebit || !this.isActive()) return false;
  if (this.minimumBalance && (this.availableBalance - amount) < this.minimumBalance) return false;
  return this.availableBalance >= amount;
};

Account.prototype.canCredit = function(amount) {
  if (!this.allowCredit || !this.isActive()) return false;
  if (this.maximumBalance && (this.balance + amount) > this.maximumBalance) return false;
  return true;
};

Account.prototype.updateBalance = async function(amount, type = 'credit') {
  const updates = {
    lastTransactionDate: new Date(),
    transactionCount: this.transactionCount + 1
  };
  
  if (type === 'credit') {
    updates.balance = this.balance + amount;
    updates.totalCredits = this.totalCredits + amount;
  } else {
    updates.balance = this.balance - amount;
    updates.totalDebits = this.totalDebits + amount;
  }
  
  return this.update(updates);
};

Account.prototype.freezeAmount = async function(amount) {
  if (this.availableBalance < amount) {
    throw new Error('Insufficient available balance to freeze');
  }
  return this.update({
    frozenBalance: this.frozenBalance + amount
  });
};

Account.prototype.unfreezeAmount = async function(amount) {
  const unfreezeAmount = Math.min(amount, this.frozenBalance);
  return this.update({
    frozenBalance: this.frozenBalance - unfreezeAmount
  });
};

// Class methods
Account.generateAccountNumber = async function(accountType) {
  const typePrefix = {
    'cash': 'CASH',
    'bank': 'BANK',
    'crypto': 'CRYP',
    'p2p': 'P2P',
    'commission': 'COMM',
    'suspense': 'SUSP',
    'clearing': 'CLRG',
    'nostro': 'NOST',
    'vostro': 'VOST',
    'internal': 'INTL'
  };
  
  const prefix = typePrefix[accountType] || 'ACCT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

Account.findByAccountNumber = function(accountNumber) {
  return this.findOne({ where: { accountNumber } });
};

Account.findByUser = function(userId, tenantId) {
  return this.findAll({
    where: {
      userId,
      tenantId,
      status: 'active'
    }
  });
};

Account.findByType = function(accountType, tenantId) {
  return this.findAll({
    where: {
      accountType,
      tenantId,
      status: 'active'
    }
  });
};

module.exports = Account;