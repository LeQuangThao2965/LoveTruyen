// Backend/src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    supabaseId: { 
        type: String, 
        required: true, 
        unique: true, // Đây là KHÓA CHÍNH để liên kết với Supabase
        index: true   // Đánh index để tìm kiếm cho nhanh
    },
    email: { type: String, required: true }, // Lưu lại email để tiện tra cứu
    
    // Các tính năng riêng của Web Truyện (MongoDB lo hết)
    library: [{ 
        storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' }, // Link tới bảng Story sau này
        addedAt: { type: Date, default: Date.now },
        lastChapterRead: { type: String, default: '' } // VD: "Chương 10"
    }],
    
    history: [{
        storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
        readAt: { type: Date, default: Date.now },
        chapterConfig: String // Lưu cấu hình đọc (size chữ, màu nền...)
    }],
    
    // Nếu sau này muốn làm tính năng "Thích", "Theo dõi tác giả" thì thêm vào đây dễ dàng
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);