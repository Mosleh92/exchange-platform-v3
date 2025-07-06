const Role = require('../models/Role');

const RoleService = {
  /**
   * Create a new role (business logic only)
   */
  async createRole({ tenantId, roleData }) {
    const role = new Role({ ...roleData, tenantId });
    await role.save();
    return role;
  },

  /**
   * Update an existing role
   */
  async updateRole({ roleId, tenantId, updateData }) {
    const role = await Role.findOneAndUpdate({ _id: roleId, tenantId }, updateData, { new: true });
    if (!role) throw new Error('نقش یافت نشد');
    return role;
  },

  /**
   * Delete a role
   */
  async deleteRole({ roleId, tenantId }) {
    const role = await Role.findOneAndDelete({ _id: roleId, tenantId });
    if (!role) throw new Error('نقش یافت نشد');
    return role;
  },

  /**
   * Get a role by ID
   */
  async getRoleById({ roleId, tenantId }) {
    const role = await Role.findOne({ _id: roleId, tenantId });
    if (!role) throw new Error('نقش یافت نشد');
    return role;
  },

  /**
   * Get all roles (with pagination and filters)
   */
  async getRoles({ tenantId, page = 1, limit = 10 }) {
    const query = { tenantId };
    const roles = await Role.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Role.countDocuments(query);
    return {
      roles,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  },

  /**
   * Assign permissions to a role
   */
  async assignPermissions({ roleId, tenantId, permissions }) {
    const role = await Role.findOneAndUpdate({ _id: roleId, tenantId }, { permissions }, { new: true });
    if (!role) throw new Error('نقش یافت نشد');
    return role;
  }
};

module.exports = RoleService; 