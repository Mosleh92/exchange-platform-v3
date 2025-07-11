const mongoose = require('mongoose');
const Tenant = require('../models/tenants/EnhancedTenant');
const EnhancedEventService = require('./enhancedEventService');
const logger = require('../utils/logger');

/**
 * Enhanced Tenant Configuration Service
 * Manages tenant configurations with caching and event-driven updates
 */
class EnhancedTenantConfigService {
  constructor() {
    this.eventService = new EnhancedEventService();
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.cacheTimestamps = new Map();
    
    // Initialize cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Get tenant configuration with caching
   */
  async getTenantConfig(tenantId, useCache = true) {
    try {
      // Check cache first
      if (useCache && this.isCacheValid(tenantId)) {
        logger.debug('Retrieved tenant config from cache', { tenantId });
        return this.cache.get(tenantId);
      }

      // Fetch from database
      const tenant = await Tenant.findById(tenantId)
        .select('config settings features limits')
        .lean();

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Merge with default configuration
      const config = this.mergeWithDefaults(tenant);

      // Cache the configuration
      this.cacheConfig(tenantId, config);

      logger.debug('Retrieved tenant config from database', { tenantId });
      return config;
    } catch (error) {
      logger.error('Error getting tenant config:', error);
      throw error;
    }
  }

  /**
   * Update tenant configuration
   */
  async updateTenantConfig(tenantId, updates, userId) {
    try {
      // Validate updates
      this.validateConfigUpdates(updates);

      // Update in database
      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            config: updates.config || {},
            settings: updates.settings || {},
            features: updates.features || {},
            limits: updates.limits || {},
            updatedAt: new Date(),
            updatedBy: userId
          }
        },
        { new: true, runValidators: true }
      );

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Clear cache
      this.clearCache(tenantId);

      // Emit configuration update event
      this.eventService.emit('TENANT_CONFIG_UPDATED', {
        tenantId,
        userId,
        updates,
        timestamp: new Date()
      });

      // Log configuration update
      await this.logConfigUpdate(tenantId, userId, updates);

      logger.info('Tenant configuration updated', {
        tenantId,
        userId,
        updateKeys: Object.keys(updates)
      });

      return tenant;
    } catch (error) {
      logger.error('Error updating tenant config:', error);
      throw error;
    }
  }

  /**
   * Get multiple tenant configurations
   */
  async getMultipleTenantConfigs(tenantIds, useCache = true) {
    try {
      const configs = {};
      const uncachedTenantIds = [];

      // Check cache for each tenant
      for (const tenantId of tenantIds) {
        if (useCache && this.isCacheValid(tenantId)) {
          configs[tenantId] = this.cache.get(tenantId);
        } else {
          uncachedTenantIds.push(tenantId);
        }
      }

      // Fetch uncached configurations from database
      if (uncachedTenantIds.length > 0) {
        const tenants = await Tenant.find({
          _id: { $in: uncachedTenantIds }
        })
        .select('config settings features limits')
        .lean();

        for (const tenant of tenants) {
          const config = this.mergeWithDefaults(tenant);
          configs[tenant._id] = config;
          this.cacheConfig(tenant._id, config);
        }
      }

      return configs;
    } catch (error) {
      logger.error('Error getting multiple tenant configs:', error);
      throw error;
    }
  }

  /**
   * Get tenant feature flags
   */
  async getTenantFeatures(tenantId, useCache = true) {
    try {
      const config = await this.getTenantConfig(tenantId, useCache);
      return config.features || {};
    } catch (error) {
      logger.error('Error getting tenant features:', error);
      throw error;
    }
  }

  /**
   * Check if feature is enabled for tenant
   */
  async isFeatureEnabled(tenantId, featureName, useCache = true) {
    try {
      const features = await this.getTenantFeatures(tenantId, useCache);
      return features[featureName] === true;
    } catch (error) {
      logger.error('Error checking feature enabled:', error);
      return false;
    }
  }

  /**
   * Get tenant limits
   */
  async getTenantLimits(tenantId, useCache = true) {
    try {
      const config = await this.getTenantConfig(tenantId, useCache);
      return config.limits || {};
    } catch (error) {
      logger.error('Error getting tenant limits:', error);
      throw error;
    }
  }

  /**
   * Check if operation is within limits
   */
  async checkOperationLimit(tenantId, operationType, amount, useCache = true) {
    try {
      const limits = await this.getTenantLimits(tenantId, useCache);
      const limit = limits[operationType];

      if (!limit) {
        return true; // No limit set
      }

      // Get current usage
      const currentUsage = await this.getCurrentUsage(tenantId, operationType);
      
      return currentUsage + amount <= limit;
    } catch (error) {
      logger.error('Error checking operation limit:', error);
      return false;
    }
  }

  /**
   * Get tenant settings
   */
  async getTenantSettings(tenantId, useCache = true) {
    try {
      const config = await this.getTenantConfig(tenantId, useCache);
      return config.settings || {};
    } catch (error) {
      logger.error('Error getting tenant settings:', error);
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(tenantId, settings, userId) {
    try {
      return await this.updateTenantConfig(tenantId, { settings }, userId);
    } catch (error) {
      logger.error('Error updating tenant settings:', error);
      throw error;
    }
  }

  /**
   * Get tenant configuration with inheritance
   */
  async getTenantConfigWithInheritance(tenantId, useCache = true) {
    try {
      const tenant = await Tenant.findById(tenantId)
        .populate('parentTenantId')
        .lean();

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get current tenant config
      const currentConfig = await this.getTenantConfig(tenantId, useCache);

      // If no parent, return current config
      if (!tenant.parentTenantId) {
        return currentConfig;
      }

      // Get parent config
      const parentConfig = await this.getTenantConfigWithInheritance(
        tenant.parentTenantId._id,
        useCache
      );

      // Merge configurations (current overrides parent)
      return this.mergeConfigurations(parentConfig, currentConfig);
    } catch (error) {
      logger.error('Error getting tenant config with inheritance:', error);
      throw error;
    }
  }

  /**
   * Bulk update tenant configurations
   */
  async bulkUpdateTenantConfigs(updates, userId) {
    try {
      const results = [];
      
      for (const { tenantId, config } of updates) {
        try {
          const result = await this.updateTenantConfig(tenantId, config, userId);
          results.push({ tenantId, success: true, result });
        } catch (error) {
          results.push({ tenantId, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error bulk updating tenant configs:', error);
      throw error;
    }
  }

  /**
   * Reset tenant configuration to defaults
   */
  async resetTenantConfig(tenantId, userId) {
    try {
      const defaultConfig = this.getDefaultConfiguration();
      
      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            config: defaultConfig.config,
            settings: defaultConfig.settings,
            features: defaultConfig.features,
            limits: defaultConfig.limits,
            updatedAt: new Date(),
            updatedBy: userId
          }
        },
        { new: true }
      );

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Clear cache
      this.clearCache(tenantId);

      // Emit reset event
      this.eventService.emit('TENANT_CONFIG_RESET', {
        tenantId,
        userId,
        timestamp: new Date()
      });

      logger.info('Tenant configuration reset to defaults', {
        tenantId,
        userId
      });

      return tenant;
    } catch (error) {
      logger.error('Error resetting tenant config:', error);
      throw error;
    }
  }

  /**
   * Export tenant configuration
   */
  async exportTenantConfig(tenantId) {
    try {
      const config = await this.getTenantConfigWithInheritance(tenantId);
      
      return {
        tenantId,
        config: config.config,
        settings: config.settings,
        features: config.features,
        limits: config.limits,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error exporting tenant config:', error);
      throw error;
    }
  }

  /**
   * Import tenant configuration
   */
  async importTenantConfig(tenantId, importedConfig, userId) {
    try {
      // Validate imported configuration
      this.validateImportedConfig(importedConfig);

      // Update tenant with imported configuration
      const tenant = await Tenant.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            config: importedConfig.config || {},
            settings: importedConfig.settings || {},
            features: importedConfig.features || {},
            limits: importedConfig.limits || {},
            updatedAt: new Date(),
            updatedBy: userId
          }
        },
        { new: true, runValidators: true }
      );

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Clear cache
      this.clearCache(tenantId);

      // Emit import event
      this.eventService.emit('TENANT_CONFIG_IMPORTED', {
        tenantId,
        userId,
        importedConfig,
        timestamp: new Date()
      });

      logger.info('Tenant configuration imported', {
        tenantId,
        userId,
        importedKeys: Object.keys(importedConfig)
      });

      return tenant;
    } catch (error) {
      logger.error('Error importing tenant config:', error);
      throw error;
    }
  }

  /**
   * Cache configuration
   */
  cacheConfig(tenantId, config) {
    this.cache.set(tenantId, config);
    this.cacheTimestamps.set(tenantId, Date.now());
  }

  /**
   * Clear cache for tenant
   */
  clearCache(tenantId) {
    this.cache.delete(tenantId);
    this.cacheTimestamps.delete(tenantId);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    logger.info('All tenant configuration cache cleared');
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(tenantId) {
    const timestamp = this.cacheTimestamps.get(tenantId);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Start cache cleanup
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [tenantId, timestamp] of this.cacheTimestamps.entries()) {
        if (now - timestamp > this.cacheTimeout) {
          this.cache.delete(tenantId);
          this.cacheTimestamps.delete(tenantId);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Merge with default configuration
   */
  mergeWithDefaults(tenant) {
    const defaults = this.getDefaultConfiguration();
    
    return {
      config: { ...defaults.config, ...tenant.config },
      settings: { ...defaults.settings, ...tenant.settings },
      features: { ...defaults.features, ...tenant.features },
      limits: { ...defaults.limits, ...tenant.limits }
    };
  }

  /**
   * Merge configurations (current overrides parent)
   */
  mergeConfigurations(parentConfig, currentConfig) {
    return {
      config: { ...parentConfig.config, ...currentConfig.config },
      settings: { ...parentConfig.settings, ...currentConfig.settings },
      features: { ...parentConfig.features, ...currentConfig.features },
      limits: { ...parentConfig.limits, ...currentConfig.limits }
    };
  }

  /**
   * Get default configuration
   */
  getDefaultConfiguration() {
    return {
      config: {
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm:ss'
      },
      settings: {
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        security: {
          twoFactorRequired: false,
          sessionTimeout: 3600,
          maxLoginAttempts: 5
        },
        trading: {
          autoConfirm: false,
          requireKYC: true,
          maxTradeAmount: 10000
        }
      },
      features: {
        p2p: true,
        remittance: true,
        multiCurrency: true,
        advancedOrders: false,
        apiAccess: false,
        whiteLabel: false
      },
      limits: {
        dailyTransactionLimit: 50000,
        monthlyTransactionLimit: 500000,
        maxTradeAmount: 10000,
        maxAccountsPerUser: 5,
        maxP2PAnnouncements: 10
      }
    };
  }

  /**
   * Validate configuration updates
   */
  validateConfigUpdates(updates) {
    const allowedKeys = ['config', 'settings', 'features', 'limits'];
    
    for (const key of Object.keys(updates)) {
      if (!allowedKeys.includes(key)) {
        throw new Error(`Invalid configuration key: ${key}`);
      }
    }

    // Validate specific settings
    if (updates.settings?.security?.sessionTimeout) {
      const timeout = updates.settings.security.sessionTimeout;
      if (timeout < 300 || timeout > 86400) {
        throw new Error('Session timeout must be between 300 and 86400 seconds');
      }
    }

    if (updates.settings?.security?.maxLoginAttempts) {
      const attempts = updates.settings.security.maxLoginAttempts;
      if (attempts < 1 || attempts > 20) {
        throw new Error('Max login attempts must be between 1 and 20');
      }
    }
  }

  /**
   * Validate imported configuration
   */
  validateImportedConfig(importedConfig) {
    const requiredKeys = ['config', 'settings', 'features', 'limits'];
    
    for (const key of requiredKeys) {
      if (!importedConfig[key] || typeof importedConfig[key] !== 'object') {
        throw new Error(`Invalid imported configuration: missing or invalid ${key}`);
      }
    }
  }

  /**
   * Get current usage for limit checking
   */
  async getCurrentUsage(tenantId, operationType) {
    // This would typically query the database for current usage
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Log configuration update
   */
  async logConfigUpdate(tenantId, userId, updates) {
    // This would typically log to an audit system
    logger.info('Tenant configuration updated', {
      tenantId,
      userId,
      updates: Object.keys(updates)
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout,
      cachedTenants: Array.from(this.cache.keys())
    };
  }
}

module.exports = new EnhancedTenantConfigService(); 