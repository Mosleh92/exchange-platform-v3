const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    this.tagLength = 16; // 128 bits
    this.iterations = 100000; // PBKDF2 iterations
  }

  /**
   * Get encryption key from environment or generate one
   */
  getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (key && key.length === 64) { // 32 bytes in hex
      return Buffer.from(key, 'hex');
    }
    
    // Fallback - derive from JWT secret
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    return crypto.pbkdf2Sync(secret, 'exchange-platform-v3', this.iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext, additionalData = '') {
    try {
      if (!plaintext) return null;

      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine iv + encrypted data (simplified without GCM for compatibility)
      const result = iv.toString('hex') + encrypted;
      return result;
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData, additionalData = '') {
    try {
      if (!encryptedData) return null;

      const key = this.getEncryptionKey();
      
      // Extract components
      const ivHex = encryptedData.slice(0, this.ivLength * 2);
      const encrypted = encryptedData.slice(this.ivLength * 2);
      
      const iv = Buffer.from(ivHex, 'hex');
      
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Hash password with salt
   */
  hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(this.saltLength).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(password, salt, this.iterations, 64, 'sha256').toString('hex');
    return { hash, salt };
  }

  /**
   * Verify password against hash
   */
  verifyPassword(password, hash, salt) {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  /**
   * Generate secure random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key pair
   */
  generateApiKeyPair() {
    return {
      apiKey: this.generateToken(32),
      apiSecret: this.generateToken(64)
    };
  }

  /**
   * Create HMAC signature
   */
  createSignature(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifySignature(data, signature, secret) {
    const computedSignature = this.createSignature(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computedSignature, 'hex'));
  }

  /**
   * Encrypt sensitive user data (PII)
   */
  encryptPII(data, userContext = '') {
    return this.encrypt(JSON.stringify(data), userContext);
  }

  /**
   * Decrypt sensitive user data (PII)
   */
  decryptPII(encryptedData, userContext = '') {
    const decrypted = this.decrypt(encryptedData, userContext);
    return decrypted ? JSON.parse(decrypted) : null;
  }
}

module.exports = new EncryptionService();