const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Enhanced JWT verification with tenant context
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Validate required fields in JWT
    if (!req.user.tenantId && req.user.role !== "SUPER_ADMIN") {
      return res
        .status(403)
        .json({ error: "Invalid token: Missing tenant context" });
    }

    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token" });
  }
};

// Automatic tenant scoping middleware
const tenantIsolation = (req, res, next) => {
  if (req.user.role === "SUPER_ADMIN") {
    return next(); // Super admin bypasses tenant isolation
  }

  // Store original mongoose methods
  const originalFind = mongoose.Model.find;
  const originalFindOne = mongoose.Model.findOne;
  const originalFindOneAndUpdate = mongoose.Model.findOneAndUpdate;
  const originalDeleteOne = mongoose.Model.deleteOne;

  // Override mongoose methods to auto-inject tenantId
  mongoose.Model.find = function (conditions = {}) {
    if (this.schema.paths.tenantId) {
      conditions.tenantId = req.user.tenantId;
    }
    return originalFind.call(this, conditions);
  };

  mongoose.Model.findOne = function (conditions = {}) {
    if (this.schema.paths.tenantId) {
      conditions.tenantId = req.user.tenantId;
    }
    return originalFindOne.call(this, conditions);
  };

  mongoose.Model.findOneAndUpdate = function (
    conditions = {},
    update,
    options,
  ) {
    if (this.schema.paths.tenantId) {
      conditions.tenantId = req.user.tenantId;
    }
    return originalFindOneAndUpdate.call(this, conditions, update, options);
  };

  mongoose.Model.deleteOne = function (conditions = {}) {
    if (this.schema.paths.tenantId) {
      conditions.tenantId = req.user.tenantId;
    }
    return originalDeleteOne.call(this, conditions);
  };

  // Restore original methods after request
  res.on("finish", () => {
    mongoose.Model.find = originalFind;
    mongoose.Model.findOne = originalFindOne;
    mongoose.Model.findOneAndUpdate = originalFindOneAndUpdate;
    mongoose.Model.deleteOne = originalDeleteOne;
  });

  next();
};

// Role-based access control
const rbac = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: allowedRoles,
        current: req.user.role,
      });
    }

    // Additional branch-level check for STAFF
    if (req.user.role === "STAFF" && req.params.branchId) {
      if (req.params.branchId !== req.user.branchId) {
        return res.status(403).json({
          error: "Access denied: Different branch",
        });
      }
    }

    next();
  };
};

// Branch isolation for staff
const branchIsolation = (req, res, next) => {
  if (req.user.role === "STAFF") {
    req.branchFilter = { branchId: req.user.branchId };
  } else {
    req.branchFilter = {};
  }
  next();
};

module.exports = {
  verifyToken,
  tenantIsolation,
  rbac,
  branchIsolation,
};
