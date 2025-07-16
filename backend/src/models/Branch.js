const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['main', 'sub', 'virtual'],
    default: 'sub'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  contact: {
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    phone: String,
    email: String,
    fax: String,
    website: String
  },
  location: {
    latitude: Number,
    longitude: Number,
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  staff: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    position: String,
    permissions: [String],
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  }],
  operatingHours: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    isOpen: {
      type: Boolean,
      default: true
    },
    openTime: String,
    closeTime: String,
    breakTime: {
      start: String,
      end: String
    }
  }],
  services: [{
    name: String,
    description: String,
    fee: Number,
    currency: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  currencies: [{
    code: String,
    name: String,
    buyRate: Number,
    sellRate: Number,
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdated: Date
  }],
  cashLimits: {
    dailyLimit: {
      type: Number,
      default: 1000000
    },
    weeklyLimit: {
      type: Number,
      default: 7000000
    },
    monthlyLimit: {
      type: Number,
      default: 30000000
    }
  },
  settings: {
    allowP2P: {
      type: Boolean,
      default: true
    },
    allowRemittance: {
      type: Boolean,
      default: true
    },
    allowCryptoTrading: {
      type: Boolean,
      default: false
    },
    autoApproveTransactions: {
      type: Boolean,
      default: false
    },
    maxTransactionAmount: {
      type: Number,
      default: 100000
    },
    requireDocumentation: {
      type: Boolean,
      default: true
    },
    kycRequired: {
      type: Boolean,
      default: true
    }
  },
  statistics: {
    totalCustomers: {
      type: Number,
      default: 0
    },
    totalTransactions: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: Number,
      default: 0
    },
    lastTransactionDate: Date
  },
  documents: [{
    type: String,
    name: String,
    filePath: String,
    uploadedAt: Date,
    expiryDate: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  parentBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  childBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
branchSchema.index({ tenantId: 1, status: 1 });
branchSchema.index({ code: 1 });
branchSchema.index({ 'contact.city': 1 });
branchSchema.index({ manager: 1 });

// Virtual for full address
branchSchema.virtual('fullAddress').get(function() {
  const addr = this.contact.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.postalCode}, ${addr.country}`;
});

// Pre-save middleware
branchSchema.pre('save', function(next) {
  // Auto-generate branch code if not provided
  if (!this.code) {
    this.code = this.name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4);
  }
  next();
});

module.exports = mongoose.model('Branch', branchSchema);
