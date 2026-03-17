// models/Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true,
        index: 'text'
    },
    title_no_diacritics: {
        type: String,
        trim: true,
        index: 'text'
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    genres: {
        type: [String],
        default: []
    },
    // URL ảnh bìa lấy từ Supabase Storage.
    cover_url: {
        type: String,
        default: '',
        trim: true
    },
    crawler_source_url: {
        type: String,
        default: '',
        trim: true
    },
    uploader_id: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Đang cập nhật', 'Hoàn thành', 'Tạm dừng', 'Hết', 'completed', 'on-going', 'dropped'],
        default: 'Đang cập nhật'
    },
    total_chapters: {
        type: Number,
        default: 0
    },
    total_views: {
        type: Number,
        default: 0
    },
    weekly_views: {
        type: Number,
        default: 0
    },
    weekly_views_start: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Pre-save middleware to automatically generate title_no_diacritics
bookSchema.pre('save', function(next) {
    if (this.title && this.isModified('title')) {
        this.title_no_diacritics = this.title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, (match) => match === 'đ' ? 'd' : 'D');
    }
    next();
});

bookSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update.title) {
        update.title_no_diacritics = update.title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, (match) => match === 'đ' ? 'd' : 'D');
    }
    next();
});

bookSchema.index({ updatedAt: -1 });
bookSchema.index({ weekly_views_start: -1, weekly_views: -1, total_views: -1 });
bookSchema.index({ genres: 1 });
bookSchema.index({ status: 1 });

module.exports = mongoose.model('Book', bookSchema);
