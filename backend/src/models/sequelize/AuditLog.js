// backend/src/models/sequelize/AuditLog.js - Audit Log Model for Security and Compliance
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const AuditLog = sequelizeManager.getInstance().define('AuditLog', {
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
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Action details
  action: {
    type: DataTypes.ENUM(
      'user_login',
      'user_logout',
      'user_created',
      'user_updated',
      'user_deleted',
      'password_changed',
      'password_reset',
      'two_fa_enabled',
      'two_fa_disabled',
      'transaction_created',
      'transaction_updated',
      'transaction_approved',
      'transaction_rejected',
      'account_created',
      'account_updated',
      'account_frozen',
      'account_unfrozen',
      'balance_updated',
      'settings_changed',
      'report_generated',
      'export_data',
      'import_data',
      'admin_action',
      'security_violation',
      'api_access',
      'file_uploaded',
      'file_deleted'
    ),
    allowNull: false
  },
  entity: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityId: {
    type: DataTypes.UUID,
    field: 'entity_id'
  },
  
  // Request details
  method: {
    type: DataTypes.STRING
  },
  endpoint: {
    type: DataTypes.STRING
  },
  statusCode: {
    type: DataTypes.INTEGER,
    field: 'status_code'
  },
  
  // User context
  ipAddress: {
    type: DataTypes.INET,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  },
  sessionId: {
    type: DataTypes.STRING,
    field: 'session_id'
  },
  
  // Change tracking
  oldValues: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'old_values'
  },
  newValues: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'new_values'
  },
  changes: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Additional context
  description: {
    type: DataTypes.TEXT
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Risk and compliance
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low',
    field: 'risk_level'
  },
  complianceFlags: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'compliance_flags'
  },
  
  // Timing
  duration: {
    type: DataTypes.INTEGER // in milliseconds
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'audit_logs',
  underscored: true,
  timestamps: false, // We use our own timestamp field
  indexes: [
    {
      fields: ['tenant_id', 'timestamp']
    },
    {
      fields: ['user_id', 'timestamp']
    },
    {
      fields: ['action']
    },
    {
      fields: ['entity', 'entity_id']
    },
    {
      fields: ['ip_address']
    },
    {
      fields: ['risk_level']
    },
    {
      fields: ['timestamp']
    }
  ]
});

// Class methods
AuditLog.log = async function(data) {
  return this.create({
    ...data,
    timestamp: new Date()
  });
};

AuditLog.findByUser = function(userId, limit = 100) {
  return this.findAll({
    where: { userId },
    order: [['timestamp', 'DESC']],
    limit
  });
};

AuditLog.findByAction = function(action, tenantId, limit = 100) {
  return this.findAll({
    where: { action, tenantId },
    order: [['timestamp', 'DESC']],
    limit
  });
};

AuditLog.findByDateRange = function(startDate, endDate, tenantId) {
  return this.findAll({
    where: {
      tenantId,
      timestamp: {
        [sequelizeManager.getInstance().Sequelize.Op.between]: [startDate, endDate]
      }
    },
    order: [['timestamp', 'DESC']]
  });
};

AuditLog.findSecurityViolations = function(tenantId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.findAll({
    where: {
      tenantId,
      riskLevel: ['high', 'critical'],
      timestamp: {
        [sequelizeManager.getInstance().Sequelize.Op.gte]: startDate
      }
    },
    order: [['timestamp', 'DESC']]
  });
};

module.exports = AuditLog;