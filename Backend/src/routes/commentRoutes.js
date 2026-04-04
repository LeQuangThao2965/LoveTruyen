const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const verifyToken = require('../middlewares/authMiddleware');

// Lấy danh sách bình luận (Public)
router.get('/', commentController.getComments);

// Đăng bình luận mới (Cần đăng nhập)
router.post('/', verifyToken, commentController.createComment);

module.exports = router;