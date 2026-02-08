const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Vui lòng nhập tên truyện'], 
        trim: true,
        index: true // Đánh index để tìm kiếm tên truyện cho nhanh
    },
    author: { 
        type: String, 
        default: 'Sưu tầm' 
    },
    description: { 
        type: String 
    },
    coverImage: { 
        type: String, 
        default: 'https://via.placeholder.com/300x400?text=No+Cover' // Ảnh mặc định nếu lười up
    },
    categories: {
        type: [String], // Mảng các thể loại. VD: ['Tiên Hiệp', 'Huyền Huyễn']
        index: true // Để sau này lọc truyện theo thể loại cực nhanh
    },
    status: {
        type: String,
        enum: ['on-going', 'completed', 'dropped'], // Chỉ chấp nhận 3 trạng thái này
        default: 'on-going'
    },
    uploader: {
        type: String, // Lưu Supabase ID của người đăng truyện (để biết ai là chủ)
        required: true
    },
    stats: { // Gom nhóm thống kê lại cho gọn
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        rating: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 }
    },
    latestChapter: { // Cache lại chương mới nhất để hiện ra ngoài trang chủ đỡ phải query bảng Chapter
        title: String,
        number: Number,
        updatedAt: Date
    }
}, { timestamps: true });

// Tạo index văn bản để hỗ trợ chức năng "Tìm kiếm truyện" sau này
storySchema.index({ title: 'text', author: 'text' });

module.exports = mongoose.model('Story', storySchema);