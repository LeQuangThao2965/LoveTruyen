const express = require('express');
const router = express.Router();
const { runLatestBookCrawl, importStoryWithChapters } = require('../controllers/crawlerController');

// Trigger thu cong tu browser/Postman.
router.get('/run-latest', runLatestBookCrawl);
router.post('/run-latest', runLatestBookCrawl);
router.post('/import-story', importStoryWithChapters);

module.exports = router;
