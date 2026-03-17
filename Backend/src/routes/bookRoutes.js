const express = require('express');
const router = express.Router();
const {
    getBooks,
    getHotBooksWeekly,
    getBookById,
    createBook,
    uploadBookCover,
    getBookSuggestions,
    getBooksAdvancedSearch
} = require('../controllers/bookController');

// Danh sach truyen (co kem 2 chapter moi nhat cho moi truyen)
router.get('/', getBooks);

// Top truyện hot trong tuần (tối đa 10)
router.get('/hot-weekly', getHotBooksWeekly);

// Gợi ý tìm kiếm
router.get('/suggestions', getBookSuggestions);

// Tìm kiếm nâng cao
router.get('/search-advanced', getBooksAdvancedSearch);

// Upload anh bia
router.post('/upload-cover', uploadBookCover);

// Chi tiet truyen
router.get('/:id', getBookById);

// Tao truyen moi
router.post('/', createBook);

module.exports = router;
