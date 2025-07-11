// backend/src/models/sequelize/Check.js
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const Check = sequelizeManager.getInstance().define('Check', {
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
  accountId: {
    type: DataTypes.UUID,
    field: 'account_id'
  },
  transactionId: {
    type: DataTypes.UUID,
    field: 'transaction_id'
  },
  issuedBy: {
    type: DataTypes.UUID,
    field: 'issued_by'
  },
  receivedBy: {
    type: DataTypes.UUID,
    field: 'received_by'
  },
  checkNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'check_number'
  },
  checkType: {
    type: DataTypes.ENUM('issued', 'received'),
    allowNull: false,
    field: 'check_type'
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false
  },
  issueDate: {
    type: DataTypes.DATE,
    field: 'issue_date'
  },
  dueDate: {
    type: DataTypes.DATE,
    field: 'due_date'
  },
  clearingDate: {
    type: DataTypes.DATE,
    field: 'clearing_date'
  },
  status: {
    type: DataTypes.ENUM('pending', 'cleared', 'bounced', 'cancelled'),
    defaultValue: 'pending'
  },
  bankName: {
    type: DataTypes.STRING,
    field: 'bank_name'
  },
  bankCode: {
    type: DataTypes.STRING,
    field: 'bank_code'
  },
  memo: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'checks',
  underscored: true,
  paranoid: true
});

module.exports = Check;