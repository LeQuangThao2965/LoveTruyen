const express = require('express');
const router = express.Router();
const { getStories, createStory, getStoryById } = require('../controllers/truyenController');
const verifyToken = require('../middlewares/authMiddleware'); // Bảo vệ route

// Ai cũng xem được danh sách truyện
router.get('/', getStories);

// Ai cũng xem được chi tiết truyện
router.get('/:id', getStoryById);

// CHỈ User đã đăng nhập mới được đăng truyện
router.post('/', verifyToken, createStory);

module.exports = router;