// Backend/src/controllers/adminUserController.js
// Các hàm quản lý user dành cho Admin/Host

const UserProfile = require('../models/UserProfile');
const User = require('../models/user');
const AuditLog = require('../models/AuditLog');

// =========================================================================
// 🚀 HÀM TRỢ THỦ: TỰ ĐỘNG TẠO USER NẾU CHƯA TỒN TẠI TRONG MONGODB
// Giúp diệt tận gốc lỗi 404 khi Admin thao tác trên User chưa từng đăng nhập
// =========================================================================
const getOrCreateMongoUser = async (supabaseId) => {
    let targetUser = await UserProfile.findOne({ supabaseId });
    if (targetUser) return targetUser;

    console.log(`[Helper] User ${supabaseId} chưa có trong MongoDB. Tiến hành tạo mới...`);
    const supabase = require('../configs/supabase');
    const { data: supabaseUser, error } = await supabase
        .from('profiles')
        .select('id, email, username')
        .eq('id', supabaseId)
        .single();

    if (error || !supabaseUser) {
        console.log(`[Helper] Không tìm thấy user trong Supabase!`);
        return null;
    }

    // 1. Tạo profile mới và lưu vào DB
    targetUser = new UserProfile({
        supabaseId: supabaseId,
        email: supabaseUser.email,
        username: supabaseUser.username || supabaseUser.email?.split('@')[0],
        role: 'user',
        status: 'active',
        coins: 0
    });
    await targetUser.save();

    // 2. Tạo luôn record trong bảng User cho đồng bộ
    const existUser = await User.findOne({ supabaseId });
    if (!existUser) {
        await User.create({
            supabaseId: supabaseId,
            email: supabaseUser.email,
            library: [],
            history: []
        });
    }

    return targetUser;
};
// =========================================================================


// 1. getUsers - Lấy danh sách user từ Supabase (hiển thị), merge role từ MongoDB
// GET /api/users?page=1&limit=10&search=abc&role=admin&status=active
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, role, status } = req.query;
        const supabase = require('../configs/supabase');
        
        let supabaseQuery = supabase
            .from('profiles')
            .select('*', { count: 'exact' });
        
        if (search) {
            supabaseQuery = supabaseQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        supabaseQuery = supabaseQuery
            .order('created_at', { ascending: false })
            .range(skip, skip + parseInt(limit) - 1);
        
        const { data: profiles, error, count } = await supabaseQuery;
        
        if (error) {
            console.error('[getUsers] Supabase error:', error);
            return res.status(500).json({ message: 'Lỗi lấy dữ liệu từ Supabase' });
        }
        
        const supabaseIds = profiles.map(p => p.id);
        const mongoProfiles = await UserProfile.find({ 
            supabaseId: { $in: supabaseIds } 
        }).select('supabaseId role status coins isMuted');
        
        let mergedUsers = profiles.map(profile => {
            const mongoData = mongoProfiles.find(mp => mp.supabaseId === profile.id);
            return {
                _id: mongoData?._id,
                supabaseId: profile.id,
                email: profile.email,
                username: profile.username || profile.email?.split('@')[0],
                avatar: profile.avatar_url,
                role: mongoData?.role || 'user',
                status: mongoData?.status || 'active',
                coins: mongoData?.coins || 0,
                isMuted: mongoData?.isMuted || false,
                createdAt: profile.created_at
            };
        });
        
        if (role) {
            mergedUsers = mergedUsers.filter(u => u.role === role);
        }
        if (status) {
            mergedUsers = mergedUsers.filter(u => u.status === status);
        }
        
        const totalPages = Math.ceil((count || 0) / parseInt(limit));
        
        res.json({
            users: mergedUsers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || 0,
                totalPages
            }
        });
    } catch (error) {
        console.error('getUsers Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// 2. getUserDetails - Xem chi tiết 1 user
exports.getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userProfile = await getOrCreateMongoUser(id);
        
        if (!userProfile) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
        const userData = await User.findOne({ supabaseId: id });
        
        const stats = {
            booksRead: userData ? userData.library.length : 0,
            coins: userProfile.coins,
            commentCount: 0
        };
        
        res.json({
            profile: userProfile,
            stats
        });
    } catch (error) {
        console.error('getUserDetails Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// 3. changeUserRole - Đổi quyền user trong MongoDB
exports.changeUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const supabase = require('../configs/supabase');
        
        if (!['user', 'host', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Role không hợp lệ' });
        }
        
        if (id === req.user.id) {
            return res.status(403).json({ message: 'Bạn không thể tự thay đổi quyền của mình!' });
        }
        
        if (role === 'admin') {
            return res.status(403).json({ message: 'Bạn không có quyền cấp quyền Admin. Chỉ có thể chuyển đổi giữa User và Host!' });
        }
        
        const { data: supabaseUser, error: supabaseError } = await supabase
            .from('profiles')
            .select('id, email, username')
            .eq('id', id)
            .single();
            
        if (supabaseError || !supabaseUser) {
            return res.status(404).json({ message: 'Không tìm thấy user trong Supabase' });
        }
        
        const existingUser = await UserProfile.findOne({ supabaseId: id });
        const previousRole = existingUser?.role || 'user';
        
        if (previousRole === 'admin') {
            return res.status(403).json({ message: 'Không thể thay đổi quyền của Admin. Admin được bảo vệ!' });
        }
        
        const user = await UserProfile.findOneAndUpdate(
            { supabaseId: id },
            {
                supabaseId: id,
                email: supabaseUser.email,
                username: supabaseUser.username || supabaseUser.email?.split('@')[0],
                role: role,
                status: existingUser?.status || 'active',
                coins: existingUser?.coins || 0
            },
            { upsert: true, new: true }
        );
        
        await AuditLog.create({
            adminId: req.user.id,
            adminRole: req.userProfile.role,
            targetUserId: id,
            targetUsername: user.username,
            action: 'change_role',
            reason: `Đổi role từ ${previousRole} thành ${role}`,
            previousValue: { role: previousRole },
            newValue: { role }
        });
        
        res.json({
            success: true,
            message: existingUser ? 'Đã cập nhật quyền user' : 'Đã tạo user mới và cập nhật quyền',
            user: { supabaseId: id, username: user.username, role }
        });
    } catch (error) {
        console.error('changeUserRole Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// 4. banUser - Khóa tài khoản
exports.banUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason) return res.status(400).json({ message: 'Vui lòng nhập lý do khóa tài khoản' });
        if (id === req.user.id) return res.status(400).json({ message: 'Bạn không thể tự khóa tài khoản của chính mình!' });
        
        const targetUser = await getOrCreateMongoUser(id);
        if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy user' });
        
        if (targetUser.role === 'admin') {
            return res.status(403).json({ message: 'Không thể khóa tài khoản của một Admin khác!' });
        }
        
        const previousStatus = targetUser.status;
        targetUser.status = 'banned';
        targetUser.banReason = reason;
        targetUser.bannedAt = new Date();
        targetUser.bannedBy = req.user.id;
        targetUser.validTokens = [];
        
        await targetUser.save();
        
        await AuditLog.create({
            adminId: req.user.id,
            adminRole: req.userProfile.role,
            targetUserId: id,
            targetUsername: targetUser.username,
            action: 'ban',
            reason,
            previousValue: { status: previousStatus },
            newValue: { status: 'banned', banReason: reason }
        });
        
        res.json({ success: true, message: 'Đã khóa tài khoản' });
    } catch (error) {
        console.error('banUser Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// 5. unbanUser - Mở khóa tài khoản
exports.unbanUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const targetUser = await getOrCreateMongoUser(id);
        if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy user' });
        
        const previousStatus = targetUser.status;
        targetUser.status = 'active';
        targetUser.banReason = null;
        targetUser.bannedAt = null;
        targetUser.bannedBy = null;
        
        await targetUser.save();
        
        await AuditLog.create({
            adminId: req.user.id,
            adminRole: req.userProfile.role,
            targetUserId: id,
            targetUsername: targetUser.username,
            action: 'unban',
            reason: 'Mở khóa tài khoản',
            previousValue: { status: previousStatus },
            newValue: { status: 'active' }
        });
        
        res.json({ success: true, message: 'Đã mở khóa tài khoản' });
    } catch (error) {
        console.error('unbanUser Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// 6. toggleBanUser - Toggle trạng thái khóa/mở khóa
exports.toggleBanUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;
        
        if (id === adminId) {
            return res.status(400).json({ message: 'Bạn không thể tự khóa tài khoản của chính mình!' });
        }
        
        const targetUser = await getOrCreateMongoUser(id);
        if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy user' });
        
        const previousStatus = targetUser.status;
        const isCurrentlyBanned = targetUser.status === 'banned';
        
        if (!isCurrentlyBanned && targetUser.role === 'admin') {
            return res.status(403).json({ message: 'Không thể khóa tài khoản của một Admin khác!' });
        }
        
        if (isCurrentlyBanned) {
            targetUser.status = 'active';
            targetUser.banReason = null;
            targetUser.bannedAt = null;
            targetUser.bannedBy = null;
            
            await targetUser.save();
            
            await AuditLog.create({
                adminId: adminId,
                adminRole: req.userProfile.role,
                targetUserId: id,
                targetUsername: targetUser.username,
                action: 'unban',
                reason: 'Mở khóa tài khoản (toggle)',
                previousValue: { status: previousStatus },
                newValue: { status: 'active' }
            });
            
            res.json({ 
                success: true, 
                message: 'Đã mở khóa tài khoản',
                action: 'unbanned',
                user: { supabaseId: id, status: 'active' }
            });
        } else {
            if (!reason) return res.status(400).json({ message: 'Vui lòng nhập lý do khóa tài khoản' });
            
            targetUser.status = 'banned';
            targetUser.banReason = reason;
            targetUser.bannedAt = new Date();
            targetUser.bannedBy = adminId;
            targetUser.validTokens = [];
            
            await targetUser.save();
            
            await AuditLog.create({
                adminId: adminId,
                adminRole: req.userProfile.role,
                targetUserId: id,
                targetUsername: targetUser.username,
                action: 'ban',
                reason: reason,
                previousValue: { status: previousStatus },
                newValue: { status: 'banned', banReason: reason }
            });
            
            res.json({ 
                success: true, 
                message: 'Đã khóa tài khoản',
                action: 'banned',
                user: { supabaseId: id, status: 'banned', banReason: reason }
            });
        }
    } catch (error) {
        console.error('[toggleBanUser] ERROR:', error);
        res.status(500).json({ message: error.message });
    }
};

// 7. muteUser - Cấm chat/bình luận có Thời hạn
exports.muteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, duration } = req.body;
        
        if (!reason) return res.status(400).json({ message: 'Vui lòng nhập lý do cấm chat' });
        if (!duration || duration <= 0) return res.status(400).json({ message: 'Vui lòng nhập Thời gian cấm chat hợp lệ (phút)' });
        if (id === req.user.id) return res.status(400).json({ message: 'Bạn không thể tự cấm chat chính mình!' });
        
        const targetUser = await getOrCreateMongoUser(id);
        if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy user' });
        
        if (targetUser.role === 'admin') {
            return res.status(403).json({ message: 'Không thể cấm chat của một Admin khác!' });
        }
        
        const muteUntil = new Date(Date.now() + duration * 60 * 1000);
        
        targetUser.isMuted = true;
        targetUser.muteReason = reason;
        targetUser.mutedAt = new Date();
        targetUser.mutedBy = req.user.id;
        targetUser.muteUntil = muteUntil;
        
        await targetUser.save();
        
        await AuditLog.create({
            adminId: req.user.id,
            adminRole: req.userProfile.role,
            targetUserId: id,
            targetUsername: targetUser.username,
            action: 'mute',
            reason: `${reason} (Thời hạn: ${duration} phút)`,
            previousValue: { isMuted: false },
            newValue: { 
                isMuted: true, 
                muteReason: reason, 
                muteUntil: muteUntil 
            }
        });
        
        res.json({ 
            success: true, 
            message: `Đã cấm chat đến ${muteUntil.toLocaleString('vi-VN')}`,
            muteUntil: muteUntil
        });
    } catch (error) {
        console.error('muteUser Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// 8. unmuteUser - Bỏ cấm chat (xóa án phạt trước Thời hạn)
exports.unmuteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const targetUser = await getOrCreateMongoUser(id);
        if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy user' });
        
        targetUser.isMuted = false;
        targetUser.muteReason = null;
        targetUser.mutedAt = null;
        targetUser.mutedBy = null;
        targetUser.muteUntil = null;
        
        await targetUser.save();
        
        await AuditLog.create({
            adminId: req.user.id,
            adminRole: req.userProfile.role,
            targetUserId: id,
            targetUsername: targetUser.username,
            action: 'unmute',
            reason: 'Bỏ cấm chat (thủ công)',
            previousValue: { isMuted: true },
            newValue: { isMuted: false }
        });
        
        res.json({ success: true, message: 'Đã bỏ cấm chat' });
    } catch (error) {
        console.error('unmuteUser Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// 9. getAuditLogs - Lấy lịch sử thao tác
exports.getAuditLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const logs = await AuditLog.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await AuditLog.countDocuments();
        const totalPages = Math.ceil(total / parseInt(limit));
        
        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('getAuditLogs Error:', error);
        res.status(500).json({ message: error.message });
    }
};