const crypto = require('crypto');

class EnvironmentValidationService {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Validate all JWT-related environment variables
     */
    validateJWTConfiguration() {
        this.validateJWTSecret();
        this.validateAccessTokenSecret();
        this.validateRefreshTokenSecret();
        this.validateSessionSecret();
        this.validateTokenExpirationSettings();
        
        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    /**
     * Validate JWT_SECRET
     */
    validateJWTSecret() {
        const jwtSecret = process.env.JWT_SECRET;
        
        if (!jwtSecret) {
            this.errors.push('JWT_SECRET environment variable is required');
            return;
        }

        // Check for default/weak secrets
        const defaultSecrets = [
            'your-secret-key-here',
            'your-super-secure-jwt-secret-key-min-32-chars',
            'secret',
            'jwt-secret',
            'default-secret',
            '123456',
            'password'
        ];

        if (defaultSecrets.includes(jwtSecret)) {
            if (process.env.NODE_ENV === 'production') {
                this.errors.push('JWT_SECRET cannot use default value in production environment');
            } else {
                this.warnings.push('JWT_SECRET is using a default value - change for production');
            }
        }

        // Check minimum length
        if (jwtSecret.length < 32) {
            this.errors.push('JWT_SECRET must be at least 32 characters long for security');
        }

        // Check complexity
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(jwtSecret) && jwtSecret.length < 64) {
            this.warnings.push('JWT_SECRET should contain uppercase, lowercase, and numbers for better security');
        }
    }

    /**
     * Validate ACCESS_TOKEN_SECRET
     */
    validateAccessTokenSecret() {
        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
        
        if (!accessTokenSecret) {
            this.warnings.push('ACCESS_TOKEN_SECRET not set, will fallback to JWT_SECRET');
            return;
        }

        // Check for default values
        if (accessTokenSecret === 'accesssecret') {
            if (process.env.NODE_ENV === 'production') {
                this.errors.push('ACCESS_TOKEN_SECRET cannot use default value in production');
            } else {
                this.warnings.push('ACCESS_TOKEN_SECRET is using default value');
            }
        }

        if (accessTokenSecret.length < 32) {
            this.errors.push('ACCESS_TOKEN_SECRET must be at least 32 characters long');
        }
    }

    /**
     * Validate REFRESH_TOKEN_SECRET
     */
    validateRefreshTokenSecret() {
        const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
        
        if (!refreshTokenSecret) {
            this.warnings.push('REFRESH_TOKEN_SECRET not set, will fallback to JWT_SECRET');
            return;
        }

        // Check for default values
        if (refreshTokenSecret === 'refreshsecret') {
            if (process.env.NODE_ENV === 'production') {
                this.errors.push('REFRESH_TOKEN_SECRET cannot use default value in production');
            } else {
                this.warnings.push('REFRESH_TOKEN_SECRET is using default value');
            }
        }

        if (refreshTokenSecret.length < 32) {
            this.errors.push('REFRESH_TOKEN_SECRET must be at least 32 characters long');
        }

        // Ensure different from other secrets
        if (refreshTokenSecret === process.env.JWT_SECRET) {
            this.warnings.push('REFRESH_TOKEN_SECRET should be different from JWT_SECRET');
        }
    }

    /**
     * Validate SESSION_SECRET
     */
    validateSessionSecret() {
        const sessionSecret = process.env.SESSION_SECRET;
        
        if (!sessionSecret) {
            this.warnings.push('SESSION_SECRET not set');
            return;
        }

        if (sessionSecret === 'your-super-secure-session-secret-key-min-32-chars') {
            if (process.env.NODE_ENV === 'production') {
                this.errors.push('SESSION_SECRET cannot use default value in production');
            } else {
                this.warnings.push('SESSION_SECRET is using default value');
            }
        }

        if (sessionSecret.length < 32) {
            this.errors.push('SESSION_SECRET must be at least 32 characters long');
        }
    }

    /**
     * Validate token expiration settings
     */
    validateTokenExpirationSettings() {
        // Check if expiration times are reasonable
        const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '15m';
        const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';

        // Parse expiration times
        const accessMinutes = this.parseExpirationTime(accessTokenExpiry);
        const refreshMinutes = this.parseExpirationTime(refreshTokenExpiry);

        if (accessMinutes > 1440) { // More than 24 hours
            this.warnings.push('ACCESS_TOKEN_EXPIRY is longer than 24 hours - consider shorter duration for security');
        }

        if (refreshMinutes > 43200) { // More than 30 days
            this.warnings.push('REFRESH_TOKEN_EXPIRY is longer than 30 days - consider shorter duration');
        }

        if (accessMinutes >= refreshMinutes) {
            this.errors.push('ACCESS_TOKEN_EXPIRY should be shorter than REFRESH_TOKEN_EXPIRY');
        }
    }

    /**
     * Parse expiration time string to minutes
     */
    parseExpirationTime(timeString) {
        const match = timeString.match(/^(\d+)([smhd])$/);
        if (!match) return 0;

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value / 60;
            case 'm': return value;
            case 'h': return value * 60;
            case 'd': return value * 1440;
            default: return 0;
        }
    }

    /**
     * Generate secure random secret
     */
    static generateSecureSecret(length = 64) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Validate production environment
     */
    validateProductionEnvironment() {
        if (process.env.NODE_ENV !== 'production') {
            return { isValid: true, errors: [], warnings: [] };
        }

        const prodErrors = [];
        const prodWarnings = [];

        // Critical production checks
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('your-')) {
            prodErrors.push('Production environment must have a custom JWT_SECRET');
        }

        if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost')) {
            prodWarnings.push('Production should use a remote MongoDB instance');
        }

        if (!process.env.REDIS_URL) {
            prodWarnings.push('Production should have Redis configured for better performance');
        }

        if (process.env.NODE_ENV === 'development') {
            prodErrors.push('NODE_ENV is set to development in production');
        }

        return {
            isValid: prodErrors.length === 0,
            errors: prodErrors,
            warnings: prodWarnings
        };
    }

    /**
     * Get security recommendations
     */
    getSecurityRecommendations() {
        const recommendations = [];

        recommendations.push('Rotate JWT secrets regularly (every 90 days)');
        recommendations.push('Use different secrets for different environments');
        recommendations.push('Store secrets in environment variables, not in code');
        recommendations.push('Use a key management service in production');
        recommendations.push('Enable Redis for token blacklisting in production');
        recommendations.push('Monitor failed authentication attempts');
        recommendations.push('Implement rate limiting on authentication endpoints');

        return recommendations;
    }

    /**
     * Log validation results
     */
    logValidationResults() {
        const result = this.validateJWTConfiguration();
        const prodResult = this.validateProductionEnvironment();

        console.log('\n=== JWT Environment Validation ===');
        
        if (result.errors.length > 0) {
            console.error('❌ ERRORS:');
            result.errors.forEach(error => console.error(`  - ${error}`));
        }

        if (result.warnings.length > 0) {
            console.warn('⚠️  WARNINGS:');
            result.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }

        if (prodResult.errors.length > 0) {
            console.error('❌ PRODUCTION ERRORS:');
            prodResult.errors.forEach(error => console.error(`  - ${error}`));
        }

        if (prodResult.warnings.length > 0) {
            console.warn('⚠️  PRODUCTION WARNINGS:');
            prodResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }

        if (result.errors.length === 0 && prodResult.errors.length === 0) {
            console.log('✅ JWT configuration validation passed');
        } else {
            console.log('❌ JWT configuration validation failed');
        }

        console.log('================================\n');

        return result.isValid && prodResult.isValid;
    }
}

module.exports = EnvironmentValidationService;