// Backend/src/middlewares/checkMuted.js
// Middleware kiểm tra user có đang bị cấm chat không

const UserProfile = require('../models/UserProfile');

/**
 * Middleware kiểm tra trạng thái mute của user
 * Sử dụng cho các API liên quan đến chat/comment
 * 
 * Cách sử dụng:
 * router.post('/comments', verifyToken, checkMuted, commentController.createComment);
 */
const checkMuted = async (req, res, next) => {
    try {
        const supabaseId = req.user.id;
        
        // Lấy thông tin user từ MongoDB
        const userProfile = await UserProfile.findOne({ supabaseId });
        
        if (!userProfile) {
            // Nếu chưa có profile, cho phép (chưa bị mute)
            return next();
        }
        
        // Kiểm tra nếu user đang bị mute và Thời hạn chưa hết
        const now = new Date();
        if (userProfile.muteUntil && now < userProfile.muteUntil) {
            // User đang bị cấm chat
            const timeRemaining = Math.ceil((userProfile.muteUntil - now) / (60 * 1000)); // Phút
            
            return res.status(403).json({
                code: 'USER_MUTED',
                message: `Bạn đang bị cấm chat. Thời gian kết thúc: ${userProfile.muteUntil.toLocaleString('vi-VN')}`,
                muteUntil: userProfile.muteUntil,
                timeRemainingMinutes: timeRemaining,
                reason: userProfile.muteReason
            });
        }
        
        // Nếu Thời hạn đã hết, tự động cập nhật trạng thái (cleanup)
        if (userProfile.isMuted && userProfile.muteUntil && now >= userProfile.muteUntil) {
            console.log(`[checkMuted] Auto-unmuting user ${supabaseId} - mute period expired`);
            userProfile.isMuted = false;
            userProfile.muteReason = null;
            userProfile.mutedAt = null;
            userProfile.mutedBy = null;
            userProfile.muteUntil = null;
            await userProfile.save();
        }
        
        // Cho phép tiếp tục
        next();
    } catch (error) {
        console.error('[checkMuted] Error:', error);
        // Nếu lỗi, vẫn cho phép để không block user
        next();
    }
};

module.exports = checkMuted;
