// Minimal placeholder for customer.controller.js
const VIPCustomer = require('../models/VIPCustomer');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const validator = require('validator');

module.exports = {
  getCustomers: (req, res) => {
    res.json({ customers: [] });
  },

  // Get special rates for the logged-in customer (customer portal)
  getMySpecialRates: async (req, res) => {
    try {
      const customerId = req.user._id;
      const tenantId = req.tenant?.id || req.user.tenantId;
      const vip = await VIPCustomer.findOne({ customerId, tenantId, status: 'active' });
      const specialRates = vip && vip.specialRates ? vip.specialRates.filter(r => r.isActive !== false) : [];
      res.json({
        success: true,
        data: specialRates
      });
    } catch (error) {
      console.error('Get my special rates error:', error);
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت نرخ‌های اختصاصی',
        error: error.message
      });
    }
  },

  // Change password for the logged-in customer
  changeMyPassword: async (req, res) => {
    try {
      const userId = req.user._id;
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'رمز فعلی و جدید الزامی است' });
      }
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) return res.status(400).json({ success: false, message: 'رمز فعلی اشتباه است' });
      user.password = newPassword;
      if (req.body.username) user.username = validator.escape(req.body.username);
      await user.save();
      res.json({ success: true, message: 'رمز عبور با موفقیت تغییر کرد' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطا در تغییر رمز عبور', error: error.message });
    }
  },

  // Enable or disable OTP for the logged-in customer
  setMyOTP: async (req, res) => {
    try {
      const userId = req.user._id;
      const { enable } = req.body; // true/false
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
      user.otpEnabled = !!enable;
      await user.save();
      res.json({ success: true, message: enable ? 'OTP فعال شد' : 'OTP غیرفعال شد' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطا در تغییر وضعیت OTP', error: error.message });
    }
  },

  // Get audit logs for the logged-in customer
  getMyAuditLogs: async (req, res) => {
    try {
      const userId = req.user._id;
      const logs = await AuditLog.find({ user: userId }).sort({ createdAt: -1 }).limit(100);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطا در دریافت لاگ‌ها', error: error.message });
    }
  },

  // محاسبه و نمایش مانده حساب مشتری
  getCustomerBalance: async (req, res) => {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenant?.id || req.user.tenantId;
      const Account = require('../models/Account');
      // فقط حساب‌های فعال مشتری را جمع بزن
      const accounts = await Account.find({ customerId, tenantId, status: 'active' });
      const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      res.json({
        success: true,
        customerId,
        totalBalance
      });
    } catch (error) {
      console.error('Error getting customer balance:', error);
      res.status(500).json({ success: false, message: 'خطا در دریافت مانده حساب', error: error.message });
    }
  }
}; 