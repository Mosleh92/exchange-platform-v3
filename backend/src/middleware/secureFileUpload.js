// backend/src/middleware/secureFileUpload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const logger = require('../utils/logger');

/**
 * Secure File Upload Middleware
 * Provides secure file upload handling with validation, scanning, and storage
 */
class SecureFileUploadMiddleware {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.tempDir = path.join(this.uploadDir, 'temp');
    this.quarantineDir = path.join(this.uploadDir, 'quarantine');
    
    this.initializeDirectories();
    this.initializeFileTypes();
    this.initializeStorage();
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(this.quarantineDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directories:', error);
    }
  }

  /**
   * Initialize allowed file types and security rules
   */
  initializeFileTypes() {
    this.allowedTypes = {
      image: {
        mimeTypes: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp'
        ],
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        maxSize: 5 * 1024 * 1024, // 5MB
        requiresScanning: true
      },
      document: {
        mimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ],
        extensions: ['.pdf', '.doc', '.docx', '.txt'],
        maxSize: 10 * 1024 * 1024, // 10MB
        requiresScanning: true
      },
      archive: {
        mimeTypes: [
          'application/zip',
          'application/x-zip-compressed'
        ],
        extensions: ['.zip'],
        maxSize: 50 * 1024 * 1024, // 50MB
        requiresScanning: true,
        requiresExtraction: true
      }
    };

    // Dangerous file types to always reject
    this.dangerousTypes = [
      '.exe', '.bat', '.cmd', '.scr', '.pif', '.com',
      '.js', '.jar', '.vbs', '.ps1', '.sh', '.php',
      '.asp', '.aspx', '.jsp', '.rb', '.py'
    ];

    // Magic numbers for file type verification
    this.magicNumbers = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'application/zip': [0x50, 0x4B, 0x03, 0x04]
    };
  }

  /**
   * Initialize multer storage configuration
   */
  initializeStorage() {
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.tempDir);
      },
      filename: (req, file, cb) => {
        // Generate secure filename
        const fileId = crypto.randomUUID();
        const sanitizedName = this.sanitizeFilename(file.originalname);
        const extension = path.extname(sanitizedName);
        const filename = `${fileId}_${Date.now()}${extension}`;
        
        // Store original name in request for later use
        file.secureFilename = filename;
        file.originalSafeName = sanitizedName;
        
        cb(null, filename);
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
        files: 10, // Max 10 files
        fields: 20, // Max 20 form fields
        parts: 30 // Max 30 parts
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, cb);
      }
    });
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    if (!filename) {
      return 'unknown';
    }

    // Remove dangerous characters and patterns
    return filename
      .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove control characters
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.\./g, '.') // Replace double dots
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 255); // Limit length
  }

  /**
   * Validate file during upload
   */
  validateFile(file, callback) {
    try {
      // Check file extension
      const extension = path.extname(file.originalname).toLowerCase();
      
      if (this.dangerousTypes.includes(extension)) {
        logger.warn('Dangerous file type rejected', { 
          filename: file.originalname,
          extension 
        });
        return callback(new Error(`File type ${extension} is not allowed`));
      }

      // Find matching file type category
      let allowedCategory = null;
      for (const [category, config] of Object.entries(this.allowedTypes)) {
        if (config.extensions.includes(extension) || 
            config.mimeTypes.includes(file.mimetype)) {
          allowedCategory = config;
          break;
        }
      }

      if (!allowedCategory) {
        logger.warn('File type not allowed', { 
          filename: file.originalname,
          mimetype: file.mimetype,
          extension 
        });
        return callback(new Error('File type not allowed'));
      }

      // Store category info for later validation
      file.allowedCategory = allowedCategory;
      
      callback(null, true);
    } catch (error) {
      logger.error('File validation error:', error);
      callback(new Error('File validation failed'));
    }
  }

  /**
   * Post-upload security validation
   */
  async validateUploadedFile(file) {
    const validation = {
      safe: true,
      errors: [],
      warnings: [],
      quarantined: false
    };

    try {
      const filePath = file.path;
      
      // Verify file exists
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        validation.safe = false;
        validation.errors.push('Invalid file');
        return validation;
      }

      // Check file size against category limits
      if (file.allowedCategory && stats.size > file.allowedCategory.maxSize) {
        validation.safe = false;
        validation.errors.push(`File size exceeds ${file.allowedCategory.maxSize / (1024 * 1024)}MB limit`);
        return validation;
      }

      // Verify file type by magic numbers
      const isValidType = await this.verifyFileType(filePath, file.mimetype);
      if (!isValidType) {
        validation.safe = false;
        validation.errors.push('File content does not match declared type');
        await this.quarantineFile(file, 'Type mismatch');
        validation.quarantined = true;
        return validation;
      }

      // Scan for embedded threats
      const threatScan = await this.scanForThreats(filePath);
      if (!threatScan.safe) {
        validation.safe = false;
        validation.errors.push(...threatScan.threats);
        await this.quarantineFile(file, 'Threats detected');
        validation.quarantined = true;
        return validation;
      }

      // Additional content validation
      const contentValidation = await this.validateFileContent(filePath, file.mimetype);
      if (!contentValidation.valid) {
        validation.warnings.push(...contentValidation.warnings);
        if (contentValidation.critical) {
          validation.safe = false;
          validation.errors.push(...contentValidation.errors);
        }
      }

      logger.info('File validation completed', {
        filename: file.originalname,
        size: stats.size,
        safe: validation.safe
      });

    } catch (error) {
      logger.error('File validation error:', error);
      validation.safe = false;
      validation.errors.push('Validation process failed');
    }

    return validation;
  }

  /**
   * Verify file type using magic numbers
   */
  async verifyFileType(filePath, declaredMimeType) {
    try {
      const buffer = Buffer.alloc(20);
      const fileHandle = await fs.open(filePath, 'r');
      await fileHandle.read(buffer, 0, 20, 0);
      await fileHandle.close();

      const magicNumber = this.magicNumbers[declaredMimeType];
      if (!magicNumber) {
        // No magic number defined, trust the declared type
        return true;
      }

      // Check if file starts with expected magic number
      for (let i = 0; i < magicNumber.length; i++) {
        if (buffer[i] !== magicNumber[i]) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('File type verification error:', error);
      return false;
    }
  }

  /**
   * Scan file for potential threats
   */
  async scanForThreats(filePath) {
    const result = {
      safe: true,
      threats: []
    };

    try {
      // Read file content for basic threat detection
      const content = await fs.readFile(filePath);
      const contentStr = content.toString('utf8', 0, Math.min(content.length, 10000));

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /data:text\/html/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /%3cscript/gi,
        /eval\(/gi,
        /document\.write/gi,
        /\.exe\b/gi,
        /cmd\.exe/gi,
        /powershell/gi
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(contentStr)) {
          result.safe = false;
          result.threats.push(`Suspicious pattern detected: ${pattern.source}`);
        }
      }

      // Check for embedded executable content
      if (this.hasEmbeddedExecutable(content)) {
        result.safe = false;
        result.threats.push('Embedded executable content detected');
      }

      // Check file entropy (high entropy might indicate encrypted/compressed malware)
      const entropy = this.calculateEntropy(content);
      if (entropy > 7.5) {
        result.threats.push('High entropy detected - possible encryption/compression');
        // Don't mark as unsafe, but log for monitoring
      }

    } catch (error) {
      logger.error('Threat scanning error:', error);
      result.safe = false;
      result.threats.push('Threat scanning failed');
    }

    return result;
  }

  /**
   * Check for embedded executable content
   */
  hasEmbeddedExecutable(buffer) {
    // Look for PE header (Windows executable)
    const peSignature = Buffer.from([0x50, 0x45, 0x00, 0x00]); // "PE\0\0"
    const mzSignature = Buffer.from([0x4D, 0x5A]); // "MZ"

    // Look for ELF header (Linux executable)
    const elfSignature = Buffer.from([0x7F, 0x45, 0x4C, 0x46]); // "\x7fELF"

    return (
      buffer.includes(peSignature) ||
      buffer.includes(mzSignature) ||
      buffer.includes(elfSignature)
    );
  }

  /**
   * Calculate file entropy
   */
  calculateEntropy(buffer) {
    const frequency = new Array(256).fill(0);
    
    for (let i = 0; i < buffer.length; i++) {
      frequency[buffer[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequency[i] > 0) {
        const p = frequency[i] / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Validate specific file content types
   */
  async validateFileContent(filePath, mimeType) {
    const result = {
      valid: true,
      warnings: [],
      errors: [],
      critical: false
    };

    try {
      switch (mimeType) {
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
          await this.validateImageContent(filePath, result);
          break;
        case 'application/pdf':
          await this.validatePDFContent(filePath, result);
          break;
        case 'application/zip':
          await this.validateZipContent(filePath, result);
          break;
      }
    } catch (error) {
      logger.error('Content validation error:', error);
      result.valid = false;
      result.errors.push('Content validation failed');
    }

    return result;
  }

  /**
   * Validate image content
   */
  async validateImageContent(filePath, result) {
    // Basic image validation - could be extended with image processing library
    const stats = await fs.stat(filePath);
    
    // Check for suspiciously large images
    if (stats.size > 20 * 1024 * 1024) {
      result.warnings.push('Large image file detected');
    }

    // Could add EXIF data validation here
  }

  /**
   * Validate PDF content
   */
  async validatePDFContent(filePath, result) {
    const buffer = await fs.readFile(filePath, { encoding: 'binary' });
    
    // Check for JavaScript in PDF
    if (buffer.includes('/JavaScript') || buffer.includes('/JS')) {
      result.critical = true;
      result.errors.push('PDF contains JavaScript');
    }

    // Check for suspicious PDF features
    const suspiciousFeatures = [
      '/EmbeddedFile',
      '/Launch',
      '/SubmitForm',
      '/ImportData'
    ];

    for (const feature of suspiciousFeatures) {
      if (buffer.includes(feature)) {
        result.warnings.push(`PDF contains ${feature}`);
      }
    }
  }

  /**
   * Validate ZIP content
   */
  async validateZipContent(filePath, result) {
    // Basic ZIP validation - would need zip library for full extraction
    const stats = await fs.stat(filePath);
    
    // Check compression ratio (zip bombs)
    if (stats.size < 1024 && stats.size > 0) {
      result.warnings.push('Highly compressed archive detected');
    }
  }

  /**
   * Quarantine suspicious file
   */
  async quarantineFile(file, reason) {
    try {
      const quarantinePath = path.join(
        this.quarantineDir, 
        `${Date.now()}_${file.secureFilename}`
      );
      
      await fs.rename(file.path, quarantinePath);
      
      // Log quarantine event
      logger.warn('File quarantined', {
        originalName: file.originalname,
        quarantinePath,
        reason,
        size: file.size
      });

      // Create quarantine record
      const quarantineRecord = {
        filename: file.originalname,
        secureFilename: file.secureFilename,
        quarantinePath,
        reason,
        timestamp: new Date(),
        size: file.size,
        mimetype: file.mimetype
      };

      await fs.writeFile(
        quarantinePath + '.meta',
        JSON.stringify(quarantineRecord, null, 2)
      );

    } catch (error) {
      logger.error('Failed to quarantine file:', error);
    }
  }

  /**
   * Move validated file to secure storage
   */
  async moveToSecureStorage(file, category = 'general') {
    try {
      const secureDir = path.join(this.uploadDir, category);
      await fs.mkdir(secureDir, { recursive: true });
      
      const securePath = path.join(secureDir, file.secureFilename);
      await fs.rename(file.path, securePath);
      
      return {
        path: securePath,
        filename: file.secureFilename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      logger.error('Failed to move file to secure storage:', error);
      throw new Error('File storage failed');
    }
  }

  /**
   * Get upload middleware for specific file types
   */
  getUploadMiddleware(options = {}) {
    const {
      fieldName = 'file',
      maxFiles = 1,
      fileTypes = ['image', 'document']
    } = options;

    return {
      upload: maxFiles === 1 ? 
        this.upload.single(fieldName) : 
        this.upload.array(fieldName, maxFiles),
      
      validate: async (req, res, next) => {
        try {
          if (!req.file && !req.files) {
            return next();
          }

          const files = req.files || [req.file];
          const validationResults = [];

          for (const file of files) {
            const validation = await this.validateUploadedFile(file);
            validationResults.push({ file, validation });

            if (!validation.safe) {
              return res.status(400).json({
                error: 'FILE_VALIDATION_FAILED',
                message: 'File validation failed',
                filename: file.originalname,
                errors: validation.errors
              });
            }
          }

          req.fileValidations = validationResults;
          next();
        } catch (error) {
          logger.error('File validation middleware error:', error);
          res.status(500).json({
            error: 'FILE_PROCESSING_ERROR',
            message: 'File processing failed'
          });
        }
      }
    };
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          logger.debug('Cleaned up temp file', { file });
        }
      }
    } catch (error) {
      logger.error('Temp file cleanup error:', error);
    }
  }
}

module.exports = new SecureFileUploadMiddleware();