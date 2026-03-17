const express = require('express');
const router = express.Router();
const {
    getBooks,
    searchBooks,
    getHotBooksWeekly,
    getBookById,
    createBook,
    uploadBookCover
} = require('../controllers/bookController');

// Danh sach truyen (co kem 2 chapter moi nhat cho moi truyen)
router.get('/', getBooks);

// Tìm kiếm truyện nâng cao
router.get('/search', searchBooks);

// Top truyện hot trong tuần (tối đa 10)
router.get('/hot-weekly', getHotBooksWeekly);

// Upload anh bia
router.post('/upload-cover', uploadBookCover);

// Chi tiet truyen
router.get('/:id', getBookById);

// Tao truyen moi
router.post('/', createBook);

module.exports = router;
