// Backend/src/routes/ttsRoutes.js
const express = require('express');
const router = express.createElement ? express.createElement() : express.Router();
const ttsController = require('../controllers/ttsController');

// Mở endpoint GET /api/tts/chapter/:id
router.get('/chapter/:id', ttsController.getChapterAudio);

module.exports = router;