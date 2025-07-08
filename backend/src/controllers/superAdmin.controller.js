const Tenant = require("../models/Tenant");
const User = require("../models/User");
const i18n = require("../utils/i18n");
const Plan = require("../models/Plan");
const TenantPlan = require("../models/TenantPlan");

// Get all tenants
exports.getAllTenants = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { "admin.email": { $regex: search, $options: "i" } },
      ];
    }

    const tenants = await Tenant.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("metadata.createdBy", "fullName email")
      .populate("metadata.approvedBy", "fullName email");

    const total = await Tenant.countDocuments(query);

    res.json({
      success: true,
      data: {
        tenants,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Get all tenants error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.server_error"),
    });
  }
};

// Get tenant by ID
exports.getTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await Tenant.findOne({ tenantId })
      .populate("metadata.createdBy", "fullName email")
      .populate("metadata.approvedBy", "fullName email");

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: i18n.t("messages.not_found"),
      });
    }

    res.json({
      success: true,
      data: { tenant },
    });
  } catch (error) {
    console.error("Get tenant error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.server_error"),
    });
  }
};

// Create new tenant
exports.createTenant = async (req, res) => {
  try {
    const { name, type, subscription, contact, settings, branding, admin } =
      req.body;

    const userId = req.user.userId;

    // Generate tenant ID and code
    const tenantId = Tenant.generateTenantId();
    const code = Tenant.generateTenantCode(name);

    // Create tenant
    const tenant = new Tenant({
      tenantId,
      name,
      code,
      type,
      subscription: {
        ...subscription,
        startDate: new Date(),
        endDate: new Date(
          Date.now() + (subscription.months || 12) * 30 * 24 * 60 * 60 * 1000,
        ),
      },
      contact,
      settings,
      branding,
      admin,
      metadata: {
        createdBy: userId,
      },
    });

    await tenant.save();

    // Create tenant admin user
    const adminUser = await User.createTenantAdmin(
      {
        username: admin.username,
        email: admin.email,
        password: admin.password || "changeme123",
        fullName: admin.fullName,
        phone: admin.phone,
      },
      tenant._id,
    );

    res.status(201).json({
      success: true,
      message: i18n.t("super_admin.tenant_created"),
      data: {
        tenant,
        admin: {
          username: adminUser.username,
          email: adminUser.email,
          password: admin.password || "changeme123",
        },
      },
    });
  } catch (error) {
    console.error("Create tenant error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.operation_failed"),
    });
  }
};

// Update tenant
exports.updateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const updateData = req.body;

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: i18n.t("messages.not_found"),
      });
    }

    // Update tenant
    Object.assign(tenant, updateData);
    await tenant.save();

    res.json({
      success: true,
      message: i18n.t("super_admin.tenant_updated"),
      data: { tenant },
    });
  } catch (error) {
    console.error("Update tenant error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.operation_failed"),
    });
  }
};

// Activate tenant
exports.activateTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user.userId;

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: i18n.t("messages.not_found"),
      });
    }

    await tenant.activate(userId);

    res.json({
      success: true,
      message: i18n.t("super_admin.tenant_activated"),
      data: { tenant },
    });
  } catch (error) {
    console.error("Activate tenant error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.operation_failed"),
    });
  }
};

// Suspend tenant
exports.suspendTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: i18n.t("messages.not_found"),
      });
    }

    await tenant.suspend(reason);

    res.json({
      success: true,
      message: i18n.t("super_admin.tenant_suspended"),
      data: { tenant },
    });
  } catch (error) {
    console.error("Suspend tenant error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.operation_failed"),
    });
  }
};

// Extend subscription
exports.extendSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { months, plan } = req.body;

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: i18n.t("messages.not_found"),
      });
    }

    await tenant.extendSubscription(months, plan);

    res.json({
      success: true,
      message: i18n.t("super_admin.subscription_extended"),
      data: { tenant },
    });
  } catch (error) {
    console.error("Extend subscription error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.operation_failed"),
    });
  }
};

// Reset tenant admin password
exports.resetTenantAdminPassword = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { newPassword } = req.body;

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: i18n.t("messages.not_found"),
      });
    }

    const adminUser = await User.findOne({
      tenantId: tenant._id,
      role: "tenant_admin",
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: i18n.t("messages.not_found"),
      });
    }

    adminUser.password = newPassword;
    await adminUser.save();

    res.json({
      success: true,
      message: i18n.t("super_admin.password_reset"),
      data: {
        username: adminUser.username,
        email: adminUser.email,
        newPassword,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.operation_failed"),
    });
  }
};

// Get tenant statistics
exports.getTenantStats = async (req, res) => {
  try {
    const stats = await Tenant.getTenantStats();

    res.json({
      success: true,
      data: { stats: stats[0] || {} },
    });
  } catch (error) {
    console.error("Get tenant stats error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.server_error"),
    });
  }
};

// Get expiring tenants
exports.getExpiringTenants = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const tenants = await Tenant.getExpiringTenants(days);

    res.json({
      success: true,
      data: { tenants },
    });
  } catch (error) {
    console.error("Get expiring tenants error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.server_error"),
    });
  }
};

// Delete tenant
exports.deleteTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: i18n.t("messages.not_found"),
      });
    }

    // Delete all users associated with this tenant
    await User.deleteMany({ tenantId: tenant._id });

    // Delete the tenant
    await tenant.remove();

    res.json({
      success: true,
      message: i18n.t("super_admin.tenant_deleted"),
    });
  } catch (error) {
    console.error("Delete tenant error:", error);
    res.status(500).json({
      success: false,
      message: i18n.t("messages.operation_failed"),
    });
  }
};

// تخصیص یا تغییر پلن به tenant
exports.assignTenantPlan = async (req, res) => {
  try {
    const { tenantId, planId, durationDays } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan)
      return res.status(404).json({ success: false, message: "پلن یافت نشد" });
    let tenantPlan = await TenantPlan.findOne({ tenantId, status: "active" });
    if (tenantPlan) {
      tenantPlan.planId = planId;
      tenantPlan.startDate = new Date();
      tenantPlan.endDate = new Date(
        Date.now() + (durationDays || plan.durationDays) * 24 * 60 * 60 * 1000,
      );
      tenantPlan.status = "active";
    } else {
      tenantPlan = new TenantPlan({
        tenantId,
        planId,
        startDate: new Date(),
        endDate: new Date(
          Date.now() +
            (durationDays || plan.durationDays) * 24 * 60 * 60 * 1000,
        ),
        status: "active",
      });
    }
    await tenantPlan.save();
    res.json({ success: true, tenantPlan });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در تخصیص پلن",
        error: err.message,
      });
  }
};

// تعلیق پلن tenant
exports.suspendTenantPlan = async (req, res) => {
  try {
    const { tenantId } = req.body;
    const tenantPlan = await TenantPlan.findOne({ tenantId, status: "active" });
    if (!tenantPlan)
      return res
        .status(404)
        .json({ success: false, message: "پلن فعال یافت نشد" });
    tenantPlan.status = "suspended";
    await tenantPlan.save();
    res.json({ success: true, tenantPlan });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در تعلیق پلن",
        error: err.message,
      });
  }
};

// انقضای پلن tenant
exports.expireTenantPlan = async (req, res) => {
  try {
    const { tenantId } = req.body;
    const tenantPlan = await TenantPlan.findOne({ tenantId, status: "active" });
    if (!tenantPlan)
      return res
        .status(404)
        .json({ success: false, message: "پلن فعال یافت نشد" });
    tenantPlan.status = "expired";
    tenantPlan.endDate = new Date();
    await tenantPlan.save();
    res.json({ success: true, tenantPlan });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در انقضای پلن",
        error: err.message,
      });
  }
};

module.exports = exports;
