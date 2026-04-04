const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');

// IMPORT MIDDLEWARE XÁC THỰC CỦA BRO VÀO ĐÂY
// (Tùy project bro đặt tên là gì, ví dụ: verifyToken, authMiddleware...)
const verifyToken = require('../middlewares/authMiddleware');

console.log("Check Auth Middleware:", verifyToken);
console.log("Check Controller:", favoriteController.toggleFavorite);

// 1. Thêm/Bỏ theo dõi (Cần đăng nhập)
router.post('/toggle', verifyToken, favoriteController.toggleFavorite);

// 2. Kiểm tra trạng thái lúc load trang chi tiết (Cần đăng nhập)
router.get('/check/:bookId', verifyToken, favoriteController.checkStatus);

// 3. Lấy danh sách tủ sách cho trang cá nhân (Cần đăng nhập)
router.get('/my-list', verifyToken, favoriteController.getMyFavorites);

module.exports = router;