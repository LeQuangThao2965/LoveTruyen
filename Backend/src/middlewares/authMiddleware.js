// Backend/src/middlewares/authMiddleware.js
const supabase = require('../configs/supabase');

const verifyToken = async (req, res, next) => {
    try {
        // 1. Lấy token từ header gửi lên (Dạng: "Bearer <token_loang_ngoang>")
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ message: 'Không tìm thấy Token xác thực!' });
        }

        // Tách chữ "Bearer" ra để lấy token
        const token = authHeader.split(' ')[1];

        // 2. Nhờ Supabase check xem token này còn hạn không, của ai?
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
        }

        // 3. Nếu ngon lành -> Gán thông tin user vào biến req để dùng ở bước sau
        req.user = user; 
        // req.user.id chính là cái UUID bên Supabase
        // req.user.email là email của họ

        console.log(`✅ User đã xác thực: ${user.email}`);
        
        next(); // Cho phép đi tiếp vào controller
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        res.status(500).json({ message: 'Lỗi Server khi xác thực' });
    }
};

module.exports = verifyToken;