const mongoose = require('mongoose');

/**
 * Enhanced Tenant Model
 * Proper hierarchical tenant relationships with security
 */
const enhancedTenantSchema = new mongoose.Schema({
  // Basic tenant information
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Hierarchical level (0: Super Admin, 1: Exchange, 2: Branch, 3: User)
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
    default: 1
  },

  // Parent tenant relationship (for hierarchical structure)
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false // Root tenants have no parent
  },

  // Owner of this tenant
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Tenant configuration
  subdomain: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  // Business information
  businessName: {
    type: String,
    trim: true
  },

  businessLicense: {
    type: String,
    trim: true
  },

  // Contact information
  contactEmail: {
    type: String,
    required: true,
    trim: true
  },

  contactPhone: {
    type: String,
    trim: true
  },

  // Address information
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },

  // Financial settings
  currency: {
    type: String,
    default: 'IRR',
    enum: ['IRR', 'USD', 'EUR', 'GBP']
  },

  exchangeRates: {
    USD: { type: Number, default: 0 },
    EUR: { type: Number, default: 0 },
    GBP: { type: Number, default: 0 }
  },

  // Commission settings
  commissionRates: {
    exchange: { type: Number, default: 0.5 }, // 0.5%
    transfer: { type: Number, default: 0.3 }, // 0.3%
    p2p: { type: Number, default: 0.2 } // 0.2%
  },

  // Security settings
  securitySettings: {
    requireMFA: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 3600 }, // seconds
    maxLoginAttempts: { type: Number, default: 5 },
    passwordPolicy: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: true }
    }
  },

  // Notification settings
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },

  // API settings
  apiSettings: {
    enabled: { type: Boolean, default: false },
    rateLimit: { type: Number, default: 1000 }, // requests per hour
    webhookUrl: String,
    apiKey: String
  },

  // Status and timestamps
  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationDate: Date,

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Soft delete
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
enhancedTenantSchema.index({ parent: 1, level: 1, isActive: 1 });
enhancedTenantSchema.index({ subdomain: 1 }, { unique: true, sparse: true });
enhancedTenantSchema.index({ owner: 1, isActive: 1 });
enhancedTenantSchema.index({ level: 1, isActive: 1 });

// Virtual for child tenants
enhancedTenantSchema.virtual('children', {
  ref: 'Tenant',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for full hierarchy path
enhancedTenantSchema.virtual('hierarchyPath').get(function() {
  return this._hierarchyPath || [];
});

// Methods
enhancedTenantSchema.methods.getHierarchyPath = async function() {
  const path = [];
  let current = this;
  
  while (current) {
    path.unshift({
      id: current._id,
      name: current.name,
      level: current.level
    });
    
    if (current.parent) {
      current = await this.constructor.findById(current.parent);
    } else {
      break;
    }
  }
  
  return path;
};

enhancedTenantSchema.methods.hasChild = async function(childId) {
  const child = await this.constructor.findById(childId);
  if (!child) return false;
  
  let current = child;
  while (current.parent) {
    if (current.parent.toString() === this._id.toString()) {
      return true;
    }
    current = await this.constructor.findById(current.parent);
  }
  
  return false;
};

enhancedTenantSchema.methods.isDescendantOf = async function(ancestorId) {
  let current = this;
  
  while (current.parent) {
    if (current.parent.toString() === ancestorId.toString()) {
      return true;
    }
    current = await this.constructor.findById(current.parent);
  }
  
  return false;
};

enhancedTenantSchema.methods.getAncestors = async function() {
  const ancestors = [];
  let current = this;
  
  while (current.parent) {
    const parent = await this.constructor.findById(current.parent);
    if (parent) {
      ancestors.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }
  
  return ancestors;
};

enhancedTenantSchema.methods.getDescendants = async function() {
  const descendants = [];
  
  const findDescendants = async (tenantId) => {
    const children = await this.constructor.find({ parent: tenantId });
    for (const child of children) {
      descendants.push(child);
      await findDescendants(child._id);
    }
  };
  
  await findDescendants(this._id);
  return descendants;
};

// Static methods
enhancedTenantSchema.statics.findByHierarchy = async function(userId, userLevel) {
  const query = {};
  
  if (userLevel === 0) {
    // Super admin can see all tenants
    query.isActive = true;
  } else {
    // Other users can only see their accessible tenants
    // This would be implemented based on user's tenant access
    query.isActive = true;
  }
  
  return this.find(query).populate('parent owner');
};

enhancedTenantSchema.statics.createHierarchy = async function(tenantData) {
  const { name, level, parentId, ownerId, createdBy } = tenantData;
  
  // Validate parent if provided
  if (parentId) {
    const parent = await this.findById(parentId);
    if (!parent) {
      throw new Error('Parent tenant not found');
    }
    
    // Validate hierarchy level
    if (level <= parent.level) {
      throw new Error('Invalid hierarchy level');
    }
  }
  
  const tenant = new this({
    name,
    level,
    parent: parentId,
    owner: ownerId,
    createdBy
  });
  
  await tenant.save();
  return tenant;
};

// Pre-save middleware
enhancedTenantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-remove middleware (soft delete)
enhancedTenantSchema.pre('remove', async function(next) {
  // Check if tenant has children
  const children = await this.constructor.find({ parent: this._id });
  if (children.length > 0) {
    throw new Error('Cannot delete tenant with children');
  }
  
  // Soft delete instead of hard delete
  this.deletedAt = new Date();
  this.isActive = false;
  await this.save();
  
  next();
});

module.exports = mongoose.model('EnhancedTenant', enhancedTenantSchema); 