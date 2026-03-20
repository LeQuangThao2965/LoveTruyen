// Backend/src/models/UserProfile.js
const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    supabaseId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        required: true
    },
    username: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'banned'],
        default: 'active'
    },
    banReason: {
        type: String,
        default: null
    },
    bannedAt: {
        type: Date,
        default: null
    },
    bannedBy: {
        type: String,
        default: null
    },
    isMuted: {
        type: Boolean,
        default: false
    },
    muteReason: {
        type: String,
        default: null
    },
    mutedAt: {
        type: Date,
        default: null
    },
    mutedBy: {
        type: String,
        default: null
    },
    muteUntil: {
        type: Date,
        default: null
    },
    coins: {
        type: Number,
        default: 0
    },
    validTokens: [{
        type: String
    }]
}, { timestamps: true });

// Virtuals
userProfileSchema.virtual('libraryCount', {
    ref: 'User',
    localField: 'supabaseId',
    foreignField: 'supabaseId',
    count: true
});

userProfileSchema.virtual('readingHistoryCount', {
    ref: 'User',
    localField: 'supabaseId',
    foreignField: 'supabaseId',
    count: true
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
