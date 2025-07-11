// backend/src/utils/encryption.js
const crypto = require('crypto');

/**
 * Data Encryption at Rest Utility
 * Provides field-level encryption for sensitive data
 */
class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyDerivationAlgorithm = 'pbkdf2';
        this.keyLength = 32;
        this.ivLength = 16;
        this.saltLength = 64;
        this.tagLength = 16;
        this.iterations = 100000;
        
        // Get encryption key from environment
        this.encryptionKey = this.deriveKey(
            process.env.ENCRYPTION_SECRET || 'default-encryption-secret-change-in-production'
        );
    }

    /**
     * Derive encryption key from master secret
     */
    deriveKey(secret, salt = null) {
        if (!salt) {
            salt = crypto.randomBytes(this.saltLength);
        }
        
        return {
            key: crypto.pbkdf2Sync(secret, salt, this.iterations, this.keyLength, 'sha256'),
            salt: salt
        };
    }

    /**
     * Encrypt sensitive data
     */
    encrypt(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipherGCM(this.algorithm, this.encryptionKey.key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            // Combine IV, encrypted data, and auth tag
            return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData) {
        if (!encryptedData || typeof encryptedData !== 'string') {
            return encryptedData;
        }

        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const tag = Buffer.from(parts[2], 'hex');

            const decipher = crypto.createDecipherGCM(this.algorithm, this.encryptionKey.key, iv);
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Hash sensitive data (one-way)
     */
    hash(data, salt = null) {
        if (!salt) {
            salt = crypto.randomBytes(32);
        }
        
        const hash = crypto.pbkdf2Sync(data, salt, this.iterations, 64, 'sha256');
        return salt.toString('hex') + ':' + hash.toString('hex');
    }

    /**
     * Verify hashed data
     */
    verifyHash(data, hashedData) {
        const parts = hashedData.split(':');
        if (parts.length !== 2) {
            return false;
        }
        
        const salt = Buffer.from(parts[0], 'hex');
        const originalHash = parts[1];
        
        const hash = crypto.pbkdf2Sync(data, salt, this.iterations, 64, 'sha256');
        return hash.toString('hex') === originalHash;
    }

    /**
     * Generate secure random token
     */
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Encrypt object fields
     */
    encryptFields(obj, fields) {
        const encrypted = { ...obj };
        
        fields.forEach(field => {
            if (encrypted[field]) {
                encrypted[field] = this.encrypt(encrypted[field]);
            }
        });
        
        return encrypted;
    }

    /**
     * Decrypt object fields
     */
    decryptFields(obj, fields) {
        const decrypted = { ...obj };
        
        fields.forEach(field => {
            if (decrypted[field]) {
                decrypted[field] = this.decrypt(decrypted[field]);
            }
        });
        
        return decrypted;
    }
}

module.exports = new EncryptionService();