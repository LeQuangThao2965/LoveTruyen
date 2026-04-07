// Backend/src/middlewares/adminMiddleware.js
const UserProfile = require('../models/UserProfile');

// HÀM TRỢ THỦ: Tự động tìm hoặc tạo Profile trong mongoDB để tránh lặp code (Clean Code)
const getProfile = async (user) => {
    let profile = await UserProfile.findOne({ supabaseId: user.id });
    
    if (!profile) {
        profile = new UserProfile({
            supabaseId: user.id,
            email: user.email,
            username: user.email.split('@')[0],
            role: 'user',
            status: 'active'
        });
        await profile.save();
    }
    return profile;
};

// Middleware kiểm tra role admin
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Không tìm thấy thông tin user!' });
        }

        // Chỉ lấy role từ MongoDB
        const profile = await getProfile(req.user);
 
        if (!['admin', 'host'].includes(profile.role)) {
            return res.status(403).json({ 
                message: 'Không có quyền truy cập! Yêu cầu quyền Admin hoặc Host.',
                currentRole: profile.role 
            });
        }

        req.userProfile = profile;
        next();
    } catch (err) {
        console.error('Admin Middleware Error:', err);
        res.status(500).json({ message: 'Lỗi kiểm tra quyền admin' });
    }
};

// Middleware chỉ cho phép admin (không cho host)
const requireSuperAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Không tìm thấy thông tin admin!' });
        }

        // Chỉ lấy role từ MongoDB
        const profile = await getProfile(req.user);
        
        if (!profile) {
            // Auto-create nếu chưa có (để tránh lỗi)
            const newProfile = new UserProfile({
                supabaseId: req.user.id,
                email: req.user.email,
                username: req.user.email.split('@')[0],
                role: 'user',
                status: 'active'
            });
            await newProfile.save();
            
            return res.status(403).json({ 
                message: 'Tài khoản mới được tạo. Vui lòng đăng nhập lại.' 
            });
        }

        if (profile.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Chỉ Admin cấp cao mới được phép thao tác này!',
                currentRole: profile.role 
            });
        }

        req.userProfile = profile;
        next();
    } catch (err) {
        console.error('Super Admin Middleware Error:', err);
        res.status(500).json({ message: 'Lỗi kiểm tra quyền' });
    }
};

module.exports = { requireAdmin, requireSuperAdmin };
