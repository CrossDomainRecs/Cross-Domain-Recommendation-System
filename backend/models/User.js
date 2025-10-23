const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
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
        required: true,
        minlength: 6,
        select: false
    },
    profilePicture: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    preferences: {
        domains: {
            type: [String],
            default: ['movies', 'books', 'music']
        },
        favorite_genres: {
            type: [String],
            default: []
        },
        user_selected_genres: {
            type: [String],
            default: []
        },
        drl_learned_genres: {
            type: [String],
            default: []
        },
        genre_weights: {
            type: Map,
            of: Number,
            default: {}
        },
        liked_items: [{
            item_id: String,
            title: String,
            domain: String,
            isFavorite: { type: Boolean, default: false },
            timestamp: { type: Date, default: Date.now }
        }],
        disliked_items: [{
            item_id: String,
            title: String,
            domain: String,
            timestamp: { type: Date, default: Date.now }
        }]
    },
    permissions: {
        type: [String],
        default: []
    },
    subscription: {
        type: {
            type: String,
            enum: ['free', 'premium', 'enterprise'],
            default: 'free'
        },
        expiresAt: Date
    }
}, {
    timestamps: true
});

// 🔒 Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 🔑 Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// 🚫 Remove password from JSON output (double protection)
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);