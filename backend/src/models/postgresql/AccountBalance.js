// src/models/postgresql/AccountBalance.js
module.exports = (sequelize, DataTypes) => {
  const AccountBalance = sequelize.define('AccountBalance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // User and tenant relationship
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      field: 'user_id'
    },
    
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Tenants',
        key: 'id'
      },
      field: 'tenant_id'
    },
    
    // Currency information
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      validate: {
        len: [3, 3],
        isUppercase: true
      }
    },
    
    // Balance types with 8 decimal precision for cryptocurrency support
    availableBalance: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
      field: 'available_balance',
      validate: {
        min: 0,
        isDecimal: true
      }
    },
    
    pendingBalance: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
      field: 'pending_balance',
      validate: {
        min: 0,
        isDecimal: true
      }
    },
    
    frozenBalance: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
      field: 'frozen_balance',
      validate: {
        min: 0,
        isDecimal: true
      }
    },
    
    // Total balance (computed field for easy querying)
    totalBalance: {
      type: DataTypes.VIRTUAL,
      get() {
        const available = parseFloat(this.availableBalance) || 0;
        const pending = parseFloat(this.pendingBalance) || 0;
        const frozen = parseFloat(this.frozenBalance) || 0;
        return (available + pending + frozen).toFixed(8);
      }
    },
    
    // Account limits and settings
    limits: {
      type: DataTypes.JSONB,
      defaultValue: {
        dailyWithdrawalLimit: null,
        monthlyWithdrawalLimit: null,
        dailyTransactionLimit: null,
        monthlyTransactionLimit: null,
        minimumBalance: 0
      }
    },
    
    // Account status and flags
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    
    isFrozen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_frozen'
    },
    
    freezeReason: {
      type: DataTypes.TEXT,
      field: 'freeze_reason'
    },
    
    frozenAt: {
      type: DataTypes.DATE,
      field: 'frozen_at'
    },
    
    frozenBy: {
      type: DataTypes.UUID,
      field: 'frozen_by',
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    // Interest and yield tracking
    interestRate: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 0,
      field: 'interest_rate',
      validate: {
        min: 0,
        max: 1 // 100%
      }
    },
    
    lastInterestCalculation: {
      type: DataTypes.DATE,
      field: 'last_interest_calculation'
    },
    
    accruedInterest: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      field: 'accrued_interest'
    },
    
    // Risk management
    riskLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'low',
      field: 'risk_level'
    },
    
    // Audit and compliance
    lastAuditAt: {
      type: DataTypes.DATE,
      field: 'last_audit_at'
    },
    
    complianceStatus: {
      type: DataTypes.ENUM('compliant', 'under_review', 'non_compliant'),
      defaultValue: 'compliant',
      field: 'compliance_status'
    },
    
    // Metadata for additional information
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {
        accountType: 'standard',
        tags: [],
        notes: null,
        externalAccountId: null
      }
    },
    
    // Activity tracking
    lastTransactionAt: {
      type: DataTypes.DATE,
      field: 'last_transaction_at'
    },
    
    transactionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'transaction_count'
    },
    
    // Version control for optimistic locking
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'account_balances',
    timestamps: true,
    paranoid: true,
    version: true, // Enable optimistic locking
    
    indexes: [
      // Unique constraint for user-currency combination
      { 
        fields: ['user_id', 'currency'], 
        unique: true,
        name: 'unique_user_currency_balance'
      },
      
      // Performance indexes
      { fields: ['tenant_id'] },
      { fields: ['currency'] },
      { fields: ['is_active'] },
      { fields: ['is_frozen'] },
      { fields: ['compliance_status'] },
      { fields: ['last_transaction_at'] },
      
      // Composite indexes for common queries
      { fields: ['tenant_id', 'currency'] },
      { fields: ['user_id', 'is_active'] },
      { fields: ['tenant_id', 'is_active'] },
      { fields: ['currency', 'is_active'] },
      
      // Partial indexes for performance
      {
        fields: ['available_balance'],
        where: { available_balance: { [sequelize.Sequelize.Op.gt]: 0 } },
        name: 'idx_account_balances_positive_balance'
      },
      {
        fields: ['frozen_at'],
        where: { is_frozen: true },
        name: 'idx_account_balances_frozen'
      }
    ],
    
    scopes: {
      active: {
        where: { isActive: true }
      },
      
      byCurrency: (currency) => ({
        where: { currency }
      }),
      
      byTenant: (tenantId) => ({
        where: { tenantId }
      }),
      
      withPositiveBalance: {
        where: {
          availableBalance: {
            [sequelize.Sequelize.Op.gt]: 0
          }
        }
      },
      
      frozen: {
        where: { isFrozen: true }
      },
      
      withUser: {
        include: [{
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      }
    },
    
    hooks: {
      beforeUpdate: async (accountBalance) => {
        // Prevent negative balances
        if (accountBalance.availableBalance < 0) {
          throw new Error('Available balance cannot be negative');
        }
        if (accountBalance.pendingBalance < 0) {
          throw new Error('Pending balance cannot be negative');
        }
        if (accountBalance.frozenBalance < 0) {
          throw new Error('Frozen balance cannot be negative');
        }
        
        // Update transaction count and last transaction date if balance changed
        if (accountBalance.changed('availableBalance') || 
            accountBalance.changed('pendingBalance') || 
            accountBalance.changed('frozenBalance')) {
          accountBalance.lastTransactionAt = new Date();
          accountBalance.transactionCount += 1;
        }
      },
      
      afterCreate: async (accountBalance) => {
        // Log account creation for audit purposes
        // This could trigger notifications, compliance checks, etc.
      }
    }
  });
  
  // Instance methods
  AccountBalance.prototype.canWithdraw = function(amount) {
    const available = parseFloat(this.availableBalance) || 0;
    return !this.isFrozen && 
           this.isActive && 
           available >= parseFloat(amount) && 
           this.complianceStatus === 'compliant';
  };
  
  AccountBalance.prototype.freeze = async function(reason, frozenBy) {
    return await this.update({
      isFrozen: true,
      freezeReason: reason,
      frozenAt: new Date(),
      frozenBy: frozenBy
    });
  };
  
  AccountBalance.prototype.unfreeze = async function() {
    return await this.update({
      isFrozen: false,
      freezeReason: null,
      frozenAt: null,
      frozenBy: null
    });
  };
  
  AccountBalance.prototype.addBalance = async function(amount, type = 'available') {
    const field = `${type}Balance`;
    const currentBalance = parseFloat(this[field]) || 0;
    const newBalance = currentBalance + parseFloat(amount);
    
    return await this.update({
      [field]: newBalance.toFixed(8)
    });
  };
  
  AccountBalance.prototype.subtractBalance = async function(amount, type = 'available') {
    const field = `${type}Balance`;
    const currentBalance = parseFloat(this[field]) || 0;
    const newBalance = currentBalance - parseFloat(amount);
    
    if (newBalance < 0) {
      throw new Error(`Insufficient ${type} balance`);
    }
    
    return await this.update({
      [field]: newBalance.toFixed(8)
    });
  };
  
  AccountBalance.prototype.transferBalance = async function(fromType, toType, amount) {
    const fromField = `${fromType}Balance`;
    const toField = `${toType}Balance`;
    
    const fromBalance = parseFloat(this[fromField]) || 0;
    const toBalance = parseFloat(this[toField]) || 0;
    const transferAmount = parseFloat(amount);
    
    if (fromBalance < transferAmount) {
      throw new Error(`Insufficient ${fromType} balance for transfer`);
    }
    
    return await this.update({
      [fromField]: (fromBalance - transferAmount).toFixed(8),
      [toField]: (toBalance + transferAmount).toFixed(8)
    });
  };
  
  AccountBalance.prototype.calculateInterest = function() {
    if (!this.interestRate || this.interestRate <= 0) {
      return 0;
    }
    
    const principal = parseFloat(this.availableBalance) || 0;
    const rate = parseFloat(this.interestRate) || 0;
    const lastCalculation = this.lastInterestCalculation || this.createdAt;
    const daysSinceLastCalculation = Math.floor((new Date() - lastCalculation) / (1000 * 60 * 60 * 24));
    
    // Simple daily interest calculation
    const dailyRate = rate / 365;
    const interest = principal * dailyRate * daysSinceLastCalculation;
    
    return parseFloat(interest.toFixed(8));
  };
  
  AccountBalance.prototype.applyInterest = async function() {
    const interest = this.calculateInterest();
    
    if (interest > 0) {
      const currentAccrued = parseFloat(this.accruedInterest) || 0;
      
      return await this.update({
        accruedInterest: (currentAccrued + interest).toFixed(8),
        lastInterestCalculation: new Date()
      });
    }
    
    return this;
  };
  
  AccountBalance.prototype.getBalanceSummary = function() {
    return {
      currency: this.currency,
      available: parseFloat(this.availableBalance).toFixed(8),
      pending: parseFloat(this.pendingBalance).toFixed(8),
      frozen: parseFloat(this.frozenBalance).toFixed(8),
      total: this.totalBalance,
      accrued: parseFloat(this.accruedInterest).toFixed(8),
      isActive: this.isActive,
      isFrozen: this.isFrozen
    };
  };
  
  // Class methods
  AccountBalance.findOrCreateBalance = async function(userId, tenantId, currency) {
    const [balance, created] = await AccountBalance.findOrCreate({
      where: { userId, tenantId, currency },
      defaults: {
        userId,
        tenantId,
        currency,
        availableBalance: 0,
        pendingBalance: 0,
        frozenBalance: 0
      }
    });
    
    return { balance, created };
  };
  
  AccountBalance.getTenantBalanceSummary = async function(tenantId, currency = null) {
    const whereClause = { tenantId };
    if (currency) {
      whereClause.currency = currency;
    }
    
    const balances = await AccountBalance.findAll({
      where: whereClause,
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });
    
    return balances.map(balance => balance.getBalanceSummary());
  };
  
  // Model associations
  AccountBalance.associate = (models) => {
    // AccountBalance belongs to user
    AccountBalance.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // AccountBalance belongs to tenant
    AccountBalance.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });
    
    // AccountBalance belongs to user who froze it
    AccountBalance.belongsTo(models.User, {
      foreignKey: 'frozenBy',
      as: 'freezer'
    });
    
    // AccountBalance has many transactions
    AccountBalance.hasMany(models.Transaction, {
      foreignKey: 'accountBalanceId',
      as: 'transactions'
    });
  };
  
  return AccountBalance;
};