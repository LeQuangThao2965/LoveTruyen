const express = require('express');
const router = express.Router();
const { addChapter, getChaptersByStory, getChapterDetail } = require('../controllers/chapterController');
const verifyToken = require('../middlewares/authMiddleware');

router.get('/story/:storyId', getChaptersByStory); // Lấy list chương
router.get('/:id', getChapterDetail); // Đọc chương
router.post('/', verifyToken, addChapter); // Thêm chương (Cần Admin/Uploader)

module.exports = router;