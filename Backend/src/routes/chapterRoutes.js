const express = require('express');
const router = express.Router();
const {
    addChapter,
    getChaptersByStory,
    getChapterByStoryAndNumber,
    getChapterDetail,
} = require('../controllers/chapterController');

const chapterController = require('../controllers/chapterController');

const verifyToken = require('../middlewares/authMiddleware');

// List chapter by story/book id (supports pagination via query page/limit).
router.get('/story/:storyId', getChaptersByStory);

// Read chapter by chapter number in a story/book.
router.get('/story/:storyId/chapter/:chapterNumber', getChapterByStoryAndNumber);

// Read chapter by chapter document id.
router.get('/:id', getChapterDetail);

// Add/update chapter (requires login).
router.post('/', verifyToken, addChapter);

router.put('/:id', chapterController.updateChapter); // Khai báo route sửa chương
router.delete('/', chapterController.deleteChapters); // Khai báo route xóa hàng loạt chương

module.exports = router;
