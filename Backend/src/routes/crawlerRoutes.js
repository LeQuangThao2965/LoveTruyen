const express = require('express');
const router = express.Router();
const { runLatestBookCrawl } = require('../controllers/crawlerController');

// Trigger thu cong tu browser/Postman.
router.get('/run-latest', runLatestBookCrawl);
router.post('/run-latest', runLatestBookCrawl);

module.exports = router;
