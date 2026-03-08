const express = require('express');
const router = express.Router();
const { getBooks, createBook, uploadBookCover } = require('../controllers/bookController');

// Danh sach truyen (co kem 2 chapter moi nhat cho moi truyen)
router.get('/', getBooks);

// Upload anh bia
router.post('/upload-cover', uploadBookCover);

// Tao truyen moi
router.post('/', createBook);

module.exports = router;
