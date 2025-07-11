const mongoose = require('mongoose');

const brandConfigSchema = new mongoose.Schema({
  // Brand Identity
  brandId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  brandName: {
    type: String,
    required: true
  },
  brandSlug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },

  // Tenant Association
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // Brand Status
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_SETUP'],
    default: 'PENDING_SETUP',
    index: true
  },

  // Domain Configuration
  domains: {
    primary: {
      domain: { type: String, required: true },
      isSSLEnabled: { type: Boolean, default: true },
      sslCertificate: {
        provider: String,
        expiryDate: Date,
        autoRenewal: { type: Boolean, default: true }
      }
    },
    aliases: [{
      domain: String,
      redirectToPrimary: { type: Boolean, default: true }
    }],
    subdomain: {
      prefix: String, // e.g., 'brand1' for brand1.exchangeplatform.com
      enabled: { type: Boolean, default: true }
    }
  },

  // Visual Branding
  branding: {
    // Logos
    logos: {
      primary: {
        light: String, // URL to light theme logo
        dark: String,  // URL to dark theme logo
        favicon: String
      },
      secondary: {
        light: String,
        dark: String
      },
      mobile: {
        light: String,
        dark: String
      }
    },

    // Color Scheme
    colors: {
      primary: { type: String, default: '#007bff' },
      secondary: { type: String, default: '#6c757d' },
      success: { type: String, default: '#28a745' },
      warning: { type: String, default: '#ffc107' },
      danger: { type: String, default: '#dc3545' },
      info: { type: String, default: '#17a2b8' },
      light: { type: String, default: '#f8f9fa' },
      dark: { type: String, default: '#343a40' },
      
      // Custom brand colors
      accent: String,
      background: String,
      surface: String,
      text: {
        primary: String,
        secondary: String,
        disabled: String
      },
      
      // Gradient definitions
      gradients: [{
        name: String,
        direction: String,
        stops: [String]
      }]
    },

    // Typography
    typography: {
      fontFamily: {
        primary: { type: String, default: 'Inter, sans-serif' },
        secondary: String,
        monospace: { type: String, default: 'Monaco, monospace' }
      },
      fontSizes: {
        xs: { type: String, default: '0.75rem' },
        sm: { type: String, default: '0.875rem' },
        base: { type: String, default: '1rem' },
        lg: { type: String, default: '1.125rem' },
        xl: { type: String, default: '1.25rem' },
        '2xl': { type: String, default: '1.5rem' },
        '3xl': { type: String, default: '1.875rem' },
        '4xl': { type: String, default: '2.25rem' }
      },
      fontWeights: {
        light: { type: Number, default: 300 },
        normal: { type: Number, default: 400 },
        medium: { type: Number, default: 500 },
        semibold: { type: Number, default: 600 },
        bold: { type: Number, default: 700 }
      }
    },

    // Layout & Spacing
    layout: {
      borderRadius: {
        sm: { type: String, default: '0.125rem' },
        base: { type: String, default: '0.25rem' },
        md: { type: String, default: '0.375rem' },
        lg: { type: String, default: '0.5rem' },
        xl: { type: String, default: '0.75rem' },
        full: { type: String, default: '9999px' }
      },
      spacing: {
        xs: { type: String, default: '0.25rem' },
        sm: { type: String, default: '0.5rem' },
        md: { type: String, default: '1rem' },
        lg: { type: String, default: '1.5rem' },
        xl: { type: String, default: '3rem' }
      },
      shadows: {
        sm: String,
        md: String,
        lg: String,
        xl: String
      }
    },

    // Component Styles
    components: {
      buttons: {
        primaryStyle: mongoose.Schema.Types.Mixed,
        secondaryStyle: mongoose.Schema.Types.Mixed,
        sizes: mongoose.Schema.Types.Mixed
      },
      cards: {
        defaultStyle: mongoose.Schema.Types.Mixed,
        headerStyle: mongoose.Schema.Types.Mixed
      },
      navigation: {
        headerStyle: mongoose.Schema.Types.Mixed,
        sidebarStyle: mongoose.Schema.Types.Mixed,
        footerStyle: mongoose.Schema.Types.Mixed
      },
      forms: {
        inputStyle: mongoose.Schema.Types.Mixed,
        labelStyle: mongoose.Schema.Types.Mixed,
        errorStyle: mongoose.Schema.Types.Mixed
      }
    }
  },

  // Content Customization
  content: {
    // Text Content
    texts: {
      siteName: String,
      tagline: String,
      description: String,
      welcomeMessage: String,
      footerText: String,
      
      // Custom page titles
      pageTitles: {
        dashboard: String,
        trading: String,
        wallet: String,
        profile: String,
        support: String
      },
      
      // Custom labels
      labels: mongoose.Schema.Types.Mixed,
      
      // Terms and legal
      legal: {
        termsOfService: String,
        privacyPolicy: String,
        cookiePolicy: String,
        riskDisclosure: String
      }
    },

    // Supported Languages
    languages: {
      default: { type: String, default: 'en' },
      supported: [{ type: String, default: ['en'] }],
      rtlSupported: { type: Boolean, default: false }
    },

    // SEO Configuration
    seo: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: [String],
      ogImage: String,
      twitterCard: String,
      canonicalUrl: String,
      robots: { type: String, default: 'index,follow' }
    }
  },

  // Feature Configuration
  features: {
    // Trading Features
    trading: {
      spotTrading: { type: Boolean, default: true },
      marginTrading: { type: Boolean, default: false },
      futuresTrading: { type: Boolean, default: false },
      p2pTrading: { type: Boolean, default: true },
      advancedOrders: { type: Boolean, default: true },
      apiTrading: { type: Boolean, default: true }
    },

    // Wallet Features
    wallet: {
      cryptoWallets: { type: Boolean, default: true },
      fiatWallets: { type: Boolean, default: true },
      stakingRewards: { type: Boolean, default: false },
      savingsAccounts: { type: Boolean, default: false }
    },

    // Additional Features
    additional: {
      socialTrading: { type: Boolean, default: false },
      newsIntegration: { type: Boolean, default: true },
      chartingTools: { type: Boolean, default: true },
      mobileApp: { type: Boolean, default: true },
      affiliateProgram: { type: Boolean, default: false },
      referralProgram: { type: Boolean, default: true }
    },

    // Admin Features
    admin: {
      customDashboard: { type: Boolean, default: true },
      userManagement: { type: Boolean, default: true },
      reportingTools: { type: Boolean, default: true },
      complianceTools: { type: Boolean, default: true }
    }
  },

  // Integration Settings
  integrations: {
    // Payment Gateways
    payments: [{
      provider: String, // STRIPE, PAYPAL, etc.
      enabled: { type: Boolean, default: false },
      config: mongoose.Schema.Types.Mixed,
      supportedCurrencies: [String],
      fees: {
        deposit: Number,
        withdrawal: Number
      }
    }],

    // External APIs
    apis: [{
      service: String, // COINGECKO, COINMARKETCAP, etc.
      enabled: { type: Boolean, default: false },
      apiKey: String,
      config: mongoose.Schema.Types.Mixed
    }],

    // Notification Services
    notifications: {
      email: {
        provider: String, // SENDGRID, MAILGUN, etc.
        enabled: { type: Boolean, default: true },
        config: mongoose.Schema.Types.Mixed,
        templates: mongoose.Schema.Types.Mixed
      },
      sms: {
        provider: String, // TWILIO, etc.
        enabled: { type: Boolean, default: false },
        config: mongoose.Schema.Types.Mixed
      },
      push: {
        enabled: { type: Boolean, default: false },
        config: mongoose.Schema.Types.Mixed
      }
    },

    // Analytics
    analytics: [{
      provider: String, // GOOGLE_ANALYTICS, MIXPANEL, etc.
      enabled: { type: Boolean, default: false },
      trackingId: String,
      config: mongoose.Schema.Types.Mixed
    }],

    // Support Systems
    support: {
      livechat: {
        provider: String, // INTERCOM, ZENDESK, etc.
        enabled: { type: Boolean, default: false },
        config: mongoose.Schema.Types.Mixed
      },
      helpdesk: {
        provider: String,
        enabled: { type: Boolean, default: false },
        config: mongoose.Schema.Types.Mixed
      }
    }
  },

  // Security Configuration
  security: {
    // Authentication Settings
    authentication: {
      requireEmailVerification: { type: Boolean, default: true },
      requirePhoneVerification: { type: Boolean, default: false },
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSpecialChars: { type: Boolean, default: true },
        maxAge: { type: Number, default: 90 } // days
      },
      sessionTimeout: { type: Number, default: 30 }, // minutes
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutDuration: { type: Number, default: 15 } // minutes
    },

    // Two-Factor Authentication
    twoFactorAuth: {
      required: { type: Boolean, default: false },
      methods: [{
        type: String,
        enum: ['TOTP', 'SMS', 'EMAIL'],
        enabled: Boolean
      }],
      backupCodesEnabled: { type: Boolean, default: true }
    },

    // KYC Requirements
    kyc: {
      required: { type: Boolean, default: true },
      levels: [{
        level: String,
        name: String,
        requirements: [String],
        limits: mongoose.Schema.Types.Mixed
      }],
      documentTypes: [String],
      verificationProvider: String
    },

    // Security Headers
    headers: {
      contentSecurityPolicy: String,
      strictTransportSecurity: { type: Boolean, default: true },
      xFrameOptions: { type: String, default: 'DENY' },
      xContentTypeOptions: { type: Boolean, default: true }
    }
  },

  // Compliance Configuration
  compliance: {
    // Regulatory Jurisdiction
    jurisdiction: {
      primary: String, // ISO country code
      additional: [String],
      licenses: [{
        type: String,
        number: String,
        authority: String,
        expiryDate: Date
      }]
    },

    // Data Protection
    dataProtection: {
      gdprCompliant: { type: Boolean, default: false },
      ccpaCompliant: { type: Boolean, default: false },
      dataRetentionPeriod: { type: Number, default: 2555 }, // days (7 years)
      cookieConsentRequired: { type: Boolean, default: true }
    },

    // AML/KYC Settings
    amlKyc: {
      sanctionsScreening: { type: Boolean, default: true },
      pepScreening: { type: Boolean, default: true },
      transactionMonitoring: { type: Boolean, default: true },
      suspiciousActivityReporting: { type: Boolean, default: true },
      recordKeeping: { type: Boolean, default: true }
    }
  },

  // Custom CSS/JS
  customizations: {
    css: {
      customCSS: String, // Custom CSS overrides
      cssFramework: { type: String, default: 'tailwind' }, // tailwind, bootstrap, etc.
      responsiveBreakpoints: mongoose.Schema.Types.Mixed
    },
    javascript: {
      customJS: String, // Custom JavaScript
      analyticsCode: String,
      additionalScripts: [String]
    },
    html: {
      customHead: String, // Additional head content
      customFooter: String, // Additional footer content
      customHeader: String // Additional header content
    }
  },

  // Email Templates
  emailTemplates: {
    welcome: {
      subject: String,
      htmlTemplate: String,
      textTemplate: String,
      variables: [String]
    },
    verification: {
      subject: String,
      htmlTemplate: String,
      textTemplate: String
    },
    passwordReset: {
      subject: String,
      htmlTemplate: String,
      textTemplate: String
    },
    transactionAlert: {
      subject: String,
      htmlTemplate: String,
      textTemplate: String
    },
    kycApproval: {
      subject: String,
      htmlTemplate: String,
      textTemplate: String
    },
    kycRejection: {
      subject: String,
      htmlTemplate: String,
      textTemplate: String
    }
  },

  // Mobile App Configuration
  mobileApp: {
    enabled: { type: Boolean, default: false },
    ios: {
      appStoreId: String,
      bundleId: String,
      universalLinks: [String]
    },
    android: {
      playStoreId: String,
      packageName: String,
      deepLinks: [String]
    },
    pushNotifications: {
      enabled: { type: Boolean, default: false },
      provider: String,
      config: mongoose.Schema.Types.Mixed
    }
  },

  // Audit and Versioning
  auditInfo: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: Date,
    version: { type: Number, default: 1 },
    changeHistory: [{
      modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      modifiedAt: { type: Date, default: Date.now },
      changes: mongoose.Schema.Types.Mixed,
      version: Number,
      reason: String
    }]
  },

  // Metadata
  metadata: {
    tags: [String],
    description: String,
    notes: String,
    customFields: mongoose.Schema.Types.Mixed
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastDeployedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
brandConfigSchema.index({ brandId: 1 }, { unique: true });
brandConfigSchema.index({ brandSlug: 1 }, { unique: true });
brandConfigSchema.index({ tenantId: 1 });
brandConfigSchema.index({ status: 1 });
brandConfigSchema.index({ 'domains.primary.domain': 1 });
brandConfigSchema.index({ 'domains.aliases.domain': 1 });

// Compound indexes
brandConfigSchema.index({ tenantId: 1, status: 1 });
brandConfigSchema.index({ tenantId: 1, brandSlug: 1 });

// Pre-save middleware
brandConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Increment version if this is an update
  if (!this.isNew) {
    this.auditInfo.version++;
  }
  
  // Validate domain format
  if (this.domains.primary.domain) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(this.domains.primary.domain)) {
      return next(new Error('Invalid primary domain format'));
    }
  }
  
  next();
});

// Instance methods
brandConfigSchema.methods.isActive = function() {
  return this.status === 'ACTIVE';
};

brandConfigSchema.methods.getDomains = function() {
  const domains = [this.domains.primary.domain];
  
  if (this.domains.aliases) {
    domains.push(...this.domains.aliases.map(alias => alias.domain));
  }
  
  if (this.domains.subdomain && this.domains.subdomain.enabled) {
    domains.push(`${this.domains.subdomain.prefix}.exchangeplatform.com`);
  }
  
  return domains;
};

brandConfigSchema.methods.getThemeCSS = function() {
  const colors = this.branding.colors;
  const typography = this.branding.typography;
  const layout = this.branding.layout;
  
  return `
    :root {
      --brand-primary: ${colors.primary};
      --brand-secondary: ${colors.secondary};
      --brand-success: ${colors.success};
      --brand-warning: ${colors.warning};
      --brand-danger: ${colors.danger};
      --brand-info: ${colors.info};
      --brand-light: ${colors.light};
      --brand-dark: ${colors.dark};
      
      --font-family-primary: ${typography.fontFamily.primary};
      --font-family-secondary: ${typography.fontFamily.secondary || typography.fontFamily.primary};
      
      --border-radius-sm: ${layout.borderRadius.sm};
      --border-radius-base: ${layout.borderRadius.base};
      --border-radius-lg: ${layout.borderRadius.lg};
    }
    
    ${this.customizations.css.customCSS || ''}
  `;
};

brandConfigSchema.methods.addChangeHistoryEntry = function(modifiedBy, changes, reason) {
  this.auditInfo.changeHistory.push({
    modifiedBy,
    changes,
    version: this.auditInfo.version + 1,
    reason,
    modifiedAt: new Date()
  });
  
  this.auditInfo.lastModifiedBy = modifiedBy;
  this.auditInfo.lastModifiedAt = new Date();
};

brandConfigSchema.methods.isFeatureEnabled = function(featureCategory, featureName) {
  return this.features[featureCategory] && this.features[featureCategory][featureName] === true;
};

brandConfigSchema.methods.getEmailTemplate = function(templateType) {
  return this.emailTemplates[templateType] || null;
};

// Static methods
brandConfigSchema.statics.findByDomain = function(domain) {
  return this.findOne({
    $or: [
      { 'domains.primary.domain': domain },
      { 'domains.aliases.domain': domain },
      { 'domains.subdomain.prefix': domain.split('.')[0] }
    ],
    status: 'ACTIVE'
  });
};

brandConfigSchema.statics.findByTenant = function(tenantId) {
  return this.find({ tenantId, status: { $ne: 'SUSPENDED' } });
};

brandConfigSchema.statics.findActiveBrands = function() {
  return this.find({ status: 'ACTIVE' });
};

module.exports = mongoose.model('BrandConfig', brandConfigSchema);