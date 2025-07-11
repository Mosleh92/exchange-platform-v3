// backend/src/models/sequelize/index.js - Sequelize Models Index
const sequelizeManager = require('../../config/sequelize');

// Initialize Sequelize
const sequelize = sequelizeManager.getInstance();

// Import models
const User = require('./User');
const Tenant = require('./Tenant');
const Transaction = require('./Transaction');
const Account = require('./Account');
const Branch = require('./Branch');
const JournalEntry = require('./JournalEntry');
const Commission = require('./Commission');
const ExchangeRate = require('./ExchangeRate');
const Remittance = require('./Remittance');
const Check = require('./Check');
const AuditLog = require('./AuditLog');
const RefreshToken = require('./RefreshToken');

// Define model associations
const defineAssociations = () => {
  // Tenant associations
  Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
  Tenant.hasMany(Account, { foreignKey: 'tenantId', as: 'accounts' });
  Tenant.hasMany(Transaction, { foreignKey: 'tenantId', as: 'transactions' });
  Tenant.hasMany(Branch, { foreignKey: 'tenantId', as: 'branches' });
  Tenant.hasMany(JournalEntry, { foreignKey: 'tenantId', as: 'journalEntries' });
  Tenant.hasMany(Commission, { foreignKey: 'tenantId', as: 'commissions' });
  Tenant.hasMany(ExchangeRate, { foreignKey: 'tenantId', as: 'exchangeRates' });
  Tenant.hasMany(Remittance, { foreignKey: 'tenantId', as: 'remittances' });
  Tenant.hasMany(Check, { foreignKey: 'tenantId', as: 'checks' });
  Tenant.hasMany(AuditLog, { foreignKey: 'tenantId', as: 'auditLogs' });
  
  // Tenant hierarchy (self-referencing)
  Tenant.hasMany(Tenant, { foreignKey: 'parentId', as: 'children' });
  Tenant.belongsTo(Tenant, { foreignKey: 'parentId', as: 'parent' });

  // User associations
  User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  User.hasMany(Account, { foreignKey: 'userId', as: 'accounts' });
  User.hasMany(Transaction, { foreignKey: 'initiatedBy', as: 'initiatedTransactions' });
  User.hasMany(Transaction, { foreignKey: 'approvedBy', as: 'approvedTransactions' });
  User.hasMany(Transaction, { foreignKey: 'processedBy', as: 'processedTransactions' });
  User.hasMany(JournalEntry, { foreignKey: 'createdBy', as: 'journalEntries' });
  User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
  User.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

  // Account associations
  Account.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  Account.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Account.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  Account.hasMany(Transaction, { foreignKey: 'fromAccountId', as: 'outgoingTransactions' });
  Account.hasMany(Transaction, { foreignKey: 'toAccountId', as: 'incomingTransactions' });

  // Transaction associations
  Transaction.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  Transaction.belongsTo(Account, { foreignKey: 'fromAccountId', as: 'fromAccount' });
  Transaction.belongsTo(Account, { foreignKey: 'toAccountId', as: 'toAccount' });
  Transaction.belongsTo(User, { foreignKey: 'initiatedBy', as: 'initiator' });
  Transaction.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  Transaction.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
  Transaction.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  Transaction.belongsTo(JournalEntry, { foreignKey: 'journalEntryId', as: 'journalEntry' });

  // Branch associations
  Branch.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  Branch.hasMany(User, { foreignKey: 'branchId', as: 'users' });
  Branch.hasMany(Account, { foreignKey: 'branchId', as: 'accounts' });
  Branch.hasMany(Transaction, { foreignKey: 'branchId', as: 'transactions' });
  Branch.belongsTo(User, { foreignKey: 'managerId', as: 'manager' });

  // Journal Entry associations
  JournalEntry.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  JournalEntry.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  JournalEntry.hasMany(Transaction, { foreignKey: 'journalEntryId', as: 'transactions' });

  // Commission associations
  Commission.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  Commission.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Commission.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

  // Exchange Rate associations
  ExchangeRate.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  ExchangeRate.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

  // Remittance associations
  Remittance.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  Remittance.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
  Remittance.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
  Remittance.belongsTo(Branch, { foreignKey: 'originBranchId', as: 'originBranch' });
  Remittance.belongsTo(Branch, { foreignKey: 'destinationBranchId', as: 'destinationBranch' });
  Remittance.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

  // Check associations
  Check.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  Check.belongsTo(User, { foreignKey: 'issuedBy', as: 'issuer' });
  Check.belongsTo(User, { foreignKey: 'receivedBy', as: 'receiver' });
  Check.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
  Check.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

  // Audit Log associations
  AuditLog.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Refresh Token associations
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
};

// Model registry
const models = {
  User,
  Tenant,
  Transaction,
  Account,
  Branch,
  JournalEntry,
  Commission,
  ExchangeRate,
  Remittance,
  Check,
  AuditLog,
  RefreshToken,
  sequelize,
  defineAssociations
};

module.exports = models;