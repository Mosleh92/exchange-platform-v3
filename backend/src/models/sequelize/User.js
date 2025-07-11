// backend/src/models/sequelize/User.js - Sequelize User Model
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelizeManager = require('../../config/sequelize');

const User = sequelizeManager.getInstance().define('User', {
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
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 255]
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'last_name'
  },
  phone: {
    type: DataTypes.STRING
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'tenant_admin', 'manager', 'staff', 'customer'),
    defaultValue: 'customer'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  
  // 2FA fields
  twoFaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'two_fa_enabled'
  },
  twoFaSecret: {
    type: DataTypes.STRING,
    field: 'two_fa_secret'
  },
  
  // Profile fields
  avatar: {
    type: DataTypes.STRING
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    field: 'date_of_birth'
  },
  address: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Verification fields
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },
  phoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'phone_verified'
  },
  kycStatus: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending',
    field: 'kyc_status'
  },
  
  // Activity tracking
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at'
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_attempts'
  },
  lockedUntil: {
    type: DataTypes.DATE,
    field: 'locked_until'
  },
  
  // Security fields
  passwordResetToken: {
    type: DataTypes.STRING,
    field: 'password_reset_token'
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    field: 'password_reset_expires'
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    field: 'email_verification_token'
  },
  
  // Preferences
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      theme: 'light'
    }
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'users',
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['tenant_id', 'email']
    },
    {
      fields: ['tenant_id', 'role']
    },
    {
      fields: ['status']
    },
    {
      fields: ['email_verified']
    },
    {
      fields: ['kyc_status']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

User.prototype.isLocked = function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

User.prototype.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.update({
      loginAttempts: 1,
      lockedUntil: null
    });
  }
  
  const updates = { loginAttempts: this.loginAttempts + 1 };
  
  // If we're at max attempts and not locked, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.lockedUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  }
  
  return this.update(updates);
};

User.prototype.resetLoginAttempts = async function() {
  return this.update({
    loginAttempts: 0,
    lockedUntil: null
  });
};

// Class methods
User.findByEmail = function(email, tenantId) {
  return this.findOne({
    where: {
      email: email.toLowerCase(),
      tenantId: tenantId
    }
  });
};

User.findByRole = function(role, tenantId) {
  return this.findAll({
    where: {
      role: role,
      tenantId: tenantId,
      status: 'active'
    }
  });
};

module.exports = User;