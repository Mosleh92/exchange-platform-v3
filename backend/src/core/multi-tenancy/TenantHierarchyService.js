const Tenant = require('../../models/tenants/Tenant');
const User = require('../../models/User');
const logger = require('../../utils/logger');

/**
 * Tenant Hierarchy Service
 * Manages multi-level tenant relationships and access control
 */
class TenantHierarchyService {
  constructor() {
    this.hierarchyLevels = {
      SUPER_ADMIN: 0,
      EXCHANGE: 1,
      BRANCH: 2,
      USER: 3
    };
  }

  /**
   * Validate tenant hierarchy access
   */
  async validateHierarchyAccess(userId, targetTenantId, action = 'read') {
    try {
      const user = await User.findById(userId).populate('tenantId');
      if (!user) {
        throw new Error('User not found');
      }

      const userTenant = user.tenantId;
      const targetTenant = await Tenant.findById(targetTenantId);

      if (!targetTenant) {
        throw new Error('Target tenant not found');
      }

      // Super admin has access to all tenants
      if (user.role === 'super_admin') {
        return { hasAccess: true, level: 'super_admin' };
      }

      // Check hierarchy levels
      const accessResult = await this.checkHierarchyLevel(userTenant, targetTenant, action);
      
      logger.info('Hierarchy access validation', {
        userId,
        userTenantId: userTenant?._id,
        targetTenantId,
        action,
        hasAccess: accessResult.hasAccess,
        level: accessResult.level
      });

      return accessResult;
    } catch (error) {
      logger.error('Hierarchy access validation error:', error);
      throw error;
    }
  }

  /**
   * Check hierarchy level access
   */
  async checkHierarchyLevel(userTenant, targetTenant, action) {
    // Same tenant access
    if (userTenant._id.toString() === targetTenant._id.toString()) {
      return { hasAccess: true, level: 'same_tenant' };
    }

    // Parent-child relationship check
    const isParent = await this.isParentTenant(userTenant._id, targetTenant._id);
    if (isParent) {
      return { hasAccess: true, level: 'parent' };
    }

    // Child-parent relationship check (for read operations)
    if (action === 'read') {
      const isChild = await this.isChildTenant(userTenant._id, targetTenant._id);
      if (isChild) {
        return { hasAccess: true, level: 'child' };
      }
    }

    return { hasAccess: false, level: 'no_access' };
  }

  /**
   * Check if tenant A is parent of tenant B
   */
  async isParentTenant(parentId, childId) {
    const child = await Tenant.findById(childId);
    if (!child) return false;

    // Check direct parent
    if (child.parent && child.parent.toString() === parentId.toString()) {
      return true;
    }

    // Check ancestor chain
    let currentParent = child.parent;
    while (currentParent) {
      if (currentParent.toString() === parentId.toString()) {
        return true;
      }
      const parentTenant = await Tenant.findById(currentParent);
      if (!parentTenant) break;
      currentParent = parentTenant.parent;
    }

    return false;
  }

  /**
   * Check if tenant A is child of tenant B
   */
  async isChildTenant(childId, parentId) {
    return this.isParentTenant(parentId, childId);
  }

  /**
   * Get all accessible tenants for a user
   */
  async getAccessibleTenants(userId) {
    try {
      const user = await User.findById(userId).populate('tenantId');
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role === 'super_admin') {
        // Super admin can access all tenants
        return await Tenant.find({ isActive: true });
      }

      const userTenant = user.tenantId;
      if (!userTenant) {
        return [];
      }

      // Get all child tenants
      const childTenants = await this.getAllChildTenants(userTenant._id);
      
      // Include user's own tenant
      const accessibleTenants = [userTenant, ...childTenants];

      logger.info('Get accessible tenants', {
        userId,
        tenantCount: accessibleTenants.length,
        userRole: user.role
      });

      return accessibleTenants;
    } catch (error) {
      logger.error('Get accessible tenants error:', error);
      throw error;
    }
  }

  /**
   * Get all child tenants recursively
   */
  async getAllChildTenants(parentId) {
    const children = await Tenant.find({ 
      parent: parentId, 
      isActive: true 
    });

    const allChildren = [...children];

    // Recursively get grandchildren
    for (const child of children) {
      const grandchildren = await this.getAllChildTenants(child._id);
      allChildren.push(...grandchildren);
    }

    return allChildren;
  }

  /**
   * Create tenant hierarchy
   */
  async createTenantHierarchy(tenantData) {
    try {
      const { name, level, parentId, ownerId } = tenantData;

      // Validate parent if provided
      if (parentId) {
        const parent = await Tenant.findById(parentId);
        if (!parent) {
          throw new Error('Parent tenant not found');
        }

        // Validate hierarchy level
        if (level <= parent.level) {
          throw new Error('Invalid hierarchy level');
        }
      }

      const tenant = new Tenant({
        name,
        level,
        parent: parentId,
        owner: ownerId,
        isActive: true,
        createdAt: new Date()
      });

      await tenant.save();

      logger.info('Tenant hierarchy created', {
        tenantId: tenant._id,
        name,
        level,
        parentId
      });

      return tenant;
    } catch (error) {
      logger.error('Create tenant hierarchy error:', error);
      throw error;
    }
  }

  /**
   * Update tenant hierarchy
   */
  async updateTenantHierarchy(tenantId, updateData) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Validate parent change
      if (updateData.parentId && updateData.parentId !== tenant.parent?.toString()) {
        const newParent = await Tenant.findById(updateData.parentId);
        if (!newParent) {
          throw new Error('New parent tenant not found');
        }

        // Prevent circular reference
        if (await this.isParentTenant(tenantId, updateData.parentId)) {
          throw new Error('Circular reference detected');
        }

        // Validate hierarchy level
        if (tenant.level <= newParent.level) {
          throw new Error('Invalid hierarchy level');
        }
      }

      Object.assign(tenant, updateData);
      await tenant.save();

      logger.info('Tenant hierarchy updated', {
        tenantId,
        updates: updateData
      });

      return tenant;
    } catch (error) {
      logger.error('Update tenant hierarchy error:', error);
      throw error;
    }
  }

  /**
   * Delete tenant hierarchy (with children)
   */
  async deleteTenantHierarchy(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get all child tenants
      const children = await this.getAllChildTenants(tenantId);

      // Deactivate all children first
      for (const child of children) {
        child.isActive = false;
        await child.save();
      }

      // Deactivate the tenant
      tenant.isActive = false;
      await tenant.save();

      logger.info('Tenant hierarchy deleted', {
        tenantId,
        childrenCount: children.length
      });

      return { deletedTenant: tenant, deletedChildren: children };
    } catch (error) {
      logger.error('Delete tenant hierarchy error:', error);
      throw error;
    }
  }

  /**
   * Get tenant hierarchy tree
   */
  async getTenantHierarchyTree(rootTenantId = null) {
    try {
      let rootTenants;
      
      if (rootTenantId) {
        const root = await Tenant.findById(rootTenantId);
        if (!root) {
          throw new Error('Root tenant not found');
        }
        rootTenants = [root];
      } else {
        // Get all root tenants (no parent)
        rootTenants = await Tenant.find({ 
          parent: null, 
          isActive: true 
        });
      }

      const buildTree = async (tenant) => {
        const children = await Tenant.find({ 
          parent: tenant._id, 
          isActive: true 
        });

        return {
          ...tenant.toObject(),
          children: await Promise.all(children.map(child => buildTree(child)))
        };
      };

      const tree = await Promise.all(rootTenants.map(tenant => buildTree(tenant)));

      return tree;
    } catch (error) {
      logger.error('Get tenant hierarchy tree error:', error);
      throw error;
    }
  }

  /**
   * Validate user access to specific tenant
   */
  async validateUserTenantAccess(userId, tenantId) {
    try {
      const user = await User.findById(userId).populate('tenantId');
      if (!user) {
        return { hasAccess: false, reason: 'User not found' };
      }

      // Super admin has access to all tenants
      if (user.role === 'super_admin') {
        return { hasAccess: true, level: 'super_admin' };
      }

      // Check if user belongs to the tenant
      if (user.tenantId && user.tenantId._id.toString() === tenantId.toString()) {
        return { hasAccess: true, level: 'same_tenant' };
      }

      // Check hierarchy access
      const hierarchyAccess = await this.validateHierarchyAccess(userId, tenantId);
      
      return {
        hasAccess: hierarchyAccess.hasAccess,
        level: hierarchyAccess.level,
        reason: hierarchyAccess.hasAccess ? null : 'No hierarchy access'
      };
    } catch (error) {
      logger.error('Validate user tenant access error:', error);
      return { hasAccess: false, reason: error.message };
    }
  }
}

module.exports = new TenantHierarchyService(); 