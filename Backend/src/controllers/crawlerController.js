const axios = require('axios');
const cheerio = require('cheerio'); // Thư viện giống jQuery để bóc HTML

exports.crawlChapter = async (req, res) => {
    const { url } = req.body; // Link chương truyện cần tải
    try {
        // 1. Tải HTML
        const { data } = await axios.get(url);
        
        // 2. Load vào Cheerio
        const $ = cheerio.load(data);
        
        // 3. Bóc tách (Phải F12 trang gốc để xem class của nó là gì)
        // Ví dụ: title nằm trong thẻ .chapter-title, nội dung nằm trong .chapter-c
        const title = $('.chapter-title').text().trim();
        const content = $('.chapter-c').html(); // Lấy HTML để giữ định dạng xuống dòng

        res.json({ success: true, data: { title, content } });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi tải truyện: " + error.message });
    }
};