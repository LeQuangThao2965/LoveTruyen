// Backend/src/services/tts.service.js
const fs = require('fs');
const path = require('path');
const googleTTS = require('google-tts-api'); // 🚀 Vũ khí bí mật siêu trâu bò

exports.generateChapterAudio = async (chapter) => {
    try {
        if (!chapter || !chapter.content) throw new Error("Chương truyện rỗng");

        // Lột HTML như cũ
        let text = chapter.content
            .replace(/<br\s*\/?>/gi, '. ')
            .replace(/<\/p>/gi, '. ')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (text.length === 0) throw new Error("Truyện không còn chữ.");

        const audioDir = path.resolve(__dirname, '../../public/audio');
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

        // TÊN FILE
        const fileName = `chapter_${chapter._id}.mp3`;
        const finalFilePath = path.join(audioDir, fileName);

        // NẾU CÓ FILE RỒI THÌ LẤY XÀI LUÔN
        if (fs.existsSync(finalFilePath)) {
            return { url: `/audio/${fileName}` };
        }

        console.log(`\n======================================`);
        console.log(`🚀 ĐANG GỌI CHỊ GOOGLE TẠO AUDIO CHƯƠNG ${chapter.chapter_number}...`);
        
        // CÔNG NGHỆ LÕI: Google tự băm nhỏ, tự lấy Base64 cực nhanh
        const results = await googleTTS.getAllAudioBase64(text, {
            lang: 'vi',
            slow: false,
            host: 'https://translate.google.com',
            splitPunct: ',.?!' // Tự động ngắt nhịp ở dấu câu
        });

        // Mở file và ghi toàn bộ dữ liệu vào 1 file duy nhất
        const fileStream = fs.createWriteStream(finalFilePath);
        for (const item of results) {
            // Chuyển mã Base64 thành âm thanh thật
            const buffer = Buffer.from(item.base64, 'base64');
            fileStream.write(buffer);
        }
        fileStream.end();

        // Đợi file ghi xong
        await new Promise(resolve => fileStream.on('finish', resolve));

        const stats = fs.statSync(finalFilePath);
        console.log(`🎉 HOÀN TẤT TỐC ĐỘ ÁNH SÁNG! File: ${fileName} (${stats.size} bytes)`);
        console.log(`======================================\n`);
        
        return { url: `/audio/${fileName}` };

    } catch (error) {
        console.error("🔴 [LỖI GOOGLE TTS]:", error.message || error);
        throw error; 
    }
};