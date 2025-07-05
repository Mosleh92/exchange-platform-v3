const mongoose = require('mongoose');

const tenantSettingsSchema = new mongoose.Schema({
  // شناسه مستأجر
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    unique: true
  },
  
  // اطلاعات بصری
  branding: {
    logo: {
      path: String,
      fileName: String,
      originalName: String,
      size: Number,
      uploadedAt: Date
    },
    favicon: {
      path: String,
      fileName: String,
      originalName: String,
      size: Number,
      uploadedAt: Date
    },
    colors: {
      primary: {
        type: String,
        default: '#3B82F6'
      },
      secondary: {
        type: String,
        default: '#1F2937'
      },
      accent: {
        type: String,
        default: '#10B981'
      }
    },
    fonts: {
      primary: {
        type: String,
        default: 'Vazir'
      },
      secondary: {
        type: String,
        default: 'IRANSans'
      }
    }
  },
  
  // اطلاعات تماس
  contact: {
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    phone: {
      primary: String,
      secondary: String,
      whatsapp: String
    },
    email: {
      primary: String,
      support: String,
      info: String
    },
    social: {
      website: String,
      instagram: String,
      telegram: String,
      twitter: String
    },
    workingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String }
    }
  },
  
  // تنظیمات رسید
  receipt: {
    // قالب‌های رسید
    templates: [{
      name: String,
      type: String,
      html: String,
      css: String,
      isDefault: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // تنظیمات ارسال
    delivery: {
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        smtp: {
          host: String,
          port: Number,
          secure: Boolean,
          username: String,
          password: String
        },
        fromName: String,
        fromEmail: String,
        subject: String
      },
      sms: {
        enabled: {
          type: Boolean,
          default: true
        },
        provider: {
          type: String,
          enum: ['kavenegar', 'melipayamak', 'ghasedak', 'custom']
        },
        apiKey: String,
        apiSecret: String,
        fromNumber: String,
        template: String
      },
      whatsapp: {
        enabled: {
          type: Boolean,
          default: true
        },
        provider: {
          type: String,
          enum: ['whatsapp_business', 'twilio', 'custom']
        },
        apiKey: String,
        apiSecret: String,
        phoneNumber: String,
        template: String
      }
    },
    
    // محتوای پیش‌فرض
    content: {
      header: String,
      footer: String,
      terms: String,
      disclaimer: String,
      signature: String
    }
  },
  
  // تنظیمات نرخ ارز
  exchangeRates: {
    // منبع نرخ‌ها
    source: {
      type: String,
      enum: ['manual', 'api', 'mixed'],
      default: 'manual'
    },
    // API تنظیمات
    api: {
      provider: String,
      url: String,
      apiKey: String,
      updateInterval: {
        type: Number,
        default: 3600 // 1 hour
      }
    },
    // تنظیمات دستی
    manual: {
      enabled: {
        type: Boolean,
        default: true
      },
      updateBy: {
        type: String,
        enum: ['admin', 'manager', 'staff'],
        default: 'admin'
      },
      approvalRequired: {
        type: Boolean,
        default: true
      }
    },
    // ارزهای پشتیبانی شده
    supportedCurrencies: [{
      code: String,
      name: String,
      symbol: String,
      enabled: {
        type: Boolean,
        default: true
      },
      decimalPlaces: {
        type: Number,
        default: 2
      }
    }]
  },
  
  // تنظیمات حسابداری
  accounting: {
    // سال مالی
    fiscalYear: {
      startMonth: {
        type: Number,
        default: 1
      },
      startDay: {
        type: Number,
        default: 1
      }
    },
    // ارز پایه
    baseCurrency: {
      type: String,
      default: 'IRR'
    },
    // تنظیمات مالیات
    tax: {
      enabled: {
        type: Boolean,
        default: false
      },
      rate: {
        type: Number,
        default: 0
      },
      number: String
    },
    // شماره‌گذاری خودکار
    autoNumbering: {
      enabled: {
        type: Boolean,
        default: true
      },
      prefix: String,
      suffix: String,
      startNumber: {
        type: Number,
        default: 1
      },
      padding: {
        type: Number,
        default: 6
      }
    }
  },
  
  // تنظیمات امنیت
  security: {
    // تأیید دو مرحله‌ای
    twoFactor: {
      enabled: {
        type: Boolean,
        default: true
      },
      methods: [{
        type: String,
        enum: ['sms', 'email', 'authenticator']
      }]
    },
    // محدودیت‌های ورود
    login: {
      maxAttempts: {
        type: Number,
        default: 5
      },
      lockoutDuration: {
        type: Number,
        default: 30 // minutes
      },
      sessionTimeout: {
        type: Number,
        default: 480 // 8 hours
      }
    },
    // رمزنگاری
    encryption: {
      enabled: {
        type: Boolean,
        default: true
      },
      algorithm: {
        type: String,
        default: 'AES-256'
      }
    }
  },
  
  // تنظیمات اعلان‌ها
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      types: [{
        type: String,
        enum: ['transaction', 'transfer', 'alert', 'report']
      }]
    },
    sms: {
      enabled: {
        type: Boolean,
        default: true
      },
      types: [{
        type: String,
        enum: ['transaction', 'transfer', 'alert']
      }]
    },
    push: {
      enabled: {
        type: Boolean,
        default: false
      },
      types: [{
        type: String,
        enum: ['transaction', 'transfer', 'alert']
      }]
    }
  },
  
  // تنظیمات مهاجرت
  migration: {
    // وضعیت مهاجرت
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'failed'],
      default: 'not_started'
    },
    // منبع داده
    source: {
      system: String,
      version: String,
      database: String,
      connection: {
        host: String,
        port: Number,
        username: String,
        password: String
      }
    },
    // پیشرفت مهاجرت
    progress: {
      totalRecords: Number,
      processedRecords: Number,
      failedRecords: Number,
      startTime: Date,
      endTime: Date
    },
    // گزارش‌های مهاجرت
    logs: [{
      level: String,
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // اطلاعات ثبت کننده
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // تاریخچه تغییرات
  history: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
tenantSettingsSchema.index({ tenantId: 1 }, { unique: true });

// Method to add to history
tenantSettingsSchema.methods.addToHistory = function(field, oldValue, newValue, changedBy) {
  this.history.push({
    field,
    oldValue,
    newValue,
    changedBy
  });
  
  // Keep only last 100 entries
  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }
  
  return this.save();
};

// Method to update exchange rate
tenantSettingsSchema.methods.updateExchangeRate = function(currency, rate, updatedBy) {
  const currencyIndex = this.exchangeRates.supportedCurrencies.findIndex(c => c.code === currency);
  if (currencyIndex !== -1) {
    const oldRate = this.exchangeRates.supportedCurrencies[currencyIndex].rate;
    this.exchangeRates.supportedCurrencies[currencyIndex].rate = rate;
    this.addToHistory(`exchangeRates.${currency}`, oldRate, rate, updatedBy);
  }
  return this.save();
};

module.exports = mongoose.model('TenantSettings', tenantSettingsSchema); 