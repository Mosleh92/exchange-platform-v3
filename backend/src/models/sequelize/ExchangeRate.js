// backend/src/models/sequelize/ExchangeRate.js
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const ExchangeRate = sequelizeManager.getInstance().define('ExchangeRate', {
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
  fromCurrency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    field: 'from_currency'
  },
  toCurrency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    field: 'to_currency'
  },
  buyRate: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    field: 'buy_rate'
  },
  sellRate: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    field: 'sell_rate'
  },
  midRate: {
    type: DataTypes.DECIMAL(20, 8),
    field: 'mid_rate'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  updatedBy: {
    type: DataTypes.UUID,
    field: 'updated_by'
  },
  effectiveFrom: {
    type: DataTypes.DATE,
    field: 'effective_from'
  },
  effectiveTo: {
    type: DataTypes.DATE,
    field: 'effective_to'
  }
}, {
  tableName: 'exchange_rates',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['tenant_id', 'from_currency', 'to_currency', 'effective_from']
    }
  ]
});

module.exports = ExchangeRate;