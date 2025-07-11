// src/models/postgresql/User.js
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Tenant relationship (required for multi-tenancy)
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Tenants',
        key: 'id'
      },
      field: 'tenant_id'
    },
    
    // Basic user information
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },
    
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    
    phone: {
      type: DataTypes.STRING(20),
      validate: {
        len: [0, 20]
      }
    },
    
    // Role and permissions
    role: {
      type: DataTypes.ENUM('super_admin', 'tenant_admin', 'branch_manager', 'staff', 'customer'),
      defaultValue: 'customer',
      allowNull: false
    },
    
    status: {
      type: DataTypes.ENUM('pending', 'active', 'suspended', 'locked', 'deleted'),
      defaultValue: 'pending'
    },
    
    // Branch assignment for hierarchical organization
    branchId: {
      type: DataTypes.UUID,
      field: 'branch_id',
      references: {
        model: 'Tenants',
        key: 'id'
      }
    },
    
    // KYC (Know Your Customer) information
    kycStatus: {
      type: DataTypes.ENUM('none', 'pending', 'under_review', 'approved', 'rejected'),
      defaultValue: 'none',
      field: 'kyc_status'
    },
    
    kycData: {
      type: DataTypes.JSONB,
      field: 'kyc_data',
      defaultValue: {
        documents: [],
        verificationLevel: 'none',
        rejectionReasons: [],
        approvedAt: null,
        approvedBy: null
      }
    },
    
    // Two-Factor Authentication
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'two_factor_enabled'
    },
    
    twoFactorSecret: {
      type: DataTypes.STRING(255),
      field: 'two_factor_secret'
    },
    
    twoFactorBackupCodes: {
      type: DataTypes.JSONB,
      field: 'two_factor_backup_codes',
      defaultValue: []
    },
    
    twoFactorLastUsed: {
      type: DataTypes.DATE,
      field: 'two_factor_last_used'
    },
    
    // Security and access control
    lastLogin: {
      type: DataTypes.DATE,
      field: 'last_login'
    },
    
    lastLoginIp: {
      type: DataTypes.INET,
      field: 'last_login_ip'
    },
    
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'login_attempts'
    },
    
    lockoutUntil: {
      type: DataTypes.DATE,
      field: 'lockout_until'
    },
    
    // IP whitelist for enhanced security
    ipWhitelist: {
      type: DataTypes.JSONB,
      field: 'ip_whitelist',
      defaultValue: []
    },
    
    // Session management
    activeSessions: {
      type: DataTypes.JSONB,
      field: 'active_sessions',
      defaultValue: []
    },
    
    // Password reset
    passwordResetToken: {
      type: DataTypes.STRING(255),
      field: 'password_reset_token'
    },
    
    passwordResetExpires: {
      type: DataTypes.DATE,
      field: 'password_reset_expires'
    },
    
    // Email verification
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      field: 'email_verification_token'
    },
    
    emailVerificationExpires: {
      type: DataTypes.DATE,
      field: 'email_verification_expires'
    },
    
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'email_verified'
    },
    
    // Profile information
    avatar: {
      type: DataTypes.TEXT // URL to avatar image
    },
    
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      field: 'date_of_birth'
    },
    
    // Address information
    address: {
      type: DataTypes.JSONB,
      defaultValue: {},
      validate: {
        isValidAddress(value) {
          if (value && typeof value === 'object') {
            const allowedKeys = ['street', 'city', 'state', 'country', 'zipCode'];
            const keys = Object.keys(value);
            if (!keys.every(key => allowedKeys.includes(key))) {
              throw new Error('Invalid address format');
            }
          }
        }
      }
    },
    
    // Preferences and settings
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        security: {
          requireTwoFactor: false,
          sessionTimeout: 3600
        }
      }
    },
    
    // API access
    apiKeys: {
      type: DataTypes.JSONB,
      field: 'api_keys',
      defaultValue: []
    },
    
    // Compliance and audit
    complianceFlags: {
      type: DataTypes.JSONB,
      field: 'compliance_flags',
      defaultValue: {
        pepCheck: false,
        sanctionCheck: false,
        riskScore: 'low',
        lastChecked: null
      }
    },
    
    // Activity tracking
    lastActivity: {
      type: DataTypes.DATE,
      field: 'last_activity'
    },
    
    // Audit fields
    createdBy: {
      type: DataTypes.UUID,
      field: 'created_by'
    },
    
    updatedBy: {
      type: DataTypes.UUID,
      field: 'updated_by'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    
    // Default scope excludes sensitive fields
    defaultScope: {
      attributes: {
        exclude: ['passwordHash', 'twoFactorSecret', 'twoFactorBackupCodes', 
                 'passwordResetToken', 'emailVerificationToken']
      }
    },
    
    // Named scopes for specific use cases
    scopes: {
      withPassword: {
        attributes: {}
      },
      
      withTwoFactor: {
        attributes: {
          include: ['twoFactorSecret', 'twoFactorBackupCodes']
        }
      },
      
      active: {
        where: { status: 'active' }
      },
      
      byRole: (role) => ({
        where: { role }
      }),
      
      byTenant: (tenantId) => ({
        where: { tenantId }
      }),
      
      needsKyc: {
        where: { kycStatus: ['none', 'pending', 'rejected'] }
      }
    },
    
    indexes: [
      // Unique constraints
      { fields: ['email'], unique: true },
      
      // Performance indexes
      { fields: ['tenant_id'] },
      { fields: ['role'] },
      { fields: ['status'] },
      { fields: ['kyc_status'] },
      { fields: ['email_verified'] },
      { fields: ['two_factor_enabled'] },
      { fields: ['last_login'] },
      { fields: ['created_at'] },
      
      // Composite indexes for common queries
      { fields: ['tenant_id', 'role'] },
      { fields: ['tenant_id', 'status'] },
      { fields: ['role', 'status'] },
      { fields: ['email', 'tenant_id'] },
      
      // Partial indexes for performance
      {
        fields: ['lockout_until'],
        where: { lockout_until: { [sequelize.Sequelize.Op.ne]: null } },
        name: 'idx_users_locked_accounts'
      },
      {
        fields: ['last_activity'],
        where: { status: 'active' },
        name: 'idx_users_active_last_activity'
      }
    ],
    
    // Model hooks for business logic
    hooks: {
      beforeCreate: async (user) => {
        // Hash password
        if (user.passwordHash) {
          const salt = await bcrypt.genSalt(12);
          user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        }
        
        // Generate email verification token
        user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      },
      
      beforeUpdate: async (user) => {
        // Hash password if changed
        if (user.changed('passwordHash')) {
          const salt = await bcrypt.genSalt(12);
          user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        }
        
        user.updatedAt = new Date();
      },
      
      afterCreate: async (user) => {
        // Set up default preferences based on tenant settings
        // This could trigger email verification, welcome emails, etc.
      }
    }
  });
  
  // Instance methods
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  };
  
  User.prototype.generateTwoFactorSecret = function() {
    const secret = speakeasy.generateSecret({
      name: `Exchange Platform (${this.email})`,
      issuer: process.env.TWO_FACTOR_ISSUER || 'Exchange Platform Enterprise'
    });
    
    this.twoFactorSecret = secret.base32;
    return secret;
  };
  
  User.prototype.verifyTwoFactorToken = function(token) {
    if (!this.twoFactorSecret) {
      return false;
    }
    
    return speakeasy.totp.verify({
      secret: this.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time periods of drift
    });
  };
  
  User.prototype.generateBackupCodes = function() {
    const codes = [];
    for (let i = 0; i < 8; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    this.twoFactorBackupCodes = codes.map(code => ({ code, used: false }));
    return codes;
  };
  
  User.prototype.useBackupCode = async function(code) {
    const backupCodes = this.twoFactorBackupCodes || [];
    const backupCode = backupCodes.find(bc => bc.code === code.toUpperCase() && !bc.used);
    
    if (backupCode) {
      backupCode.used = true;
      backupCode.usedAt = new Date();
      await this.update({ twoFactorBackupCodes: backupCodes });
      return true;
    }
    
    return false;
  };
  
  User.prototype.incrementLoginAttempts = async function() {
    const updates = { loginAttempts: this.loginAttempts + 1 };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5) {
      updates.lockoutUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }
    
    return await this.update(updates);
  };
  
  User.prototype.resetLoginAttempts = async function() {
    return await this.update({
      loginAttempts: 0,
      lockoutUntil: null
    });
  };
  
  User.prototype.isLocked = function() {
    return !!(this.lockoutUntil && this.lockoutUntil > new Date());
  };
  
  User.prototype.hasPermission = function(permission) {
    const rolePermissions = {
      super_admin: ['*'],
      tenant_admin: ['tenant.*', 'user.*', 'transaction.*', 'report.*', 'branch.*'],
      branch_manager: ['branch.*', 'user.read', 'user.create', 'transaction.*', 'report.read'],
      staff: ['user.read', 'transaction.read', 'transaction.create', 'customer.*'],
      customer: ['profile.*', 'transaction.own', 'wallet.own']
    };
    
    const permissions = rolePermissions[this.role] || [];
    return permissions.includes('*') || 
           permissions.includes(permission) || 
           permissions.some(p => p.endsWith('.*') && permission.startsWith(p.slice(0, -1)));
  };
  
  User.prototype.generateApiKey = function() {
    return {
      key: crypto.randomBytes(32).toString('hex'),
      secret: crypto.randomBytes(64).toString('hex'),
      createdAt: new Date()
    };
  };
  
  User.prototype.addActiveSession = async function(sessionData) {
    const sessions = this.activeSessions || [];
    sessions.push({
      ...sessionData,
      createdAt: new Date()
    });
    
    // Keep only last 5 sessions
    if (sessions.length > 5) {
      sessions.splice(0, sessions.length - 5);
    }
    
    return await this.update({ activeSessions: sessions });
  };
  
  User.prototype.removeActiveSession = async function(sessionId) {
    const sessions = (this.activeSessions || []).filter(s => s.id !== sessionId);
    return await this.update({ activeSessions: sessions });
  };
  
  // Class methods
  User.findByEmailAndTenant = async function(email, tenantId) {
    return await User.findOne({
      where: { email, tenantId },
      include: [{ model: sequelize.models.Tenant, as: 'tenant' }]
    });
  };
  
  User.findActiveByEmail = async function(email) {
    return await User.findOne({
      where: { email, status: 'active' }
    });
  };
  
  // Model associations
  User.associate = (models) => {
    // User belongs to tenant
    User.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });
    
    // User belongs to branch (optional)
    User.belongsTo(models.Tenant, {
      foreignKey: 'branchId',
      as: 'branch'
    });
    
    // User has many account balances
    User.hasMany(models.AccountBalance, {
      foreignKey: 'userId',
      as: 'accountBalances'
    });
    
    // User has many transactions
    User.hasMany(models.Transaction, {
      foreignKey: 'userId',
      as: 'transactions'
    });
    
    // User created by another user
    User.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    // User updated by another user
    User.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };
  
  return User;
};