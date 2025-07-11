const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['exchange', 'bank'],
    required: true
  },
  superAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'pending'
  },
  settings: {
    currency: {
      type: String,
      default: 'IRR'
    },
    timezone: {
      type: String,
      default: 'Asia/Tehran'
    },
    commissionRate: {
      type: Number,
      default: 0.001
    }
  },
  contactInfo: {
    email: String,
    phone: String,
    address: String,
    city: String,
    country: String
  },
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic'
  },
  maxUsers: {
    type: Number,
    default: 100
  },
  maxTransactions: {
    type: Number,
    default: 10000
  }
}, {
  timestamps: true
});

// Add indexes for performance
tenantSchema.index({ superAdminId: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ type: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);

// backend/src/models/tenants/SubTenant.js
const mongoose = require('mongoose');

const subTenantSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  branchCode: {
    type: String,
    required: true,
    unique: true
  },
  location: {
    address: String,
    city: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  }
}, {
  timestamps: true
});

subTenantSchema.index({ tenantId: 1 });
subTenantSchema.index({ branchCode: 1 });

module.exports = mongoose.model('SubTenant', subTenantSchema);

// backend/src/controllers/tenants/TenantController.js
const Tenant = require('../../models/tenants/Tenant');
const SubTenant = require('../../models/tenants/SubTenant');
const User = require('../../models/User');

class TenantController {
  // ایجاد صرافی جدید
  static async createTenant(req, res) {
    try {
      const { name, type, contactInfo, subscriptionPlan } = req.body;
      const superAdminId = req.user.id;

      // بررسی دسترسی سوپر ادمین
      const superAdmin = await User.findById(superAdminId);
      if (!superAdmin || superAdmin.role !== 'super_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'فقط سوپر ادمین می‌تواند صرافی جدید ایجاد کند' 
        });
      }

      // ایجاد صرافی
      const tenant = new Tenant({
        name,
        type,
        superAdminId,
        contactInfo,
        subscriptionPlan: subscriptionPlan || 'basic'
      });

      await tenant.save();

      // ایجاد مدیر صرافی
      const tenantAdmin = new User({
        email: contactInfo.email,
        password: 'temp123456', // موقت - باید تغییر کند
        role: 'tenant_admin',
        tenantId: tenant._id,
        profile: {
          firstName: name,
          lastName: 'Admin',
          phone: contactInfo.phone
        }
      });

      await tenantAdmin.save();

      res.status(201).json({
        success: true,
        data: {
          tenant,
          adminUser: {
            id: tenantAdmin._id,
            email: tenantAdmin.email,
            tempPassword: 'temp123456'
          }
        },
        message: 'صرافی با موفقیت ایجاد شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ایجاد صرافی',
        error: error.message
      });
    }
  }

  // دریافت لیست صرافی‌ها
  static async getTenants(req, res) {
    try {
      const { page = 1, limit = 10, status, type } = req.query;
      const query = {};

      if (status) query.status = status;
      if (type) query.type = type;

      const tenants = await Tenant.find(query)
        .populate('superAdminId', 'email profile')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Tenant.countDocuments(query);

      res.json({
        success: true,
        data: {
          tenants,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت لیست صرافی‌ها',
        error: error.message
      });
    }
  }

  // بروزرسانی وضعیت صرافی
  static async updateTenantStatus(req, res) {
    try {
      const { tenantId } = req.params;
      const { status } = req.body;

      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        { status },
        { new: true }
      );

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'صرافی یافت نشد'
        });
      }

      res.json({
        success: true,
        data: tenant,
        message: 'وضعیت صرافی بروزرسانی شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در بروزرسانی وضعیت',
        error: error.message
      });
    }
  }

  // ایجاد شعبه جدید
  static async createSubTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const { name, location, branchCode, managerId } = req.body;

      // بررسی دسترسی
      const user = await User.findById(req.user.id);
      if (user.role !== 'super_admin' && user.tenantId.toString() !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'عدم دسترسی به ایجاد شعبه'
        });
      }

      // بررسی تکراری نبودن کد شعبه
      const existingBranch = await SubTenant.findOne({ branchCode });
      if (existingBranch) {
        return res.status(400).json({
          success: false,
          message: 'کد شعبه تکراری است'
        });
      }

      const subTenant = new SubTenant({
        tenantId,
        name,
        branchCode,
        location,
        managerId
      });

      await subTenant.save();

      res.status(201).json({
        success: true,
        data: subTenant,
        message: 'شعبه جدید با موفقیت ایجاد شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ایجاد شعبه',
        error: error.message
      });
    }
  }

  // دریافت شعبه‌های یک صرافی
  static async getSubTenants(req, res) {
    try {
      const { tenantId } = req.params;
      
      const subTenants = await SubTenant.find({ tenantId })
        .populate('managerId', 'email profile')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: subTenants
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت شعبه‌ها',
        error: error.message
      });
    }
  }
}

module.exports = TenantController;

// backend/src/middleware/tenantMiddleware.js
const Tenant = require('../models/tenants/Tenant');
const User = require('../models/User');

const tenantMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('tenantId');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    // سوپر ادمین به همه جا دسترسی دارد
    if (user.role === 'super_admin') {
      req.tenant = null;
      req.user = user;
      return next();
    }

    // سایر کاربران فقط به tenant خودشان دسترسی دارند
    if (!user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'کاربر به هیچ صرافی متصل نیست'
      });
    }

    // بررسی وضعیت tenant
    if (user.tenantId.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'صرافی غیرفعال است'
      });
    }

    req.tenant = user.tenantId;
    req.user = user;
    next();

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطا در احراز هویت',
      error: error.message
    });
  }
};

module.exports = tenantMiddleware;

// backend/src/routes/tenants.js
const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/tenants/TenantController');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

// Routes برای سوپر ادمین
router.use(authMiddleware);
router.use(tenantMiddleware);

// مدیریت صرافی‌ها
router.post('/', TenantController.createTenant);
router.get('/', TenantController.getTenants);
router.patch('/:tenantId/status', TenantController.updateTenantStatus);

// مدیریت شعبه‌ها
router.post('/:tenantId/branches', TenantController.createSubTenant);
router.get('/:tenantId/branches', TenantController.getSubTenants);

module.exports = router;
