// backend/src/models/sequelize/RefreshToken.js - JWT Refresh Token Model
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const RefreshToken = sequelizeManager.getInstance().define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_revoked'
  },
  deviceInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'device_info'
  },
  ipAddress: {
    type: DataTypes.INET,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  }
}, {
  tableName: 'refresh_tokens',
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['token']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['is_revoked']
    }
  ]
});

// Instance methods
RefreshToken.prototype.isExpired = function() {
  return new Date() > this.expiresAt;
};

RefreshToken.prototype.isValid = function() {
  return !this.isRevoked && !this.isExpired();
};

RefreshToken.prototype.revoke = async function() {
  return this.update({ isRevoked: true });
};

// Class methods
RefreshToken.findByToken = function(token) {
  return this.findOne({ where: { token } });
};

RefreshToken.revokeAllForUser = function(userId) {
  return this.update(
    { isRevoked: true },
    { where: { userId, isRevoked: false } }
  );
};

RefreshToken.cleanupExpired = function() {
  return this.destroy({
    where: {
      expiresAt: {
        [sequelizeManager.getInstance().Sequelize.Op.lt]: new Date()
      }
    }
  });
};

module.exports = RefreshToken;