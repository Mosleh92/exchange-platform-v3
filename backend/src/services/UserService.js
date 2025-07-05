const User = require('../models/User');
const speakeasy = require('speakeasy');

const UserService = {
  /**
   * Create a new user (business logic only)
   */
  async createUser({ tenantId, userData }) {
    const user = new User({ ...userData, tenantId });
    await user.save();
    return user;
  },

  /**
   * Update an existing user
   */
  async updateUser({ userId, tenantId, updateData }) {
    const user = await User.findOneAndUpdate({ _id: userId, tenantId }, updateData, { new: true });
    if (!user) throw new Error('کاربر یافت نشد');
    return user;
  },

  /**
   * Delete a user
   */
  async deleteUser({ userId, tenantId }) {
    const user = await User.findOneAndDelete({ _id: userId, tenantId });
    if (!user) throw new Error('کاربر یافت نشد');
    return user;
  },

  /**
   * Get a user by ID
   */
  async getUserById({ userId, tenantId }) {
    const user = await User.findOne({ _id: userId, tenantId });
    if (!user) throw new Error('کاربر یافت نشد');
    return user;
  },

  /**
   * Get all users (with pagination and filters)
   */
  async getUsers({ tenantId, page = 1, limit = 10, role, status }) {
    const query = { tenantId };
    if (role) query.role = role;
    if (status) query.status = status;
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    return {
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  },

  /**
   * Assign a role to a user
   */
  async assignRole({ userId, tenantId, role }) {
    const user = await User.findOneAndUpdate({ _id: userId, tenantId }, { role }, { new: true });
    if (!user) throw new Error('کاربر یافت نشد');
    return user;
  },

  /**
   * Generate MFA secret and otpauth URL for Google Authenticator
   */
  async generateMfaSecret({ user }) {
    const secret = speakeasy.generateSecret({
      name: `ExchangePlatform (${user.email})`,
      length: 32
    });
    return {
      ascii: secret.ascii,
      hex: secret.hex,
      base32: secret.base32,
      otpauth_url: secret.otpauth_url
    };
  },

  /**
   * Enable MFA for user (after verifying code)
   */
  async enableMfa({ userId, secret }) {
    const user = await User.findByIdAndUpdate(userId, {
      mfaEnabled: true,
      mfaSecret: secret
    }, { new: true });
    if (!user) throw new Error('کاربر یافت نشد');
    return user;
  },

  /**
   * Verify MFA token (TOTP)
   */
  verifyMfaToken({ secret, token }) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // allow 1 step before/after
    });
  }
};

module.exports = UserService; 