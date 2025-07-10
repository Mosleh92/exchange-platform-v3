# JWT Authentication Security Documentation

## Overview

This document provides comprehensive information about the JWT authentication system security improvements implemented in the exchange platform. The improvements focus on token management, security validation, and session control.

## Table of Contents

1. [JWT Token Management](#jwt-token-management)
2. [Token Blacklist System](#token-blacklist-system)
3. [Environment Security Validation](#environment-security-validation)
4. [Session Management](#session-management)
5. [Security Testing](#security-testing)
6. [API Endpoints](#api-endpoints)
7. [Configuration](#configuration)
8. [Best Practices](#best-practices)

## JWT Token Management

### Token Structure

All JWT tokens follow a consistent structure:

```javascript
{
  "userId": "user_id",
  "email": "user@example.com", 
  "role": "customer|admin|staff",
  "tenantId": "tenant_id",
  "username": "username",
  "iat": 1234567890,  // Issued at timestamp
  "exp": 1234567890   // Expiration timestamp
}
```

### Token Types

1. **Access Tokens**: Short-lived tokens (default: 15 minutes) for API access
2. **Refresh Tokens**: Long-lived tokens (default: 7 days) for obtaining new access tokens

### Token Security Features

- **Expiration Validation**: Automatic expiration checking
- **Blacklist Support**: Immediate token revocation capability
- **User-level Blacklisting**: Revoke all tokens for a specific user
- **Signature Validation**: Cryptographic verification of token integrity

## Token Blacklist System

### Overview

The token blacklist system provides immediate token revocation capabilities, essential for security incidents and logout functionality.

### Features

- **Redis-backed Storage**: Primary storage with memory fallback
- **Automatic Cleanup**: Expired entries are automatically removed
- **User-level Blacklisting**: Revoke all tokens issued before a specific timestamp
- **Performance Optimized**: Minimal impact on authentication flow

### Implementation

```javascript
const tokenBlacklistService = require('../services/tokenBlacklistService');

// Blacklist a specific token
await tokenBlacklistService.blacklistToken(token, expirationTime);

// Check if token is blacklisted
const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);

// Blacklist all user tokens (security incident)
await tokenBlacklistService.blacklistUserTokens(userId);
```

### Storage Options

1. **Redis** (Recommended for production)
   - Automatic expiration handling
   - High performance
   - Distributed deployment support

2. **Memory** (Development/fallback)
   - No external dependencies
   - Automatic cleanup via setTimeout
   - Single instance only

## Environment Security Validation

### JWT Secret Validation

The system validates JWT configuration on startup:

#### Required Validations

- **JWT_SECRET**: Must be at least 32 characters, cannot use default values in production
- **ACCESS_TOKEN_SECRET**: Optional, falls back to JWT_SECRET if not set
- **REFRESH_TOKEN_SECRET**: Should be different from JWT_SECRET
- **SESSION_SECRET**: Required for session management

#### Production-Specific Checks

- No default secrets allowed
- Minimum complexity requirements
- Remote database recommendations
- Redis configuration checks

### Environment Variables

```bash
# Required
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars

# Optional (will fallback to JWT_SECRET)
ACCESS_TOKEN_SECRET=your-access-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# Token expiration settings
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Redis for token blacklisting (recommended)
REDIS_URL=redis://localhost:6379
```

### Security Recommendations

1. Rotate JWT secrets every 90 days
2. Use different secrets for different environments
3. Enable Redis for production deployments
4. Monitor failed authentication attempts
5. Use environment-specific configurations

## Session Management

### Session Tracking

Sessions are tracked via refresh tokens stored in the database:

```javascript
// Get active sessions
GET /api/auth/sessions

// Response
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_id",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "expiresAt": "2023-01-08T00:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Logout Mechanisms

#### Single Session Logout
```javascript
POST /api/auth/logout
{
  "refreshToken": "refresh_token_here"
}
```

- Removes refresh token from database
- Adds access token to blacklist
- Immediate effect across all instances

#### All Sessions Logout
```javascript
POST /api/auth/logout-all
```

- Removes all refresh tokens for the user
- Blacklists all user tokens issued before current time
- Useful for security incidents

### Session Security Features

- **Automatic Cleanup**: Expired refresh tokens are removed during validation
- **Concurrent Session Limits**: Can be implemented via refresh token counting
- **Session Monitoring**: Track active sessions per user
- **Suspicious Activity Detection**: Monitor for unusual session patterns

## Security Testing

### Automated Tests

The system includes comprehensive security tests:

1. **Token Blacklist Tests**
   - Blacklist functionality validation
   - User-level blacklisting
   - Automatic cleanup verification

2. **Replay Attack Protection**
   - Expired token rejection
   - Token reuse after logout prevention
   - Concurrent session validation

3. **Environment Validation Tests**
   - JWT secret security checks
   - Production configuration validation
   - Default value detection

### Manual Security Testing

Use the provided test script:

```bash
node src/tests/manualTest.js
```

### Security Scenarios Tested

1. **Token Expiration**: Expired tokens are rejected
2. **Token Reuse**: Logged out tokens cannot be reused
3. **Replay Attacks**: Same token cannot be used after blacklisting
4. **Malformed Tokens**: Invalid token structures are rejected
5. **Signature Validation**: Tokens with invalid signatures are rejected

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/auth/login` | POST | User login | No |
| `/api/auth/logout` | POST | Single session logout | Yes |
| `/api/auth/logout-all` | POST | All sessions logout | Yes |
| `/api/auth/refresh` | POST | Refresh access token | No |
| `/api/auth/sessions` | GET | Get active sessions | Yes |
| `/api/auth/validate` | GET | Validate current token | Yes |

### Login Response

```javascript
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6...",
    "user": {
      "id": "user_id",
      "username": "username",
      "email": "user@example.com",
      "role": "customer",
      "tenantId": "tenant_id"
    }
  }
}
```

### Refresh Token Response

```javascript
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "username": "username",
    "role": "customer"
  }
}
```

## Configuration

### JWT Configuration

```javascript
// Get JWT secrets with fallbacks
const getJWTSecret = () => process.env.JWT_SECRET;
const getAccessTokenSecret = () => process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const getRefreshTokenSecret = () => process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
```

### Token Expiration

- **Access Token**: 15 minutes (configurable via `ACCESS_TOKEN_EXPIRY`)
- **Refresh Token**: 7 days (configurable via `REFRESH_TOKEN_EXPIRY`)

### Blacklist Configuration

```javascript
// Initialize token blacklist service
const tokenBlacklistService = require('../services/tokenBlacklistService');

// Service automatically detects Redis availability
// Falls back to memory storage if Redis unavailable
```

## Best Practices

### Development

1. **Use secure secrets** even in development
2. **Test token expiration** scenarios
3. **Validate environment** configuration before deployment
4. **Monitor token usage** patterns

### Production

1. **Use Redis** for token blacklisting
2. **Rotate secrets regularly** (every 90 days)
3. **Monitor failed authentications**
4. **Implement rate limiting** on auth endpoints
5. **Use HTTPS only** for token transmission
6. **Log security events** for audit purposes

### Security Monitoring

1. **Failed login attempts**: Track and alert on suspicious patterns
2. **Token blacklist growth**: Monitor blacklist size and growth rate
3. **Session duration**: Alert on unusually long sessions
4. **Multiple concurrent sessions**: Flag accounts with excessive concurrent sessions
5. **Token refresh patterns**: Monitor for unusual refresh patterns

### Incident Response

1. **User Compromise**: Use `POST /api/auth/logout-all` to invalidate all user sessions
2. **Secret Compromise**: Rotate JWT secrets and invalidate all tokens
3. **System Compromise**: Enable user-level blacklisting for affected accounts
4. **Suspicious Activity**: Temporary blacklisting while investigating

## Troubleshooting

### Common Issues

1. **Token Blacklist Not Working**
   - Check Redis connection
   - Verify service initialization
   - Confirm middleware order

2. **Environment Validation Errors**
   - Check JWT secret length (minimum 32 characters)
   - Verify no default values in production
   - Confirm all required environment variables

3. **Session Management Issues**
   - Verify refresh token storage
   - Check database connectivity
   - Confirm token cleanup processes

### Debug Information

Enable debug logging:

```bash
DEBUG=auth:* npm start
```

Check service status:

```javascript
const stats = await tokenBlacklistService.getStats();
console.log('Blacklist stats:', stats);
```

## Migration Guide

### Existing Applications

To integrate these security improvements:

1. **Install Dependencies**
   ```bash
   npm install redis validator
   ```

2. **Update Environment Variables**
   ```bash
   # Add to .env
   JWT_SECRET=your-secure-secret-min-32-chars
   REDIS_URL=redis://localhost:6379
   ```

3. **Update Authentication Middleware**
   ```javascript
   // Import new middleware
   const { authMiddleware } = require('./middleware/auth');
   
   // Use in routes
   app.use('/api/protected', authMiddleware);
   ```

4. **Update Frontend Logout**
   ```javascript
   // Include refresh token in logout
   const logout = async () => {
     await fetch('/api/auth/logout', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${accessToken}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ refreshToken })
     });
   };
   ```

This comprehensive security implementation provides robust protection against common JWT vulnerabilities while maintaining ease of use and performance.