const Tenant = require('../models/tenants/Tenant');
const logger = require('../utils/logger');

/**
 * Enhanced Tenant Context Middleware
 * Ensures proper tenant isolation and data filtering
 */
const tenantContextMiddleware = async (req, res, next) => {
  try {
    // Extract tenant identifier from multiple sources
    const tenantId = req.headers['x-tenant-id'] || 
                    req.query.tenantId || 
                    req.body.tenantId ||
                    (req.user && req.user.tenantId);

    if (!tenantId) {
      return res.status(400).json({ 
        error: 'Tenant ID required',
        code: 'TENANT_ID_MISSING'
      });
    }

    // Validate tenant exists and is active
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      return res.status(404).json({ 
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND'
      });
    }

    if (!tenant.isActive) {
      return res.status(403).json({ 
        error: 'Tenant is inactive',
        code: 'TENANT_INACTIVE'
      });
    }

    // Set tenant context for the request
    req.tenantContext = {
      tenantId: tenant._id,
      tenantLevel: tenant.level,
      tenantName: tenant.name,
      parentId: tenant.parent,
      isActive: tenant.isActive,
      settings: tenant.settings || {}
    };

    // Add tenant filter to query context
    req.tenantFilter = { tenantId: tenant._id };

    // Log tenant access for audit
    logger.info(`Tenant access: ${tenant.name} (${tenant._id}) by user: ${req.user?.id || 'anonymous'}`);

    next();
  } catch (error) {
    logger.error('Tenant context middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'TENANT_CONTEXT_ERROR'
    });
  }
};

/**
 * Tenant Data Filtering Helper
 * Automatically adds tenant filter to database queries
 */
const withTenantFilter = (query, tenantId) => {
  if (!tenantId) {
    throw new Error('Tenant ID is required for data filtering');
  }
  
  if (typeof query === 'object' && query.tenantId === undefined) {
    query.tenantId = tenantId;
  }
  
  return query;
};

/**
 * Tenant Isolation Decorator
 * Ensures data is properly isolated by tenant
 */
const ensureTenantIsolation = (req, res, next) => {
  if (!req.tenantContext) {
    return res.status(400).json({ 
      error: 'Tenant context not found',
      code: 'TENANT_CONTEXT_MISSING'
    });
  }

  // Ensure all database operations include tenant filter
  req.ensureTenantFilter = (query) => {
    return withTenantFilter(query, req.tenantContext.tenantId);
  };

  next();
};

module.exports = {
  tenantContextMiddleware,
  withTenantFilter,
  ensureTenantIsolation
}; 