const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: function() {
      // Password not required for Google OAuth users
      return !this.googleId;
    },
    select: false // Don't include in queries by default
  },
  
  // Google OAuth Integration
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  profilePicture: {
    type: String,
    default: null
  },
  
  // Enhanced Role System
  role: { 
    type: String, 
    default: 'user',
    enum: ['user', 'premium', 'admin']
  },
  
  // User Status Management
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Enhanced Preferences for Cross-Domain Recommendations
  preferences: {
    genres: [{
      type: String,
      trim: true
    }],
    domains: [{
      type: String,
      enum: ['movies', 'books', 'music'],
      default: 'movies'
    }],
    language: {
      type: String,
      default: 'en'
    }
  },
  
  // User Activity Tracking
  last_login: {
    type: Date,
    default: null
  },
  login_count: {
    type: Number,
    default: 0
  },
  
  // Permission System
  permissions: {
    can_rate: {
      type: Boolean,
      default: true
    },
    can_review: {
      type: Boolean,
      default: true
    },
    api_access: {
      type: Boolean,
      default: false  
    },
    premium_features: {
      type: Boolean,
      default: false
    }
  },
  
  // Subscription Management
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    expires_at: Date
  },
  
  created_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1, status: 1 });

// Method to check if user has specific permission
userSchema.methods.hasPermission = function(permission) {
  // Admin has all permissions
  if (this.role === 'admin') return true;
  
  // Check role-based permissions
  const rolePermissions = {
    user: ['can_rate', 'can_review'],
    premium: ['can_rate', 'can_review', 'premium_features'],
    admin: ['can_rate', 'can_review', 'premium_features', 'api_access']
  };
  
  return rolePermissions[this.role]?.includes(permission) || 
         this.permissions[permission] === true;
};

// Method to check if user can access domain
userSchema.methods.canAccessDomain = function(domain) {
  if (this.role === 'admin') return true;
  return this.preferences.domains.includes(domain);
};

// Method to update user activity
userSchema.methods.recordLogin = function() {
  this.last_login = new Date();
  this.login_count += 1;
  return this.save();
};

// Pre-save middleware to set permissions based on role
userSchema.pre('save', function(next) {
  // Set premium_features based on subscription or role
  if (this.subscription.type === 'premium' || this.role === 'premium' || this.role === 'admin') {
    this.permissions.premium_features = true;
  }
  
  // Admin gets API access
  if (this.role === 'admin') {
    this.permissions.api_access = true;
  }
  
  next();
});

module.exports = mongoose.model('User', userSchema);