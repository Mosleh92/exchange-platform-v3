// backend/src/models/sequelize/Remittance.js
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const Remittance = sequelizeManager.getInstance().define('Remittance', {
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
  senderId: {
    type: DataTypes.UUID,
    field: 'sender_id'
  },
  receiverId: {
    type: DataTypes.UUID,
    field: 'receiver_id'
  },
  transactionId: {
    type: DataTypes.UUID,
    field: 'transaction_id'
  },
  originBranchId: {
    type: DataTypes.UUID,
    field: 'origin_branch_id'
  },
  destinationBranchId: {
    type: DataTypes.UUID,
    field: 'destination_branch_id'
  },
  remittanceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'remittance_number'
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false
  },
  exchangeRate: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'exchange_rate'
  },
  fees: {
    type: DataTypes.DECIMAL(20, 8),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'received', 'picked_up', 'cancelled'),
    defaultValue: 'pending'
  },
  senderInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'sender_info'
  },
  receiverInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'receiver_info'
  },
  purpose: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'remittances',
  underscored: true,
  paranoid: true
});

module.exports = Remittance;