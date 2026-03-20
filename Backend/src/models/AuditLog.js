// Backend/src/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true
    },
    adminRole: {
        type: String,
        required: true
    },
    targetUserId: {
        type: String,
        required: true
    },
    targetUsername: {
        type: String
    },
    action: {
        type: String,
        enum: ['ban', 'unban', 'change_role', 'mute', 'unmute', 'force_logout'],
        required: true
    },
    reason: {
        type: String,
        default: null
    },
    previousValue: {
        type: Object,
        default: null
    },
    newValue: {
        type: Object,
        default: null
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
