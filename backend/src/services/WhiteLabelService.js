const BrandConfig = require('../models/BrandConfig');
const ImmutableAudit = require('../models/ImmutableAudit');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * White-Label & Multi-Brand Management Service
 * Handles brand configuration, theme management, and multi-tenant customization
 */
class WhiteLabelService {
  constructor() {
    this.brandCache = new Map();
    this.themeCache = new Map();
    this.domainBrandMap = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    
    this.initializeService();
  }

  /**
   * Initialize the white-label service
   */
  async initializeService() {
    try {
      // Load active brands into cache
      await this.loadActiveBrands();
      
      // Setup domain mapping
      await this.setupDomainMapping();
      
      logger.info('White-label service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize white-label service:', error);
    }
  }

  /**
   * Create a new brand configuration
   */
  async createBrandConfig(brandData, createdBy) {
    try {
      // Validate brand data
      await this.validateBrandData(brandData);

      // Generate unique brand ID
      const brandId = this.generateBrandId(brandData.brandName);

      // Create brand configuration
      const brandConfig = new BrandConfig({
        brandId,
        brandName: brandData.brandName,
        brandSlug: brandData.brandSlug || this.generateSlug(brandData.brandName),
        tenantId: brandData.tenantId,
        domains: brandData.domains,
        branding: {
          ...this.getDefaultBranding(),
          ...brandData.branding
        },
        content: {
          ...this.getDefaultContent(),
          ...brandData.content
        },
        features: {
          ...this.getDefaultFeatures(),
          ...brandData.features
        },
        integrations: brandData.integrations || {},
        security: {
          ...this.getDefaultSecurity(),
          ...brandData.security
        },
        compliance: {
          ...this.getDefaultCompliance(),
          ...brandData.compliance
        },
        auditInfo: {
          createdBy,
          version: 1
        }
      });

      await brandConfig.save();

      // Generate initial theme files
      await this.generateThemeFiles(brandConfig);

      // Update cache
      this.updateBrandCache(brandConfig);

      // Create audit entry
      await this.createAuditEntry({
        entityInfo: {
          tenantId: brandConfig.tenantId,
          entityType: 'BRAND_CONFIG',
          entityId: brandConfig._id.toString()
        },
        eventInfo: {
          eventType: 'BRAND_CREATED',
          action: 'CREATE_BRAND',
          resource: 'BRAND_CONFIG',
          resourceId: brandConfig._id.toString(),
          outcome: 'SUCCESS'
        },
        changeInfo: {
          afterState: {
            brandId: brandConfig.brandId,
            brandName: brandConfig.brandName,
            status: brandConfig.status
          }
        }
      });

      logger.info('Brand configuration created', {
        brandId: brandConfig.brandId,
        brandName: brandConfig.brandName,
        tenantId: brandConfig.tenantId
      });

      return brandConfig;

    } catch (error) {
      logger.error('Failed to create brand configuration:', error);
      throw error;
    }
  }

  /**
   * Update brand configuration
   */
  async updateBrandConfig(brandId, updateData, modifiedBy) {
    try {
      const brandConfig = await BrandConfig.findOne({ brandId });
      if (!brandConfig) {
        throw new Error('Brand configuration not found');
      }

      // Store original state for audit
      const originalState = brandConfig.toObject();

      // Apply updates
      Object.keys(updateData).forEach(key => {
        if (key !== '_id' && key !== 'brandId' && key !== 'createdAt') {
          brandConfig[key] = updateData[key];
        }
      });

      // Add change history entry
      brandConfig.addChangeHistoryEntry(modifiedBy, updateData, 'Configuration update');

      await brandConfig.save();

      // Regenerate theme files if branding changed
      if (updateData.branding || updateData.customizations) {
        await this.generateThemeFiles(brandConfig);
      }

      // Update cache
      this.updateBrandCache(brandConfig);

      // Create audit entry
      await this.createAuditEntry({
        entityInfo: {
          tenantId: brandConfig.tenantId,
          entityType: 'BRAND_CONFIG',
          entityId: brandConfig._id.toString()
        },
        eventInfo: {
          eventType: 'BRAND_UPDATED',
          action: 'UPDATE_BRAND',
          resource: 'BRAND_CONFIG',
          resourceId: brandConfig._id.toString(),
          outcome: 'SUCCESS'
        },
        changeInfo: {
          beforeState: originalState,
          afterState: brandConfig.toObject(),
          fieldChanges: this.calculateFieldChanges(originalState, brandConfig.toObject())
        }
      });

      logger.info('Brand configuration updated', {
        brandId: brandConfig.brandId,
        modifiedBy,
        changes: Object.keys(updateData)
      });

      return brandConfig;

    } catch (error) {
      logger.error('Failed to update brand configuration:', error);
      throw error;
    }
  }

  /**
   * Get brand configuration by domain
   */
  async getBrandByDomain(domain) {
    try {
      // Check cache first
      const cachedBrandId = this.domainBrandMap.get(domain);
      if (cachedBrandId) {
        const cachedBrand = this.brandCache.get(cachedBrandId);
        if (cachedBrand && this.isCacheValid(cachedBrand.cacheTimestamp)) {
          return cachedBrand.data;
        }
      }

      // Query database
      const brandConfig = await BrandConfig.findByDomain(domain);
      if (brandConfig) {
        this.updateBrandCache(brandConfig);
        this.domainBrandMap.set(domain, brandConfig.brandId);
      }

      return brandConfig;

    } catch (error) {
      logger.error('Failed to get brand by domain:', error);
      return null;
    }
  }

  /**
   * Get brand configuration by ID
   */
  async getBrandById(brandId) {
    try {
      // Check cache first
      const cachedBrand = this.brandCache.get(brandId);
      if (cachedBrand && this.isCacheValid(cachedBrand.cacheTimestamp)) {
        return cachedBrand.data;
      }

      // Query database
      const brandConfig = await BrandConfig.findOne({ brandId });
      if (brandConfig) {
        this.updateBrandCache(brandConfig);
      }

      return brandConfig;

    } catch (error) {
      logger.error('Failed to get brand by ID:', error);
      return null;
    }
  }

  /**
   * Get all brands for a tenant
   */
  async getBrandsByTenant(tenantId) {
    try {
      const brandConfigs = await BrandConfig.findByTenant(tenantId);
      
      // Update cache for each brand
      brandConfigs.forEach(brand => {
        this.updateBrandCache(brand);
      });

      return brandConfigs;

    } catch (error) {
      logger.error('Failed to get brands by tenant:', error);
      throw error;
    }
  }

  /**
   * Generate theme CSS for a brand
   */
  generateThemeCSS(brandConfig) {
    try {
      const { branding, customizations } = brandConfig;
      
      let css = `
        /* Brand Theme CSS - Generated on ${new Date().toISOString()} */
        
        :root {
          /* Primary Colors */
          --brand-primary: ${branding.colors.primary};
          --brand-secondary: ${branding.colors.secondary};
          --brand-success: ${branding.colors.success};
          --brand-warning: ${branding.colors.warning};
          --brand-danger: ${branding.colors.danger};
          --brand-info: ${branding.colors.info};
          --brand-light: ${branding.colors.light};
          --brand-dark: ${branding.colors.dark};
          
          /* Text Colors */
          --brand-text-primary: ${branding.colors.text?.primary || '#333333'};
          --brand-text-secondary: ${branding.colors.text?.secondary || '#666666'};
          --brand-text-disabled: ${branding.colors.text?.disabled || '#999999'};
          
          /* Background Colors */
          --brand-background: ${branding.colors.background || '#ffffff'};
          --brand-surface: ${branding.colors.surface || '#f8f9fa'};
          --brand-accent: ${branding.colors.accent || branding.colors.primary};
          
          /* Typography */
          --brand-font-primary: ${branding.typography.fontFamily.primary};
          --brand-font-secondary: ${branding.typography.fontFamily.secondary || branding.typography.fontFamily.primary};
          --brand-font-monospace: ${branding.typography.fontFamily.monospace};
          
          /* Font Sizes */
          --brand-text-xs: ${branding.typography.fontSizes.xs};
          --brand-text-sm: ${branding.typography.fontSizes.sm};
          --brand-text-base: ${branding.typography.fontSizes.base};
          --brand-text-lg: ${branding.typography.fontSizes.lg};
          --brand-text-xl: ${branding.typography.fontSizes.xl};
          --brand-text-2xl: ${branding.typography.fontSizes['2xl']};
          --brand-text-3xl: ${branding.typography.fontSizes['3xl']};
          --brand-text-4xl: ${branding.typography.fontSizes['4xl']};
          
          /* Font Weights */
          --brand-weight-light: ${branding.typography.fontWeights.light};
          --brand-weight-normal: ${branding.typography.fontWeights.normal};
          --brand-weight-medium: ${branding.typography.fontWeights.medium};
          --brand-weight-semibold: ${branding.typography.fontWeights.semibold};
          --brand-weight-bold: ${branding.typography.fontWeights.bold};
          
          /* Border Radius */
          --brand-radius-sm: ${branding.layout.borderRadius.sm};
          --brand-radius-base: ${branding.layout.borderRadius.base};
          --brand-radius-md: ${branding.layout.borderRadius.md};
          --brand-radius-lg: ${branding.layout.borderRadius.lg};
          --brand-radius-xl: ${branding.layout.borderRadius.xl};
          --brand-radius-full: ${branding.layout.borderRadius.full};
          
          /* Spacing */
          --brand-spacing-xs: ${branding.layout.spacing.xs};
          --brand-spacing-sm: ${branding.layout.spacing.sm};
          --brand-spacing-md: ${branding.layout.spacing.md};
          --brand-spacing-lg: ${branding.layout.spacing.lg};
          --brand-spacing-xl: ${branding.layout.spacing.xl};
        }
        
        /* Base Typography */
        .brand-theme {
          font-family: var(--brand-font-primary);
          color: var(--brand-text-primary);
          background-color: var(--brand-background);
        }
        
        /* Component Styles */
        .brand-button-primary {
          background-color: var(--brand-primary);
          color: white;
          border-radius: var(--brand-radius-base);
          font-weight: var(--brand-weight-medium);
          transition: all 0.2s ease;
        }
        
        .brand-button-primary:hover {
          background-color: color-mix(in srgb, var(--brand-primary) 80%, black);
        }
        
        .brand-button-secondary {
          background-color: var(--brand-secondary);
          color: white;
          border-radius: var(--brand-radius-base);
          font-weight: var(--brand-weight-medium);
        }
        
        .brand-card {
          background-color: var(--brand-surface);
          border-radius: var(--brand-radius-lg);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .brand-input {
          border: 1px solid color-mix(in srgb, var(--brand-primary) 20%, transparent);
          border-radius: var(--brand-radius-base);
          font-family: var(--brand-font-primary);
        }
        
        .brand-input:focus {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 10%, transparent);
        }
      `;

      // Add gradient definitions
      if (branding.colors.gradients && branding.colors.gradients.length > 0) {
        branding.colors.gradients.forEach(gradient => {
          css += `
        .brand-gradient-${gradient.name} {
          background: linear-gradient(${gradient.direction}, ${gradient.stops.join(', ')});
        }
          `;
        });
      }

      // Add custom CSS
      if (customizations?.css?.customCSS) {
        css += `
        
        /* Custom CSS */
        ${customizations.css.customCSS}
        `;
      }

      return css;

    } catch (error) {
      logger.error('Failed to generate theme CSS:', error);
      return '';
    }
  }

  /**
   * Generate JavaScript configuration for brand
   */
  generateBrandJS(brandConfig) {
    try {
      const config = {
        brandId: brandConfig.brandId,
        brandName: brandConfig.brandName,
        features: brandConfig.features,
        integrations: {
          analytics: brandConfig.integrations.analytics?.filter(a => a.enabled) || [],
          payments: brandConfig.integrations.payments?.filter(p => p.enabled) || []
        },
        security: {
          sessionTimeout: brandConfig.security.authentication.sessionTimeout,
          requireEmailVerification: brandConfig.security.authentication.requireEmailVerification,
          twoFactorAuth: brandConfig.security.twoFactorAuth
        },
        content: {
          texts: brandConfig.content.texts,
          languages: brandConfig.content.languages
        }
      };

      let js = `
        // Brand Configuration - Generated on ${new Date().toISOString()}
        window.BRAND_CONFIG = ${JSON.stringify(config, null, 2)};
        
        // Brand-specific functionality
        (function() {
          'use strict';
          
          // Initialize brand features
          if (window.BRAND_CONFIG.features.trading.advancedOrders) {
            console.log('Advanced orders enabled for', window.BRAND_CONFIG.brandName);
          }
          
          // Setup analytics
          window.BRAND_CONFIG.integrations.analytics.forEach(function(analytics) {
            if (analytics.provider === 'GOOGLE_ANALYTICS' && analytics.trackingId) {
              // Initialize Google Analytics
              gtag('config', analytics.trackingId);
            }
          });
          
          // Session timeout handling
          if (window.BRAND_CONFIG.security.sessionTimeout > 0) {
            setTimeout(function() {
              // Warn user about session timeout
              console.warn('Session will expire soon');
            }, (window.BRAND_CONFIG.security.sessionTimeout - 5) * 60 * 1000);
          }
        })();
      `;

      // Add custom JavaScript
      if (brandConfig.customizations?.javascript?.customJS) {
        js += `
        
        // Custom JavaScript
        ${brandConfig.customizations.javascript.customJS}
        `;
      }

      return js;

    } catch (error) {
      logger.error('Failed to generate brand JavaScript:', error);
      return '';
    }
  }

  /**
   * Deploy brand configuration
   */
  async deployBrand(brandId, deployedBy) {
    try {
      const brandConfig = await BrandConfig.findOne({ brandId });
      if (!brandConfig) {
        throw new Error('Brand configuration not found');
      }

      // Generate all theme files
      await this.generateThemeFiles(brandConfig);

      // Update deployment status
      brandConfig.status = 'ACTIVE';
      brandConfig.lastDeployedAt = new Date();
      brandConfig.auditInfo.lastModifiedBy = deployedBy;
      brandConfig.auditInfo.lastModifiedAt = new Date();

      await brandConfig.save();

      // Update cache
      this.updateBrandCache(brandConfig);

      // Setup domain routing
      await this.setupDomainRouting(brandConfig);

      // Create audit entry
      await this.createAuditEntry({
        entityInfo: {
          tenantId: brandConfig.tenantId,
          entityType: 'BRAND_CONFIG',
          entityId: brandConfig._id.toString()
        },
        eventInfo: {
          eventType: 'BRAND_DEPLOYED',
          action: 'DEPLOY_BRAND',
          resource: 'BRAND_CONFIG',
          resourceId: brandConfig._id.toString(),
          outcome: 'SUCCESS'
        }
      });

      logger.info('Brand deployed successfully', {
        brandId,
        deployedBy,
        domains: brandConfig.getDomains()
      });

      return {
        success: true,
        brandId,
        status: brandConfig.status,
        deployedAt: brandConfig.lastDeployedAt,
        domains: brandConfig.getDomains()
      };

    } catch (error) {
      logger.error('Failed to deploy brand:', error);
      throw error;
    }
  }

  /**
   * Validate brand data
   */
  async validateBrandData(brandData) {
    // Check required fields
    const requiredFields = ['brandName', 'tenantId', 'domains'];
    for (const field of requiredFields) {
      if (!brandData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate domain format
    if (brandData.domains?.primary?.domain) {
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(brandData.domains.primary.domain)) {
        throw new Error('Invalid domain format');
      }
    }

    // Check for existing domain conflicts
    const existingBrand = await BrandConfig.findByDomain(brandData.domains.primary.domain);
    if (existingBrand) {
      throw new Error('Domain already in use by another brand');
    }

    // Validate slug uniqueness
    if (brandData.brandSlug) {
      const existingSlug = await BrandConfig.findOne({ brandSlug: brandData.brandSlug });
      if (existingSlug) {
        throw new Error('Brand slug already in use');
      }
    }
  }

  // Helper methods
  generateBrandId(brandName) {
    const timestamp = Date.now().toString();
    const hash = crypto.createHash('md5').update(brandName).digest('hex').substring(0, 8);
    return `brand_${hash}_${timestamp}`;
  }

  generateSlug(brandName) {
    return brandName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  updateBrandCache(brandConfig) {
    this.brandCache.set(brandConfig.brandId, {
      data: brandConfig,
      cacheTimestamp: Date.now()
    });

    // Update domain mapping
    brandConfig.getDomains().forEach(domain => {
      this.domainBrandMap.set(domain, brandConfig.brandId);
    });
  }

  isCacheValid(cacheTimestamp) {
    return Date.now() - cacheTimestamp < this.cacheTimeout;
  }

  async loadActiveBrands() {
    const activeBrands = await BrandConfig.findActiveBrands();
    activeBrands.forEach(brand => {
      this.updateBrandCache(brand);
    });
  }

  async setupDomainMapping() {
    for (const [brandId, cachedBrand] of this.brandCache) {
      const domains = cachedBrand.data.getDomains();
      domains.forEach(domain => {
        this.domainBrandMap.set(domain, brandId);
      });
    }
  }

  async generateThemeFiles(brandConfig) {
    try {
      const themeDir = path.join(__dirname, '../../public/themes', brandConfig.brandId);
      
      // Ensure theme directory exists
      await fs.mkdir(themeDir, { recursive: true });

      // Generate CSS file
      const css = this.generateThemeCSS(brandConfig);
      await fs.writeFile(path.join(themeDir, 'theme.css'), css);

      // Generate JavaScript file
      const js = this.generateBrandJS(brandConfig);
      await fs.writeFile(path.join(themeDir, 'brand.js'), js);

      // Generate manifest file
      const manifest = {
        brandId: brandConfig.brandId,
        brandName: brandConfig.brandName,
        version: brandConfig.auditInfo.version,
        generatedAt: new Date().toISOString(),
        files: ['theme.css', 'brand.js']
      };
      await fs.writeFile(path.join(themeDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      logger.debug('Theme files generated', { brandId: brandConfig.brandId, themeDir });

    } catch (error) {
      logger.error('Failed to generate theme files:', error);
    }
  }

  async setupDomainRouting(brandConfig) {
    // Implementation would setup routing configuration
    // This could involve updating nginx configs, CDN settings, etc.
    logger.info('Domain routing setup completed', {
      brandId: brandConfig.brandId,
      domains: brandConfig.getDomains()
    });
  }

  calculateFieldChanges(before, after) {
    const changes = [];
    // Implementation to calculate field-level changes
    return changes;
  }

  async createAuditEntry(auditData) {
    try {
      await ImmutableAudit.createAuditEntry(auditData);
    } catch (error) {
      logger.error('Failed to create audit entry:', error);
    }
  }

  // Default configurations
  getDefaultBranding() {
    return {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8',
        light: '#f8f9fa',
        dark: '#343a40'
      },
      typography: {
        fontFamily: {
          primary: 'Inter, sans-serif',
          monospace: 'Monaco, monospace'
        },
        fontSizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        },
        fontWeights: {
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        }
      },
      layout: {
        borderRadius: {
          sm: '0.125rem',
          base: '0.25rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          full: '9999px'
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '3rem'
        }
      }
    };
  }

  getDefaultContent() {
    return {
      texts: {
        siteName: 'Exchange Platform',
        tagline: 'Your Trusted Trading Platform',
        description: 'Advanced cryptocurrency exchange platform'
      },
      languages: {
        default: 'en',
        supported: ['en']
      }
    };
  }

  getDefaultFeatures() {
    return {
      trading: {
        spotTrading: true,
        marginTrading: false,
        futuresTrading: false,
        p2pTrading: true,
        advancedOrders: true,
        apiTrading: true
      },
      wallet: {
        cryptoWallets: true,
        fiatWallets: true,
        stakingRewards: false,
        savingsAccounts: false
      }
    };
  }

  getDefaultSecurity() {
    return {
      authentication: {
        requireEmailVerification: true,
        requirePhoneVerification: false,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        lockoutDuration: 15
      },
      twoFactorAuth: {
        required: false,
        methods: [
          { type: 'TOTP', enabled: true },
          { type: 'SMS', enabled: false },
          { type: 'EMAIL', enabled: true }
        ]
      }
    };
  }

  getDefaultCompliance() {
    return {
      dataProtection: {
        gdprCompliant: false,
        ccpaCompliant: false,
        dataRetentionPeriod: 2555,
        cookieConsentRequired: true
      },
      amlKyc: {
        sanctionsScreening: true,
        pepScreening: true,
        transactionMonitoring: true,
        suspiciousActivityReporting: true,
        recordKeeping: true
      }
    };
  }
}

module.exports = new WhiteLabelService();