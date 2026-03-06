const express = require('express');
const router = express.Router();
const { getBooks, createBook } = require('../controllers/bookController');

// Danh sach truyen (co kem 2 chapter moi nhat cho moi truyen)
router.get('/', getBooks);

// Tao truyen moi
router.post('/', createBook);

module.exports = router;

