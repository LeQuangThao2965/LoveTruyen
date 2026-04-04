const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    // user_id dạng String vì bro đang dùng Supabase Auth (trả về UUID)
    user_id: {
        type: String,
        required: true,
        index: true // Đánh index để truy vấn nhanh tủ sách của 1 user
    },
    // book_id liên kết với collection 'books'
    book_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    }
}, {
    timestamps: true // Tự động có createdAt để biết ngày bấm theo dõi
});

// RÀNG BUỘC QUAN TRỌNG: Đảm bảo 1 user chỉ được theo dõi 1 truyện 1 lần (Chống spam click)
favoriteSchema.index({ user_id: 1, book_id: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);