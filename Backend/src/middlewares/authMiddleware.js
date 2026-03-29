// Backend/src/middlewares/authMiddleware.js
const supabase = require('../configs/supabase');
const UserProfile = require('../models/UserProfile');
const crypto = require('crypto');

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

        // 3. Hash token bằng SHA256 để so sánh với validTokens
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // 4. Kiểm tra user có bị banned không và token có trong validTokens không
        console.log(`[AuthMiddleware] Looking for profile with supabaseId: ${user.id}`);
        let profile = await UserProfile.findOne({ supabaseId: user.id });
        console.log(`[AuthMiddleware] Profile found:`, profile ? { id: profile._id, role: profile.role, supabaseId: profile.supabaseId } : 'NOT FOUND');

        // ❌ REMOVED: Auto-sync from Supabase to MongoDB - This was causing role reset bug!
        // MongoDB is the source of truth for roles, not Supabase

        if (profile) {
            if (profile.status === 'banned') {
                console.log(`[AuthMiddleware] ❌ User BANNED: ${user.email}`);
                // Trả về code đặc biệt để Frontend biết và logout
                return res.status(403).json({ 
                    code: 'ACCOUNT_BANNED',
                    message: 'Tài khoản đã bị khóa!',
                    banReason: profile.banReason,
                    bannedAt: profile.bannedAt
                });
            }
            
            if (profile.validTokens?.length > 0 && !profile.validTokens.includes(tokenHash)) {
                console.log(`[AuthMiddleware] ❌ Token invalid/expired for: ${user.email}`);
                return res.status(401).json({ 
                    code: 'TOKEN_INVALID',
                    message: 'Phiên đăng nhập đã hết hạn!' 
                });
            }
        }

        // 5. Gán thông tin user vào biến req để dùng ở bước sau
        req.user = user; 
        req.tokenHash = tokenHash;
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