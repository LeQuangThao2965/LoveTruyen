// models/Chapter.js
import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    // Khóa ngoại (Tham chiếu đến _id của bảng Book)
    book_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book', 
        required: true 
    },
    chapter_number: { 
        type: Number, 
        required: true 
    },
    title: { 
        type: String, 
        required: true // Ví dụ: "Chương 1: Xuyên không"
    },
    content: { 
        type: String, 
        required: true // Chứa nội dung toàn bộ văn bản của chương
    }
}, { 
    // createdAt ở đây chính là thời gian đăng của riêng chương này (update-date như bạn gọi)
    timestamps: true 
});

// Tạo Index để truy vấn nhanh danh sách chương của một bộ truyện
chapterSchema.index({ book_id: 1, chapter_number: 1 });

export default mongoose.model('Chapter', chapterSchema);