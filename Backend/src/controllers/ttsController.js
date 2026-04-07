// Backend/src/controllers/ttsController.js
const Chapter = require('../models/Chapter');
const ttsService = require('../services/tts.service');

exports.getChapterAudio = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Tìm chương truyện trong Database
        const chapter = await Chapter.findById(id);
        if (!chapter) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chương truyện.' });
        }

        // 2. Gọi Service tạo file Audio
        const audioResult = await ttsService.generateChapterAudio(chapter);

        // 3. Trả URL về cho Frontend
        return res.status(200).json(audioResult);

    } catch (error) {
        console.error('Lỗi API TTS:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi tạo âm thanh.' });
    }
};