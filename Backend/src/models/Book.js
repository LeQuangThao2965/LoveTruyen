// models/Book.js
import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
    // MongoDB sẽ tự động tạo _id duy nhất cho mỗi truyện
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    author: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String 
    },
    uploader_id: { 
        type: String, // Lưu ID của Host/Admin từ Supabase Auth
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Đang cập nhật', 'Hoàn thành', 'Tạm hoãn'], 
        default: 'Đang cập nhật' 
    },
    total_chapters: { 
        type: Number, 
        default: 0 // Tự động tăng khi thêm chương mới
    }
}, { 
    // Tự động sinh ra 2 cột: createdAt (Ngày đăng truyện) và updatedAt (Ngày có chương mới nhất)
    timestamps: true 
});

export default mongoose.model('Book', bookSchema);