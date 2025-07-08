/**
 * Query Enforcement Middleware
 * تضمین استفاده از tenant_id در تمام Queryهای دیتابیس
 */

const logger = require("../utils/logger");

// Models that require tenant isolation
const TENANT_MODELS = [
  "Transaction",
  "Customer",
  "User",
  "Payment",
  "Remittance",
  "P2POrder",
  "Account",
  "BankAccount",
  "Invoice",
  "Receipt",
  "Document",
  "AuditLog",
  "Notification",
  "Subscription",
  "SalesPlan",
  "Plan",
  "TenantSettings",
  "ExchangeRate",
  "CryptoOrder",
  "CryptoTransaction",
  "CurrencyTransaction",
  "InterBranchTransfer",
  "Debt",
  "Discrepancy",
  "JournalEntry",
];

// Methods that should always include tenant filtering
const FILTERED_METHODS = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "update",
  "updateMany",
  "deleteOne",
  "deleteMany",
];

class QueryEnforcementMiddleware {
  static enforceTenantIsolation() {
    return (req, res, next) => {
      // Store original methods
      const originalMethods = {};

      TENANT_MODELS.forEach((modelName) => {
        const Model = require(`../models/${modelName}`);

        FILTERED_METHODS.forEach((method) => {
          if (Model[method]) {
            // Store original method
            originalMethods[`${modelName}_${method}`] = Model[method];

            // Override method to enforce tenant filtering
            Model[method] = function (...args) {
              const tenantId = req.user?.tenantId || req.tenant?.id;

              if (!tenantId) {
                logger.error("Tenant ID missing in query enforcement", {
                  model: modelName,
                  method,
                  userId: req.user?.userId,
                  ip: req.ip,
                });
                throw new Error(
                  "Tenant ID is required for database operations",
                );
              }

              // For find and findOne methods
              if (method === "find" || method === "findOne") {
                const query = args[0] || {};

                // Ensure tenant_id is included in query
                if (!query.tenant_id && !query.tenantId) {
                  query.tenant_id = tenantId;
                  args[0] = query;
                }
              }

              // For update methods
              if (method === "update" || method === "updateMany") {
                const filter = args[0] || {};

                // Ensure tenant_id is included in filter
                if (!filter.tenant_id && !filter.tenantId) {
                  filter.tenant_id = tenantId;
                  args[0] = filter;
                }
              }

              // For delete methods
              if (method === "deleteOne" || method === "deleteMany") {
                const filter = args[0] || {};

                // Ensure tenant_id is included in filter
                if (!filter.tenant_id && !filter.tenantId) {
                  filter.tenant_id = tenantId;
                  args[0] = filter;
                }
              }

              // For findOneAndUpdate and findOneAndDelete
              if (
                method === "findOneAndUpdate" ||
                method === "findOneAndDelete"
              ) {
                const filter = args[0] || {};

                // Ensure tenant_id is included in filter
                if (!filter.tenant_id && !filter.tenantId) {
                  filter.tenant_id = tenantId;
                  args[0] = filter;
                }
              }

              // Log the enforced query for audit
              logger.info("Query enforcement applied", {
                model: modelName,
                method,
                tenantId,
                userId: req.user?.userId,
                query: args[0],
              });

              // Call original method with enforced arguments
              return originalMethods[`${modelName}_${method}`].apply(
                this,
                args,
              );
            };
          }
        });
      });

      // Store original methods in request for cleanup
      req._originalMethods = originalMethods;

      next();
    };
  }

  static cleanup(req, res, next) {
    // Restore original methods after request
    if (req._originalMethods) {
      TENANT_MODELS.forEach((modelName) => {
        const Model = require(`../models/${modelName}`);

        FILTERED_METHODS.forEach((method) => {
          const key = `${modelName}_${method}`;
          if (req._originalMethods[key]) {
            Model[method] = req._originalMethods[key];
          }
        });
      });
    }

    next();
  }

  static validateTenantAccess(req, res, next) {
    const tenantId = req.user?.tenantId || req.tenant?.id;

    if (!tenantId) {
      logger.error("Tenant access validation failed", {
        userId: req.user?.userId,
        ip: req.ip,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        message: "دسترسی به سازمان الزامی است",
        code: "TENANT_ACCESS_REQUIRED",
      });
    }

    // Check if user has access to this tenant
    if (
      req.user?.tenantAccess &&
      !req.user.tenantAccess.includes(tenantId) &&
      req.user.role !== "superAdmin"
    ) {
      logger.warn("Unauthorized tenant access attempt", {
        userId: req.user.userId,
        tenantId,
        ip: req.ip,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        message: "دسترسی به این سازمان مجاز نیست",
        code: "TENANT_ACCESS_DENIED",
      });
    }

    next();
  }
}

module.exports = QueryEnforcementMiddleware;
