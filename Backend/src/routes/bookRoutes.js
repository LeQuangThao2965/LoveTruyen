const express = require('express');
const router = express.Router();
const {
    getBooks,
    getHotBooksWeekly,
    getBookById,
    createBook,
    uploadBookCover,
    deleteBook
} = require('../controllers/bookController');

const bookController = require('../controllers/bookController');

// Danh sach truyen (co kem 2 chapter moi nhat cho moi truyen)
router.get('/', getBooks);

// Top truyện hot trong tuần (tối đa 10)
router.get('/hot-weekly', getHotBooksWeekly);

// Upload anh bia
router.post('/upload-cover', uploadBookCover);

// Chi tiet truyen
router.get('/:id', getBookById);

// Tao truyen moi
router.post('/', createBook);

// Khai báo route sửa truyện
router.put('/:id', bookController.updateBook); 

router.delete('/:id', deleteBook);

module.exports = router;
