const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const mongoose = require("mongoose");

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "توکن احراز هویت ارائه نشده است",
      });
    }

    const token = authHeader.substring(7);

    // Verify token with proper secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.userId).populate("tenantId");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "کاربر یافت نشد",
      });
    }

    // Check if user is active
    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "حساب کاربری غیرفعال شده است",
      });
    }

    // Check tenant status for non-super admin users
    if (user.role !== "super_admin" && user.tenantId) {
      if (!user.tenantId || user.tenantId.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "سازمان شما غیرفعال شده است",
        });
      }
    }

    // Set user info in request
    req.user = {
      userId: user._id,
      tenantId: user.tenantId?._id,
      role: user.role,
      permissions: user.permissions,
      branchId: user.branchId,
      status: user.status,
    };
    req.userData = user;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "توکن نامعتبر است",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "توکن منقضی شده است",
      });
    }

    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در احراز هویت",
    });
  }
};

// Role-based authorization middleware
const authorize = (...rolesOrPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "احراز هویت لازم است",
      });
    }

    // Check if role is authorized
    if (rolesOrPermissions.some((role) => req.user.role === role)) {
      return next();
    }

    // Check granular permissions
    if (req.user.permissions && Array.isArray(req.user.permissions)) {
      for (const perm of rolesOrPermissions) {
        const [resource, action] = perm.split(":");
        const found = req.user.permissions.find(
          (p) => p.resource === resource && p.actions.includes(action),
        );
        if (found) return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: "شما دسترسی به این عملیات را ندارید",
    });
  };
};

// **اصلاح شده**: جداسازی کامل Tenant
const tenantIsolation = async (req, res, next) => {
  try {
    // Super admin has access to all tenants
    if (req.user.role === "super_admin") {
      return next();
    }

    // Extract tenant ID from various sources
    const tenantId =
      req.params.tenantId ||
      req.body.tenantId ||
      req.query.tenantId ||
      req.headers["x-tenant-id"];

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "شناسه صرافی ارائه نشده است",
      });
    }

    // Validate tenant ID format
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({
        success: false,
        message: "شناسه صرافی نامعتبر است",
      });
    }

    // Check if user belongs to this tenant
    if (
      !req.user.tenantId ||
      req.user.tenantId.toString() !== tenantId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "شما دسترسی به این صرافی را ندارید",
      });
    }

    // Verify tenant exists and is active
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "صرافی یافت نشد",
      });
    }

    if (tenant.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "صرافی غیرفعال است",
      });
    }

    // Add tenant context to request
    req.tenant = tenant;
    req.tenantId = tenantId;

    next();
  } catch (error) {
    console.error("Tenant isolation middleware error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در بررسی دسترسی به صرافی",
    });
  }
};

// **جدید**: Middleware برای اعمال فیلتر tenant روی queries
const applyTenantFilter = (req, res, next) => {
  if (req.user.role === "super_admin") {
    return next();
  }

  // Add tenant filter to MongoDB queries
  const originalFind = req.Model?.find;
  const originalFindOne = req.Model?.findOne;
  const originalFindById = req.Model?.findById;

  if (originalFind) {
    req.Model.find = function (query = {}) {
      if (req.user.tenantId) {
        query.tenantId = req.user.tenantId;
      }
      return originalFind.call(this, query);
    };
  }

  if (originalFindOne) {
    req.Model.findOne = function (query = {}) {
      if (req.user.tenantId) {
        query.tenantId = req.user.tenantId;
      }
      return originalFindOne.call(this, query);
    };
  }

  next();
};

module.exports = {
  auth,
  authorize,
  tenantIsolation, // اصلاح شده
  applyTenantFilter, // جدید
  // برای سازگاری با کد قدیمی
  tenantAccess: tenantIsolation,
};
