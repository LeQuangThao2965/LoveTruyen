// Backend/src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { // Người nhận thông báo
        type: String, // Lưu Supabase ID
        required: true,
        index: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['new_chapter', 'system', 'reply'], 
        default: 'new_chapter' 
    },
    link: { type: String }, // Link để khi bấm vào sẽ chuyển trang (VD: /truyen/abc/chuong-10)
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);