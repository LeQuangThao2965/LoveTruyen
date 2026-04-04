// Backend/src/models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    bookId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book', 
        required: true 
    },
    // chapterId dùng kiểu String hoặc Number để lưu chapter_number (có thể null nếu bình luận ở ngoài trang truyện)
    chapterId: { 
        type: String, 
        default: null 
    },
    userId: { 
        type: String, 
        required: true,
        index: true // Đánh index để truy vấn nhanh
    },
    content: { 
        type: String, 
        required: true, 
        maxlength: 600 
    }
}, { 
    timestamps: true // Tự động tạo createdAt và updatedAt để lọc và xếp hạng sau này
});

// Đánh index cho việc lấy bình luận theo truyện/chương (sort mới nhất)
commentSchema.index({ bookId: 1, chapterId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);