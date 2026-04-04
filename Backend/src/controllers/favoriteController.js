const Favorite = require('../models/Favorite');

const favoriteController = {
    // 1. Nút bấm Toggle (Thêm/Bỏ theo dõi)
    toggleFavorite: async (req, res) => {
        try {
            const { bookId } = req.body;
            const userId = req.user.id; // Lấy từ middleware verify token Supabase

            // Kiểm tra xem đã theo dõi chưa
            const existingFav = await Favorite.findOne({ user_id: userId, book_id: bookId });

            if (existingFav) {
                // Nếu có rồi -> Bỏ theo dõi (Xóa khỏi DB)
                await Favorite.findByIdAndDelete(existingFav._id);
                return res.status(200).json({ isFavorited: false, message: 'Đã bỏ theo dõi' });
            } else {
                // Nếu chưa có -> Thêm vào tủ sách
                await Favorite.create({ user_id: userId, book_id: bookId });
                return res.status(201).json({ isFavorited: true, message: 'Đã thêm vào tủ sách' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    },

    // 2. Kiểm tra trạng thái lúc load trang BookDetail
    checkStatus: async (req, res) => {
        try {
            const { bookId } = req.params;
            const userId = req.user.id;
            const existingFav = await Favorite.findOne({ user_id: userId, book_id: bookId });

            res.status(200).json({ isFavorited: !!existingFav });
        } catch (error) {
            res.status(500).json({ isFavorited: false });
        }
    },

    //hàm mới
    // Thêm vào trong favoriteController
    getMyFavorites: async (req, res) => {
        try {
            const userId = req.user.id;
            // Lấy danh sách + populate thông tin sách
            const favorites = await Favorite.find({ user_id: userId })
                .populate('book_id', 'title author cover_url slug') // Lấy các field cần thiết
                .sort({ createdAt: -1 }); // Mới nhất lên đầu

            res.status(200).json(favorites);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi lấy danh sách', error: error.message });
        }
    }
};

module.exports = favoriteController;