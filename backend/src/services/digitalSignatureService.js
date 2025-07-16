// backend/src/services/digitalSignatureService.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

class DigitalSignatureService {
    constructor() {
        this.algorithm = 'RS256';
        this.keySize = 2048;
    }

    /**
     * Generate RSA key pair for user
     */
    async generateKeyPair(userId) {
        try {
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: this.keySize,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            // Store public key in user profile
            await User.findByIdAndUpdate(userId, {
                'digitalSignature.publicKey': publicKey,
                'digitalSignature.keyGeneratedAt': new Date()
            });

            // Log key generation
            await AuditLog.create({
                userId: userId,
                action: 'GENERATE_SIGNATURE_KEYS',
                resource: 'Security',
                resourceId: userId,
                details: 'کلیدهای دیجیتال امضا تولید شدند',
                severity: 'medium'
            });

            return {
                publicKey,
                privateKey // This should be securely stored by the client
            };
        } catch (error) {
            throw new Error(`خطا در تولید کلیدهای امضا: ${error.message}`);
        }
    }

    /**
     * Sign data with private key
     */
    signData(data, privateKey) {
        try {
            const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
            const sign = crypto.createSign('SHA256');
            sign.update(dataString);
            const signature = sign.sign(privateKey, 'base64');
            
            return {
                data: data,
                signature: signature,
                timestamp: new Date().toISOString(),
                algorithm: 'SHA256withRSA'
            };
        } catch (error) {
            throw new Error(`خطا در امضای دیجیتال: ${error.message}`);
        }
    }

    /**
     * Verify digital signature
     */
    async verifySignature(signedData, publicKey = null, userId = null) {
        try {
            if (!publicKey && userId) {
                const user = await User.findById(userId).select('digitalSignature.publicKey');
                if (!user || !user.digitalSignature?.publicKey) {
                    throw new Error('کلید عمومی کاربر یافت نشد');
                }
                publicKey = user.digitalSignature.publicKey;
            }

            if (!publicKey) {
                throw new Error('کلید عمومی الزامی است');
            }

            const { data, signature, timestamp, algorithm } = signedData;
            const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
            
            const verify = crypto.createVerify('SHA256');
            verify.update(dataString);
            const isValid = verify.verify(publicKey, signature, 'base64');

            // Check timestamp (signature shouldn't be too old)
            const signatureTime = new Date(timestamp);
            const now = new Date();
            const maxAge = 30 * 60 * 1000; // 30 minutes
            const isExpired = (now - signatureTime) > maxAge;

            return {
                isValid: isValid && !isExpired,
                isExpired: isExpired,
                signatureTime: signatureTime,
                algorithm: algorithm
            };
        } catch (error) {
            throw new Error(`خطا در تایید امضای دیجیتال: ${error.message}`);
        }
    }

    /**
     * Sign transaction data
     */
    async signTransaction(transactionData, privateKey, userId) {
        try {
            const transactionHash = this.createTransactionHash(transactionData);
            const signedData = this.signData({
                transactionHash,
                ...transactionData
            }, privateKey);

            // Log signature creation
            await AuditLog.create({
                userId: userId,
                action: 'SIGN_TRANSACTION',
                resource: 'Transaction',
                resourceId: transactionData.id || transactionData._id,
                details: `تراکنش با امضای دیجیتال امضا شد`,
                metadata: {
                    transactionHash,
                    signatureAlgorithm: signedData.algorithm
                },
                severity: 'medium'
            });

            return signedData;
        } catch (error) {
            throw new Error(`خطا در امضای تراکنش: ${error.message}`);
        }
    }

    /**
     * Verify transaction signature
     */
    async verifyTransactionSignature(signedTransaction, userId) {
        try {
            const verification = await this.verifySignature(signedTransaction, null, userId);
            
            if (!verification.isValid) {
                // Log failed verification
                await AuditLog.create({
                    userId: userId,
                    action: 'VERIFY_SIGNATURE_FAILED',
                    resource: 'Security',
                    resourceId: userId,
                    details: 'تایید امضای دیجیتال ناموفق بود',
                    metadata: {
                        reason: verification.isExpired ? 'expired' : 'invalid',
                        signatureTime: verification.signatureTime
                    },
                    severity: 'high'
                });
            }

            return verification;
        } catch (error) {
            throw new Error(`خطا در تایید امضای تراکنش: ${error.message}`);
        }
    }

    /**
     * Create transaction hash
     */
    createTransactionHash(transactionData) {
        const dataToHash = {
            amount: transactionData.amount,
            from: transactionData.from,
            to: transactionData.to,
            currency: transactionData.currency,
            timestamp: transactionData.timestamp || new Date().toISOString()
        };

        return crypto
            .createHash('sha256')
            .update(JSON.stringify(dataToHash))
            .digest('hex');
    }

    /**
     * Generate secure nonce for transaction
     */
    generateNonce() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Create JWT token with signature
     */
    createSignedJWT(payload, privateKey, options = {}) {
        try {
            const defaultOptions = {
                algorithm: this.algorithm,
                expiresIn: '1h',
                issuer: 'exchange-platform',
                audience: 'api'
            };

            const jwtOptions = { ...defaultOptions, ...options };
            return jwt.sign(payload, privateKey, jwtOptions);
        } catch (error) {
            throw new Error(`خطا در تولید JWT امضا شده: ${error.message}`);
        }
    }

    /**
     * Verify JWT token with public key
     */
    async verifySignedJWT(token, publicKey = null, userId = null) {
        try {
            if (!publicKey && userId) {
                const user = await User.findById(userId).select('digitalSignature.publicKey');
                if (!user || !user.digitalSignature?.publicKey) {
                    throw new Error('کلید عمومی کاربر یافت نشد');
                }
                publicKey = user.digitalSignature.publicKey;
            }

            const decoded = jwt.verify(token, publicKey, {
                algorithms: [this.algorithm]
            });

            return {
                isValid: true,
                payload: decoded
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Create message signature for API authentication
     */
    createAPISignature(method, url, body, timestamp, apiSecret) {
        try {
            const message = `${method}${url}${JSON.stringify(body || {})}${timestamp}`;
            const signature = crypto
                .createHmac('sha256', apiSecret)
                .update(message)
                .digest('hex');

            return {
                signature,
                timestamp,
                message
            };
        } catch (error) {
            throw new Error(`خطا در تولید امضای API: ${error.message}`);
        }
    }

    /**
     * Verify API signature
     */
    verifyAPISignature(signature, method, url, body, timestamp, apiSecret, maxAge = 300000) {
        try {
            // Check timestamp age (default 5 minutes)
            const now = Date.now();
            if (now - timestamp > maxAge) {
                return {
                    isValid: false,
                    error: 'درخواست منقضی شده است'
                };
            }

            const expectedSignature = this.createAPISignature(method, url, body, timestamp, apiSecret);
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature, 'hex'),
                Buffer.from(expectedSignature.signature, 'hex')
            );

            return {
                isValid,
                timestamp: new Date(timestamp)
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Encrypt sensitive data
     */
    encryptData(data, publicKey) {
        try {
            const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
            const encrypted = crypto.publicEncrypt(
                {
                    key: publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(dataString)
            );

            return encrypted.toString('base64');
        } catch (error) {
            throw new Error(`خطا در رمزگذاری داده: ${error.message}`);
        }
    }

    /**
     * Decrypt sensitive data
     */
    decryptData(encryptedData, privateKey) {
        try {
            const decrypted = crypto.privateDecrypt(
                {
                    key: privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(encryptedData, 'base64')
            );

            const dataString = decrypted.toString();
            
            // Try to parse as JSON, fallback to string
            try {
                return JSON.parse(dataString);
            } catch {
                return dataString;
            }
        } catch (error) {
            throw new Error(`خطا در رمزگشایی داده: ${error.message}`);
        }
    }

    /**
     * Create multi-signature requirement
     */
    async createMultiSignature(data, requiredSigners, threshold = null) {
        try {
            const actualThreshold = threshold || Math.ceil(requiredSigners.length / 2);
            const multiSigData = {
                data: data,
                requiredSigners: requiredSigners,
                threshold: actualThreshold,
                signatures: [],
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            };

            return multiSigData;
        } catch (error) {
            throw new Error(`خطا در تولید multi-signature: ${error.message}`);
        }
    }

    /**
     * Add signature to multi-signature
     */
    async addSignatureToMultiSig(multiSigData, signature, userId) {
        try {
            // Check if user is required signer
            if (!multiSigData.requiredSigners.includes(userId)) {
                throw new Error('شما مجاز به امضای این داده نیستید');
            }

            // Check if user already signed
            if (multiSigData.signatures.some(sig => sig.userId === userId)) {
                throw new Error('شما قبلاً این داده را امضا کرده‌اید');
            }

            // Check expiration
            if (new Date() > new Date(multiSigData.expiresAt)) {
                throw new Error('زمان امضا منقضی شده است');
            }

            // Verify signature
            const verification = await this.verifySignature(signature, null, userId);
            if (!verification.isValid) {
                throw new Error('امضای نامعتبر');
            }

            // Add signature
            multiSigData.signatures.push({
                userId: userId,
                signature: signature,
                signedAt: new Date()
            });

            // Check if threshold is met
            const isComplete = multiSigData.signatures.length >= multiSigData.threshold;

            // Log signature addition
            await AuditLog.create({
                userId: userId,
                action: 'ADD_MULTISIG_SIGNATURE',
                resource: 'Security',
                details: `امضا به multi-signature اضافه شد`,
                metadata: {
                    signaturesCount: multiSigData.signatures.length,
                    threshold: multiSigData.threshold,
                    isComplete: isComplete
                },
                severity: 'medium'
            });

            return {
                multiSigData,
                isComplete
            };
        } catch (error) {
            throw new Error(`خطا در اضافه کردن امضا: ${error.message}`);
        }
    }

    /**
     * Verify multi-signature completion
     */
    async verifyMultiSignature(multiSigData) {
        try {
            if (multiSigData.signatures.length < multiSigData.threshold) {
                return {
                    isValid: false,
                    error: 'تعداد امضاها کافی نیست',
                    current: multiSigData.signatures.length,
                    required: multiSigData.threshold
                };
            }

            // Verify each signature
            for (const sig of multiSigData.signatures) {
                const verification = await this.verifySignature(sig.signature, null, sig.userId);
                if (!verification.isValid) {
                    return {
                        isValid: false,
                        error: `امضای کاربر ${sig.userId} نامعتبر است`
                    };
                }
            }

            return {
                isValid: true,
                signaturesCount: multiSigData.signatures.length,
                threshold: multiSigData.threshold
            };
        } catch (error) {
            throw new Error(`خطا در تایید multi-signature: ${error.message}`);
        }
    }

    /**
     * Get user's signature status
     */
    async getUserSignatureStatus(userId) {
        try {
            const user = await User.findById(userId).select('digitalSignature');
            
            return {
                hasKeys: !!(user.digitalSignature?.publicKey),
                keyGeneratedAt: user.digitalSignature?.keyGeneratedAt,
                isActive: !!(user.digitalSignature?.publicKey)
            };
        } catch (error) {
            throw new Error(`خطا در دریافت وضعیت امضا: ${error.message}`);
        }
    }

    /**
     * Revoke user's keys
     */
    async revokeKeys(userId, reason = 'درخواست کاربر') {
        try {
            await User.findByIdAndUpdate(userId, {
                $unset: { 'digitalSignature.publicKey': 1 },
                'digitalSignature.revokedAt': new Date(),
                'digitalSignature.revokeReason': reason
            });

            // Log key revocation
            await AuditLog.create({
                userId: userId,
                action: 'REVOKE_SIGNATURE_KEYS',
                resource: 'Security',
                resourceId: userId,
                details: `کلیدهای دیجیتال امضا باطل شدند: ${reason}`,
                severity: 'high'
            });

            return { success: true };
        } catch (error) {
            throw new Error(`خطا در باطل کردن کلیدها: ${error.message}`);
        }
    }
}

module.exports = new DigitalSignatureService();
