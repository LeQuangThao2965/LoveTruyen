// models/Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
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
        enum: ['Đang cập nhật', 'Hoàn thành', 'Tạm hoãn'],
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

bookSchema.index({ updatedAt: -1 });
bookSchema.index({ weekly_views_start: -1, weekly_views: -1, total_views: -1 });
bookSchema.index({ genres: 1 });
// Text index cho tìm kiếm full-text (title, author, description)
bookSchema.index({ 
    title: 'text', 
    author: 'text', 
    description: 'text' 
}, {
    weights: {
        title: 10,
        author: 5,
        description: 1
    },
    name: 'book_text_index'
});

module.exports = mongoose.model('Book', bookSchema);
