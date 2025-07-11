// backend/src/models/sequelize/Commission.js
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const Commission = sequelizeManager.getInstance().define('Commission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id'
  },
  userId: {
    type: DataTypes.UUID,
    field: 'user_id'
  },
  transactionId: {
    type: DataTypes.UUID,
    field: 'transaction_id'
  },
  commissionType: {
    type: DataTypes.ENUM('percentage', 'fixed', 'tiered'),
    defaultValue: 'percentage',
    field: 'commission_type'
  },
  rate: {
    type: DataTypes.DECIMAL(10, 4)
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'commissions',
  underscored: true,
  paranoid: true
});

module.exports = Commission;