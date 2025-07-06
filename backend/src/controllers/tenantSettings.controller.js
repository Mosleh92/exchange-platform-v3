const TenantSettings = require('../models/TenantSettings');
const Tenant = require('../models/Tenant');
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

// دریافت تنظیمات صرافی
exports.getTenantSettings = async (req, res) => {
  try {
    const settings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.settingsNotFound')
      });
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting tenant settings:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// بروزرسانی تنظیمات صرافی
exports.updateTenantSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.validationError'),
        errors: errors.array()
      });
    }
    
    let settings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    
    if (!settings) {
      settings = new TenantSettings({
        tenantId: req.tenant?.id || req.user.tenantId,
        createdBy: req.user.id
      });
    }
    
    const {
      branding,
      contact,
      receipt,
      exchangeRates,
      accounting,
      security,
      notifications
    } = req.body;
    
    // بروزرسانی بخش‌های مختلف
    if (branding) {
      const oldBranding = JSON.stringify(settings.branding);
      settings.branding = { ...settings.branding, ...branding };
      await settings.addToHistory('branding', oldBranding, JSON.stringify(settings.branding), req.user.id);
    }
    
    if (contact) {
      const oldContact = JSON.stringify(settings.contact);
      settings.contact = { ...settings.contact, ...contact };
      await settings.addToHistory('contact', oldContact, JSON.stringify(settings.contact), req.user.id);
    }
    
    if (receipt) {
      const oldReceipt = JSON.stringify(settings.receipt);
      settings.receipt = { ...settings.receipt, ...receipt };
      await settings.addToHistory('receipt', oldReceipt, JSON.stringify(settings.receipt), req.user.id);
    }
    
    if (exchangeRates) {
      const oldExchangeRates = JSON.stringify(settings.exchangeRates);
      settings.exchangeRates = { ...settings.exchangeRates, ...exchangeRates };
      await settings.addToHistory('exchangeRates', oldExchangeRates, JSON.stringify(settings.exchangeRates), req.user.id);
    }
    
    if (accounting) {
      const oldAccounting = JSON.stringify(settings.accounting);
      settings.accounting = { ...settings.accounting, ...accounting };
      await settings.addToHistory('accounting', oldAccounting, JSON.stringify(settings.accounting), req.user.id);
    }
    
    if (security) {
      const oldSecurity = JSON.stringify(settings.security);
      settings.security = { ...settings.security, ...security };
      await settings.addToHistory('security', oldSecurity, JSON.stringify(settings.security), req.user.id);
    }
    
    if (notifications) {
      const oldNotifications = JSON.stringify(settings.notifications);
      settings.notifications = { ...settings.notifications, ...notifications };
      await settings.addToHistory('notifications', oldNotifications, JSON.stringify(settings.notifications), req.user.id);
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'settings.updated'),
      data: settings
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// آپلود لوگو
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.noFileUploaded')
      });
    }
    
    const settings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.settingsNotFound')
      });
    }
    
    // حذف لوگوی قبلی
    if (settings.branding.logo.path) {
      try {
        await fs.unlink(settings.branding.logo.path);
      } catch (error) {
        console.error('Error deleting old logo:', error);
      }
    }
    
    // بروزرسانی اطلاعات لوگو
    settings.branding.logo = {
      path: req.file.path,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date()
    };
    
    await settings.save();
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'settings.logoUploaded'),
      data: {
        logo: settings.branding.logo
      }
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// آپلود فاویکون
exports.uploadFavicon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.noFileUploaded')
      });
    }
    
    const settings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.settingsNotFound')
      });
    }
    
    // حذف فاویکون قبلی
    if (settings.branding.favicon.path) {
      try {
        await fs.unlink(settings.branding.favicon.path);
      } catch (error) {
        console.error('Error deleting old favicon:', error);
      }
    }
    
    // بروزرسانی اطلاعات فاویکون
    settings.branding.favicon = {
      path: req.file.path,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date()
    };
    
    await settings.save();
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'settings.faviconUploaded'),
      data: {
        favicon: settings.branding.favicon
      }
    });
  } catch (error) {
    console.error('Error uploading favicon:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// مدیریت قالب‌های رسید
exports.manageReceiptTemplates = async (req, res) => {
  try {
    const { action, template } = req.body;
    
    const settings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.settingsNotFound')
      });
    }
    
    switch (action) {
      case 'add': {
        if (template.isDefault) {
          // حذف قالب پیش‌فرض قبلی
          settings.receipt.templates.forEach(t => t.isDefault = false);
        }
        settings.receipt.templates.push(template);
        break;
      }
      case 'update': {
        const templateIndex = settings.receipt.templates.findIndex(t => t.name === template.name);
        if (templateIndex === -1) {
          return res.status(404).json({
            success: false,
            message: i18n.t(req.language, 'error.templateNotFound')
          });
        }
        if (template.isDefault) {
          settings.receipt.templates.forEach(t => t.isDefault = false);
        }
        settings.receipt.templates[templateIndex] = template;
        break;
      }
      case 'delete': {
        const deleteIndex = settings.receipt.templates.findIndex(t => t.name === template.name);
        if (deleteIndex === -1) {
          return res.status(404).json({
            success: false,
            message: i18n.t(req.language, 'error.templateNotFound')
          });
        }
        settings.receipt.templates.splice(deleteIndex, 1);
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          message: i18n.t(req.language, 'error.invalidAction')
        });
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'settings.templateUpdated'),
      data: settings.receipt.templates
    });
  } catch (error) {
    console.error('Error managing receipt templates:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// تست تنظیمات ارسال
exports.testDeliverySettings = async (req, res) => {
  try {
    const { channel, testData } = req.body;
    
    const settings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.settingsNotFound')
      });
    }
    
    let result;
    
    switch (channel) {
      case 'email': {
        result = await testEmailDelivery(settings.receipt.delivery.email, testData);
        break;
      }
      case 'sms': {
        result = await testSMSDelivery(settings.receipt.delivery.sms, testData);
        break;
      }
      case 'whatsapp': {
        result = await testWhatsAppDelivery(settings.receipt.delivery.whatsapp, testData);
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          message: i18n.t(req.language, 'error.invalidChannel')
        });
    }
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'settings.testSuccessful'),
      data: result
    });
  } catch (error) {
    console.error('Error testing delivery settings:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// شروع مهاجرت داده‌ها
exports.startDataMigration = async (req, res) => {
  try {
    const { sourceSystem, connectionDetails } = req.body;
    
    const settings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.settingsNotFound')
      });
    }
    
    // بروزرسانی وضعیت مهاجرت
    settings.migration.status = 'in_progress';
    settings.migration.source = {
      system: sourceSystem,
      connection: connectionDetails
    };
    settings.migration.progress = {
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      startTime: new Date()
    };
    
    await settings.save();
    
    // شروع فرآیند مهاجرت در پس‌زمینه
    startMigrationProcess(settings.tenantId, sourceSystem, connectionDetails);
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'settings.migrationStarted'),
      data: {
        status: settings.migration.status,
        startTime: settings.migration.progress.startTime
      }
    });
  } catch (error) {
    console.error('Error starting data migration:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// دریافت وضعیت مهاجرت
exports.getMigrationStatus = async (req, res) => {
  try {
    const settings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.settingsNotFound')
      });
    }
    
    res.json({
      success: true,
      data: {
        status: settings.migration.status,
        progress: settings.migration.progress,
        logs: settings.migration.logs.slice(-50) // آخرین 50 لاگ
      }
    });
  } catch (error) {
    console.error('Error getting migration status:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// متدهای کمکی برای تست ارسال
async function testEmailDelivery(emailConfig, testData) {
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransporter({
    host: emailConfig.smtp.host,
    port: emailConfig.smtp.port,
    secure: emailConfig.smtp.secure,
    auth: {
      user: emailConfig.smtp.username,
      pass: emailConfig.smtp.password
    }
  });
  
  const mailOptions = {
    from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
    to: testData.email,
    subject: 'تست ارسال رسید',
    html: '<h1>این یک تست ارسال رسید است</h1><p>اگر این ایمیل را دریافت کرده‌اید، تنظیمات ارسال صحیح است.</p>'
  };
  
  const result = await transporter.sendMail(mailOptions);
  return { messageId: result.messageId };
}

async function testSMSDelivery(smsConfig, testData) {
  const axios = require('axios');
  
  let response;
  switch (smsConfig.provider) {
    case 'kavenegar':
      response = await axios.post('https://api.kavenegar.com/v1/sms/send.json', {
        receptor: testData.phone,
        message: 'تست ارسال رسید - تنظیمات صحیح است',
        sender: smsConfig.fromNumber
      }, {
        headers: {
          'Authorization': `Bearer ${smsConfig.apiKey}`
        }
      });
      break;
      
    default:
      throw new Error('SMS provider not supported for testing');
  }
  
  return { success: response.data.success || response.data.return === 0 };
}

async function testWhatsAppDelivery(whatsappConfig, testData) {
  const axios = require('axios');
  
  let response;
  switch (whatsappConfig.provider) {
    case 'twilio':
      response = await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${whatsappConfig.apiKey}/Messages.json`, {
        To: `whatsapp:${testData.phone}`,
        From: `whatsapp:${whatsappConfig.phoneNumber}`,
        Body: 'تست ارسال رسید - تنظیمات صحیح است'
      }, {
        auth: {
          username: whatsappConfig.apiKey,
          password: whatsappConfig.apiSecret
        }
      });
      break;
      
    default:
      throw new Error('WhatsApp provider not supported for testing');
  }
  
  return { success: !!response.data.sid };
}

// فرآیند مهاجرت در پس‌زمینه
async function startMigrationProcess(tenantId, sourceSystem, connectionDetails) {
  try {
    // اینجا کد مهاجرت واقعی پیاده‌سازی می‌شود
    // برای مثال، اتصال به دیتابیس منبع و انتقال داده‌ها
    
    console.log(`Starting migration for tenant ${tenantId} from ${sourceSystem}`);
    
    // شبیه‌سازی فرآیند مهاجرت
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // بروزرسانی وضعیت
    const settings = await TenantSettings.findOne({ tenantId });
    if (settings) {
      settings.migration.status = 'completed';
      settings.migration.progress.endTime = new Date();
      settings.migration.logs.push({
        level: 'info',
        message: 'Migration completed successfully'
      });
      await settings.save();
    }
    
  } catch (error) {
    console.error('Migration error:', error);
    
    const settings = await TenantSettings.findOne({ tenantId });
    if (settings) {
      settings.migration.status = 'failed';
      settings.migration.progress.endTime = new Date();
      settings.migration.logs.push({
        level: 'error',
        message: error.message
      });
      await settings.save();
    }
  }
}

module.exports = {
  getTenantSettings: exports.getTenantSettings,
  updateTenantSettings: exports.updateTenantSettings,
  uploadLogo: exports.uploadLogo,
  uploadFavicon: exports.uploadFavicon,
  manageReceiptTemplates: exports.manageReceiptTemplates,
  testDeliverySettings: exports.testDeliverySettings,
  startDataMigration: exports.startDataMigration,
  getMigrationStatus: exports.getMigrationStatus
}; 
