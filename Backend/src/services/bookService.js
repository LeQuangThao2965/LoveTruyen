const bookService = {
    // Hàm lột bỏ thẻ HTML để lấy Plain Text cho tính năng Audio
    extractPlainText: (htmlContent) => {
        if (!htmlContent) return '';
        
        // 1. Thay thế các thẻ ngắt dòng (<br>, <p>) thành dấu chấm hoặc khoảng trắng
        // để AI biết chỗ ngắt nghỉ khi đọc
        let text = htmlContent.replace(/<br\s*\/?>/gi, '. ');
        text = text.replace(/<\/p>/gi, '. ');
        
        // 2. Lột bỏ toàn bộ các thẻ HTML còn lại (<i>, <b>, <span>,...)
        text = text.replace(/<[^>]+>/g, '');
        
        // 3. Xóa các khoảng trắng thừa, dọn dẹp ký tự đặc biệt
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }
};

module.exports = bookService;