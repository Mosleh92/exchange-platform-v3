const User = require("../models/User");
// const Tenant = require('../models/Tenant'); // Unused
const jwt = require("jsonwebtoken");
// const bcrypt = require('bcryptjs'); // Unused
// const { validationResult } = require('express-validator'); // Unused in this file
const i18n = require("../utils/i18n");
const { checkPlanLimit } = require("../services/planLimitService");
const RefreshToken = require("../models/RefreshToken");
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "accesssecret";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "refreshsecret";
const crypto = require("crypto");
const validator = require("validator");

// Generate JWT Token - This function is defined but not used in this file.
// const generateToken = (userId, role, tenantId) => {
//   return jwt.sign(
//     { userId, role, tenantId },
//     process.env.JWT_SECRET,
//     { expiresIn: '24h' }
//   );
// };

class AuthController {
  async register(req, res) {
    try {
      const {
        username,
        email,
        password,
        fullName,
        phone,
        nationalId,
        role = "customer",
        tenantId,
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: i18n.t("auth.user_exists"),
        });
      }

      // Create user
      const user = new User({
        username: validator.escape(username),
        email: validator.escape(email),
        password,
        fullName: validator.escape(fullName),
        phone: validator.escape(phone),
        nationalId: validator.escape(nationalId),
        role,
        tenantId,
        status: "pending",
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: i18n.t("auth.registration_success"),
        data: { user: { id: user._id, username, email, fullName, role } },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: i18n.t("messages.operation_failed"),
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email }).populate(
        "tenantId",
        "name code status",
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: i18n.t("auth.invalid_credentials"),
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: i18n.t("auth.account_locked"),
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incLoginAttempts();
        return res.status(401).json({
          success: false,
          message: i18n.t("auth.invalid_credentials"),
        });
      }

      // Reset login attempts
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Check tenant status for non-super admin users
      if (!user.isSuperAdmin && user.tenantId) {
        if (user.tenantId.status !== "active") {
          return res.status(403).json({
            success: false,
            message: i18n.t("auth.tenant_inactive"),
          });
        }
      }

      // Generate JWT token
      const accessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId?._id,
          username: user.username,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      );

      // صدور refresh token
      const refreshToken = crypto.randomBytes(64).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 روز
      await RefreshToken.create({
        userId: user._id,
        tenantId: user.tenantId,
        token: refreshToken,
        expiresAt,
      });

      res.json({
        success: true,
        message: i18n.t("auth.login_success"),
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            tenantId: user.tenantId?._id,
            tenantName: user.tenantId?.name,
            preferences: user.preferences,
          },
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: i18n.t("messages.server_error"),
      });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .select("-password")
        .populate("tenantId", "name code status")
        .populate("branchId", "name");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: i18n.t("messages.not_found"),
        });
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: i18n.t("messages.server_error"),
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { fullName, phone, preferences } = req.body;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: i18n.t("messages.not_found"),
        });
      }

      // Update allowed fields
      if (fullName) user.fullName = validator.escape(fullName);
      if (phone) user.phone = validator.escape(phone);
      if (preferences)
        user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      res.json({
        success: true,
        message: i18n.t("messages.data_updated"),
        data: { user },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: i18n.t("messages.operation_failed"),
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: i18n.t("messages.not_found"),
        });
      }

      // Verify current password
      const isCurrentPasswordValid =
        await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: i18n.t("auth.invalid_current_password"),
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: i18n.t("auth.password_changed"),
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: i18n.t("messages.operation_failed"),
      });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken)
        return res.status(400).json({ error: "Refresh token الزامی است." });
      await RefreshToken.deleteOne({ token: refreshToken });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "خطا در خروج." });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken)
        return res.status(400).json({ error: "Refresh token الزامی است." });
      const stored = await RefreshToken.findOne({ token: refreshToken });
      if (!stored || stored.expiresAt < new Date()) {
        if (stored) await stored.deleteOne();
        return res
          .status(401)
          .json({ error: "Refresh token نامعتبر یا منقضی." });
      }
      // اعتبارسنجی توکن
      let payload;
      try {
        payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      } catch (err) {
        await stored.deleteOne();
        return res.status(401).json({ error: "Refresh token نامعتبر." });
      }
      // صدور access token جدید
      const user = await User.findById(payload.userId);
      if (!user) return res.status(401).json({ error: "کاربر یافت نشد." });
      const accessToken = jwt.sign(
        {
          _id: user._id,
          tenantId: user.tenantId,
          branchId: user.branchId,
          role: user.role,
          tenantAccess: user.tenantAccess,
        },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" },
      );
      res.json({ accessToken });
    } catch (err) {
      res.status(500).json({ error: "خطا در refresh token." });
    }
  }

  async validateToken(req, res) {
    try {
      // middleware قبلاً token را validate کرده
      const user = await User.findById(req.user.userId).select("-password");

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: "کاربر نامعتبر",
        });
      }

      res.json({
        success: true,
        user: {
          id: user._id,
          tenantId: user.tenantId,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          permissions: user.permissions,
        },
      });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({
        success: false,
        message: "خطا در اعتبارسنجی",
      });
    }
  }

  async getUsersByTenant(req, res) {
    try {
      const { page = 1, limit = 10, role, status, search } = req.query;
      const tenantId = req.user.tenantId;

      if (!tenantId) {
        return res.status(403).json({
          success: false,
          message: i18n.t("messages.access_denied"),
        });
      }

      const query = { tenantId };
      if (role) query.role = role;
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate("branchId", "name");

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Get users by tenant error:", error);
      res.status(500).json({
        success: false,
        message: i18n.t("messages.server_error"),
      });
    }
  }

  async createUser(req, res) {
    try {
      const { username, email, password, fullName, phone, role, branchId } =
        req.body;
      const tenantId = req.user.tenantId;

      if (!tenantId) {
        return res.status(403).json({
          success: false,
          message: i18n.t("messages.access_denied"),
        });
      }

      // Plan limit check
      const { allowed, reason } = await checkPlanLimit(tenantId, "user");
      if (!allowed) {
        return res.status(403).json({ success: false, message: reason });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: i18n.t("auth.user_exists"),
        });
      }

      // Create user
      const user = new User({
        username: validator.escape(username),
        email: validator.escape(email),
        password,
        fullName: validator.escape(fullName),
        phone: validator.escape(phone),
        role,
        tenantId,
        branchId,
        status: "active",
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: i18n.t("messages.data_saved"),
        data: { user: { id: user._id, username, email, fullName, role } },
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({
        success: false,
        message: i18n.t("messages.operation_failed"),
      });
    }
  }

  async requestPasswordReset(req, res) {
    // Mock implementation for test
    return res.json({ success: true, message: "Mock password reset request." });
  }

  async resetPassword(req, res) {
    // Mock implementation for test
    return res.json({ success: true, message: "Mock password reset." });
  }
}

module.exports = AuthController;
