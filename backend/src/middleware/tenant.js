const logger = require("../utils/logger");
const { getTenantConnection } = require("../config/database");

async function tenantAccess(req, res, next) {
  try {
    // tenantId و branchId فقط از req.user (توکن/session) گرفته می‌شود
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "شناسه سازمان الزامی است",
        code: "TENANT_ID_REQUIRED",
      });
    }

    // Check if user has access to this tenant
    if (
      !req.user.tenantAccess?.includes(tenantId) &&
      req.user.role !== "superAdmin"
    ) {
      logger.warn("Unauthorized tenant access attempt", {
        userId: req.user.userId,
        tenantId,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: "دسترسی به این سازمان مجاز نیست",
        code: "TENANT_ACCESS_DENIED",
      });
    }

    // Get tenant database connection
    const tenantDB = await getTenantConnection(tenantId);
    if (!tenantDB) {
      return res.status(404).json({
        success: false,
        message: "سازمان مورد نظر یافت نشد",
        code: "TENANT_NOT_FOUND",
      });
    }

    // Add tenant info to request
    req.tenant = {
      id: tenantId,
      branchId: branchId || null,
      db: tenantDB,
    };

    next();
  } catch (error) {
    logger.error("Tenant middleware error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در بررسی دسترسی سازمان",
      code: "TENANT_MIDDLEWARE_ERROR",
    });
  }
}

module.exports = { tenantAccess };
