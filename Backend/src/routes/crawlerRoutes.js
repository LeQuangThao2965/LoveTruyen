const express = require('express');
const router = express.Router();
const {
    runLatestBookCrawl,
    getCrawledBooks,
    importStoryWithChapters,
    importChaptersByBook
} = require('../controllers/crawlerController');

// Trigger thu cong tu browser/Postman.
router.get('/run-latest', runLatestBookCrawl);
router.post('/run-latest', runLatestBookCrawl);
router.get('/books', getCrawledBooks);
router.post('/import-story', importStoryWithChapters);
router.post('/import-chapters', importChaptersByBook);

module.exports = router;
