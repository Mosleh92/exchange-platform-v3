const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens']
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    maxUsers: {
      type: Number,
      default: 100
    },
    maxStorage: {
      type: Number,
      default: 1073741824 // 1GB in bytes
    },
    allowedFeatures: [{
      type: String,
      enum: ['p2p_trading', 'document_management', 'reporting', 'api_access', 'multi_currency']
    }],
    theme: {
      primaryColor: {
        type: String,
        default: '#007bff'
      },
      secondaryColor: {
        type: String,
        default: '#6c757d'
      },
      logo: String,
      favicon: String
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  contact: {
    email: {
      type: String,
      required: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
tenantSchema.index({ subdomain: 1 });
tenantSchema.index({ isActive: 1 });
tenantSchema.index({ 'subscription.plan': 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
