// backend/src/models/sequelize/Branch.js - Sequelize Branch Model
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const Branch = sequelizeManager.getInstance().define('Branch', {
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
  managerId: {
    type: DataTypes.UUID,
    field: 'manager_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Basic information
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  
  // Contact information
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING
  },
  fax: {
    type: DataTypes.STRING
  },
  website: {
    type: DataTypes.STRING,
    validate: {
      isUrl: true
    }
  },
  
  // Address
  address: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Operational details
  type: {
    type: DataTypes.ENUM('main', 'branch', 'sub_branch', 'agent', 'kiosk'),
    defaultValue: 'branch'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'under_maintenance', 'closed'),
    defaultValue: 'active'
  },
  operatingHours: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'operating_hours'
  },
  timezone: {
    type: DataTypes.STRING,
    defaultValue: 'UTC'
  },
  
  // Capabilities and services
  services: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  currencies: {
    type: DataTypes.JSONB,
    defaultValue: ['USD']
  },
  allowedTransactions: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'allowed_transactions'
  },
  
  // Limits and controls
  dailyTransactionLimit: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'daily_transaction_limit'
  },
  monthlyTransactionLimit: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'monthly_transaction_limit'
  },
  singleTransactionLimit: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'single_transaction_limit'
  },
  
  // Statistics
  stats: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalUsers: 0,
      totalAccounts: 0,
      totalTransactions: 0,
      totalVolume: 0,
      dailyVolume: 0,
      monthlyVolume: 0
    }
  },
  
  // Configuration
  configuration: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'branches',
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['tenant_id', 'code']
    },
    {
      fields: ['tenant_id', 'status']
    },
    {
      fields: ['manager_id']
    },
    {
      fields: ['type']
    }
  ]
});

// Instance methods
Branch.prototype.isActive = function() {
  return this.status === 'active';
};

Branch.prototype.isOperating = function() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
  
  const todayHours = this.operatingHours[currentDay];
  if (!todayHours || !todayHours.open || !todayHours.close) {
    return false;
  }
  
  const openTime = parseInt(todayHours.open.replace(':', ''));
  const closeTime = parseInt(todayHours.close.replace(':', ''));
  
  return currentTime >= openTime && currentTime <= closeTime;
};

Branch.prototype.canProcessTransaction = function(transactionType, amount) {
  if (!this.isActive()) return false;
  if (!this.allowedTransactions.includes(transactionType)) return false;
  if (this.singleTransactionLimit && amount > this.singleTransactionLimit) return false;
  return true;
};

Branch.prototype.updateStats = async function(field, increment = 1) {
  const newStats = { ...this.stats };
  newStats[field] = (newStats[field] || 0) + increment;
  return this.update({ stats: newStats });
};

// Class methods
Branch.findByCode = function(code, tenantId) {
  return this.findOne({
    where: {
      code,
      tenantId
    }
  });
};

Branch.findActive = function(tenantId) {
  return this.findAll({
    where: {
      tenantId,
      status: 'active'
    }
  });
};

module.exports = Branch;