// backend/src/config/secretsManager.js
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Enhanced Secrets Manager
 * Provides secure environment variable management, encryption, and validation
 */
class SecretsManager {
  constructor() {
    this.secrets = new Map();
    this.encryptionKey = null;
    this.initialized = false;
    this.requiredSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DB_ENCRYPTION_KEY',
      'API_SECRET_KEY'
    ];
    
    this.optionalSecrets = [
      'REDIS_PASSWORD',
      'SMTP_PASSWORD',
      'WEBHOOK_SECRET',
      'ENCRYPTION_SALT'
    ];

    this.secretValidators = {
      JWT_SECRET: (value) => value.length >= 32,
      JWT_REFRESH_SECRET: (value) => value.length >= 32,
      DB_ENCRYPTION_KEY: (value) => value.length >= 32,
      API_SECRET_KEY: (value) => value.length >= 32,
      REDIS_PASSWORD: (value) => value.length >= 8,
      SMTP_PASSWORD: (value) => value.length >= 1,
      WEBHOOK_SECRET: (value) => value.length >= 16
    };
  }

  /**
   * Initialize secrets manager
   */
  async initialize() {
    try {
      // Load environment variables
      await this.loadEnvironmentVariables();
      
      // Generate or load master encryption key
      await this.initializeEncryption();
      
      // Validate required secrets
      await this.validateSecrets();
      
      // Load encrypted secrets if they exist
      await this.loadEncryptedSecrets();
      
      this.initialized = true;
      logger.info('Secrets manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize secrets manager:', error);
      throw error;
    }
  }

  /**
   * Load environment variables
   */
  async loadEnvironmentVariables() {
    // Load from .env files based on environment
    const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
    const envPath = path.join(process.cwd(), envFile);
    
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      const envVars = this.parseEnvFile(envContent);
      
      // Merge with process.env
      for (const [key, value] of Object.entries(envVars)) {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to load .env file:', error);
      }
    }
  }

  /**
   * Parse .env file content
   */
  parseEnvFile(content) {
    const envVars = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key] = value;
    }
    
    return envVars;
  }

  /**
   * Initialize encryption for secrets
   */
  async initializeEncryption() {
    const keyPath = path.join(process.cwd(), '.secrets.key');
    
    try {
      // Try to load existing key
      const keyData = await fs.readFile(keyPath);
      this.encryptionKey = keyData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Generate new key
        this.encryptionKey = crypto.randomBytes(32);
        
        if (process.env.NODE_ENV !== 'production') {
          // Save key for development
          await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
          logger.info('Generated new encryption key for secrets');
        } else {
          logger.warn('New encryption key generated - save it securely');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate required secrets
   */
  async validateSecrets() {
    const missingSecrets = [];
    const invalidSecrets = [];
    
    for (const secretName of this.requiredSecrets) {
      const value = process.env[secretName];
      
      if (!value) {
        missingSecrets.push(secretName);
      } else {
        const validator = this.secretValidators[secretName];
        if (validator && !validator(value)) {
          invalidSecrets.push(secretName);
        }
      }
    }
    
    if (missingSecrets.length > 0) {
      logger.error('Missing required secrets:', missingSecrets);
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Missing required secrets: ${missingSecrets.join(', ')}`);
      } else {
        // Generate missing secrets for development
        await this.generateMissingSecrets(missingSecrets);
      }
    }
    
    if (invalidSecrets.length > 0) {
      logger.error('Invalid secrets (check length/format):', invalidSecrets);
      throw new Error(`Invalid secrets: ${invalidSecrets.join(', ')}`);
    }
  }

  /**
   * Generate missing secrets for development
   */
  async generateMissingSecrets(missingSecrets) {
    const generated = {};
    
    for (const secretName of missingSecrets) {
      let value;
      
      switch (secretName) {
        case 'JWT_SECRET':
        case 'JWT_REFRESH_SECRET':
        case 'DB_ENCRYPTION_KEY':
        case 'API_SECRET_KEY':
          value = crypto.randomBytes(32).toString('hex');
          break;
        case 'WEBHOOK_SECRET':
          value = crypto.randomBytes(16).toString('hex');
          break;
        default:
          value = crypto.randomBytes(16).toString('hex');
      }
      
      process.env[secretName] = value;
      generated[secretName] = value;
    }
    
    // Save to .env.development for persistence
    if (Object.keys(generated).length > 0) {
      await this.saveGeneratedSecrets(generated);
      logger.info('Generated missing secrets for development:', Object.keys(generated));
    }
  }

  /**
   * Save generated secrets to development env file
   */
  async saveGeneratedSecrets(secrets) {
    const envDevPath = path.join(process.cwd(), '.env.development');
    
    try {
      let content = '';
      
      // Read existing content
      try {
        content = await fs.readFile(envDevPath, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      
      // Append new secrets
      content += '\n# Auto-generated secrets\n';
      for (const [key, value] of Object.entries(secrets)) {
        content += `${key}=${value}\n`;
      }
      
      await fs.writeFile(envDevPath, content, { mode: 0o600 });
    } catch (error) {
      logger.error('Failed to save generated secrets:', error);
    }
  }

  /**
   * Load encrypted secrets from file
   */
  async loadEncryptedSecrets() {
    const secretsPath = path.join(process.cwd(), '.secrets.enc');
    
    try {
      const encryptedData = await fs.readFile(secretsPath);
      const decryptedData = this.decrypt(encryptedData);
      const secrets = JSON.parse(decryptedData);
      
      // Add to environment if not already present
      for (const [key, value] of Object.entries(secrets)) {
        if (!process.env[key]) {
          process.env[key] = value;
          this.secrets.set(key, value);
        }
      }
      
      logger.info('Loaded encrypted secrets');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to load encrypted secrets:', error);
      }
    }
  }

  /**
   * Save secrets in encrypted form
   */
  async saveEncryptedSecrets(secretsToSave = {}) {
    try {
      // Combine with existing secrets
      const allSecrets = { ...secretsToSave };
      
      // Add current environment secrets if they're not already included
      for (const secretName of [...this.requiredSecrets, ...this.optionalSecrets]) {
        if (process.env[secretName] && !allSecrets[secretName]) {
          allSecrets[secretName] = process.env[secretName];
        }
      }
      
      const encryptedData = this.encrypt(JSON.stringify(allSecrets));
      const secretsPath = path.join(process.cwd(), '.secrets.enc');
      
      await fs.writeFile(secretsPath, encryptedData, { mode: 0o600 });
      logger.info('Saved encrypted secrets');
    } catch (error) {
      logger.error('Failed to save encrypted secrets:', error);
      throw error;
    }
  }

  /**
   * Encrypt data
   */
  encrypt(data) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get secret value safely
   */
  getSecret(name, defaultValue = null) {
    if (!this.initialized) {
      throw new Error('Secrets manager not initialized');
    }
    
    return process.env[name] || this.secrets.get(name) || defaultValue;
  }

  /**
   * Set secret value
   */
  setSecret(name, value, persist = false) {
    if (!this.initialized) {
      throw new Error('Secrets manager not initialized');
    }
    
    process.env[name] = value;
    this.secrets.set(name, value);
    
    if (persist) {
      // Save to encrypted storage
      this.saveEncryptedSecrets({ [name]: value }).catch(error => {
        logger.error('Failed to persist secret:', error);
      });
    }
    
    logger.info(`Secret '${name}' updated`);
  }

  /**
   * Rotate secret
   */
  async rotateSecret(name, generator = null) {
    if (!this.initialized) {
      throw new Error('Secrets manager not initialized');
    }
    
    let newValue;
    
    if (generator) {
      newValue = generator();
    } else {
      // Default generators based on secret type
      switch (name) {
        case 'JWT_SECRET':
        case 'JWT_REFRESH_SECRET':
        case 'DB_ENCRYPTION_KEY':
        case 'API_SECRET_KEY':
          newValue = crypto.randomBytes(32).toString('hex');
          break;
        default:
          newValue = crypto.randomBytes(16).toString('hex');
      }
    }
    
    // Validate new value
    const validator = this.secretValidators[name];
    if (validator && !validator(newValue)) {
      throw new Error(`Generated value for '${name}' is invalid`);
    }
    
    const oldValue = this.getSecret(name);
    this.setSecret(name, newValue, true);
    
    logger.info(`Secret '${name}' rotated`);
    
    return {
      name,
      oldValue: oldValue ? '***' : null,
      newValue: '***',
      rotatedAt: new Date()
    };
  }

  /**
   * Validate all current secrets
   */
  validateAllSecrets() {
    const results = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    // Check required secrets
    for (const secretName of this.requiredSecrets) {
      const value = this.getSecret(secretName);
      
      if (!value) {
        results.valid = false;
        results.errors.push(`Missing required secret: ${secretName}`);
      } else {
        const validator = this.secretValidators[secretName];
        if (validator && !validator(value)) {
          results.valid = false;
          results.errors.push(`Invalid secret format: ${secretName}`);
        }
      }
    }
    
    // Check optional secrets
    for (const secretName of this.optionalSecrets) {
      const value = this.getSecret(secretName);
      
      if (value) {
        const validator = this.secretValidators[secretName];
        if (validator && !validator(value)) {
          results.warnings.push(`Invalid optional secret format: ${secretName}`);
        }
      }
    }
    
    return results;
  }

  /**
   * Get secrets status for monitoring
   */
  getSecretsStatus() {
    const status = {
      initialized: this.initialized,
      requiredSecrets: {},
      optionalSecrets: {},
      encryptionEnabled: !!this.encryptionKey,
      timestamp: new Date()
    };
    
    // Check required secrets
    for (const secretName of this.requiredSecrets) {
      status.requiredSecrets[secretName] = !!this.getSecret(secretName);
    }
    
    // Check optional secrets
    for (const secretName of this.optionalSecrets) {
      status.optionalSecrets[secretName] = !!this.getSecret(secretName);
    }
    
    return status;
  }

  /**
   * Clear all secrets from memory (for shutdown)
   */
  clearSecrets() {
    this.secrets.clear();
    
    // Clear sensitive environment variables
    for (const secretName of [...this.requiredSecrets, ...this.optionalSecrets]) {
      delete process.env[secretName];
    }
    
    this.initialized = false;
    logger.info('Secrets cleared from memory');
  }
}

// Create singleton instance
const secretsManager = new SecretsManager();

module.exports = secretsManager;