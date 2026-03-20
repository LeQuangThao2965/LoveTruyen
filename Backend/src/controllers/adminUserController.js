// Backend/src/controllers/adminUserController.js
// Các hàm quản lý user dành cho Admin/Moderator

const UserProfile = require('../models/UserProfile');
const User = require('../models/user');
const AuditLog = require('../models/AuditLog');

// 1. getUsers - Lấy danh sách user từ Supabase (hiển thị), merge role từ MongoDB
// GET /api/users?page=1&limit=10&search=abc&role=admin&status=active
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, role, status } = req.query;
        const supabase = require('../configs/supabase');
        
        // Lấy từ Supabase public.profiles (dùng anon key, không cần Service Role Key)
        let supabaseQuery = supabase
            .from('profiles')
            .select('*', { count: 'exact' });
        
        // Search theo username hoặc email
        if (search) {
            supabaseQuery = supabaseQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
        }
        
        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        supabaseQuery = supabaseQuery
            .order('created_at', { ascending: false })
            .range(skip, skip + parseInt(limit) - 1);
        
        const { data: profiles, error, count } = await supabaseQuery;
        
        if (error) {
            console.error('[getUsers] Supabase error:', error);
            return res.status(500).json({ message: 'Lỗi lấy dữ liệu từ Supabase' });
        }
        
        // Lấy role từ MongoDB (nếu có)
        const supabaseIds = profiles.map(p => p.id);
        const mongoProfiles = await UserProfile.find({ 
            supabaseId: { $in: supabaseIds } 
        }).select('supabaseId role status coins isMuted');
        
        // Merge data: Supabase (gmail, avatar) + MongoDB (role, status)
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
        
        // Filter theo role và status sau khi merge
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
// GET /api/users/:id/details
exports.getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        const userProfile = await UserProfile.findOne({ supabaseId: id }).select('-validTokens');
        
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
// PATCH /api/users/:id/role
exports.changeUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const supabase = require('../configs/supabase');
        
        console.log(`\n========== [changeUserRole] START ==========`);
        console.log(`[changeUserRole] Target: ${id}, New role: ${role}`);
        
        if (!['user', 'moderator', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Role không hợp lệ' });
        }
        
        if (id === req.user.id) {
            return res.status(403).json({ message: 'Bạn không thể tự thay đổi quyền của mình!' });
        }
        
        if (role === 'admin') {
            return res.status(403).json({ message: 'Bạn không có quyền cấp quyền Admin. Chỉ có thể chuyển đổi giữa User và Moderator!' });
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
        
        console.log(`[changeUserRole] SUCCESS: ${previousRole} → ${role}`);
        console.log(`========== [changeUserRole] END ==========\n`);
        
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
// POST /api/users/:id/ban
exports.banUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({ message: 'Vui lòng nhập lý do khóa tài khoản' });
        }
        
        // 🚫 CẤM TỰ BAN: Không thể tự khóa chính mình
        if (id === req.user.id) {
            return res.status(400).json({ message: 'Bạn không thể tự khóa tài khoản của chính mình!' });
        }
        
        const targetUser = await UserProfile.findOne({ supabaseId: id });
        
        if (!targetUser) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
        // 🛡️ CẤM ADMIN BAN ADMIN: Không thể khóa tài khoản Admin khác
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
// POST /api/users/:id/unban
exports.unbanUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const targetUser = await UserProfile.findOne({ supabaseId: id });
        
        if (!targetUser) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
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
// POST /api/users/:id/toggle-ban
exports.toggleBanUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;
        
        console.log(`\n========== [toggleBanUser] START ==========`);
        console.log(`[toggleBanUser] Target: ${id}, Admin: ${adminId}`);
        
        // 🚫 CẤM TỰ BAN: Không thể tự khóa chính mình
        if (id === adminId) {
            console.log(`[toggleBanUser] ERROR: Self-ban attempt blocked`);
            return res.status(400).json({ message: 'Bạn không thể tự khóa tài khoản của chính mình!' });
        }
        
        const targetUser = await UserProfile.findOne({ supabaseId: id });
        
        if (!targetUser) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
        const previousStatus = targetUser.status;
        const isCurrentlyBanned = targetUser.status === 'banned';
        
        // 🛡️ CẤM ADMIN BAN ADMIN: Chỉ kiểm tra khi đang BAN (không kiểm tra khi UNBAN)
        if (!isCurrentlyBanned && targetUser.role === 'admin') {
            console.log(`[toggleBanUser] ERROR: Cannot ban another admin`);
            return res.status(403).json({ message: 'Không thể khóa tài khoản của một Admin khác!' });
        }
        
        if (isCurrentlyBanned) {
            // UNBAN
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
            
            console.log(`[toggleBanUser] UNBAN SUCCESS`);
            console.log(`========== [toggleBanUser] END ==========\n`);
            
            res.json({ 
                success: true, 
                message: 'Đã mở khóa tài khoản',
                action: 'unbanned',
                user: { supabaseId: id, status: 'active' }
            });
        } else {
            // BAN
            if (!reason) {
                return res.status(400).json({ message: 'Vui lòng nhập lý do khóa tài khoản' });
            }
            
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
            
            console.log(`[toggleBanUser] BAN SUCCESS`);
            console.log(`========== [toggleBanUser] END ==========\n`);
            
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
// POST /api/users/:id/mute
// Body: { reason: string, duration: number (phút) }
exports.muteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, duration } = req.body;
        
        if (!reason) {
            return res.status(400).json({ message: 'Vui lòng nhập lý do cấm chat' });
        }
        
        if (!duration || duration <= 0) {
            return res.status(400).json({ message: 'Vui lòng nhập Thời gian cấm chat hợp lệ (phút)' });
        }
        
        // 🚫 CẤM TỰ KHÓA MIỆNG: Không thể tự cấm chat chính mình
        if (id === req.user.id) {
            return res.status(400).json({ message: 'Bạn không thể tự cấm chat chính mình!' });
        }
        
        const targetUser = await UserProfile.findOne({ supabaseId: id });
        
        if (!targetUser) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
        // 🛡️ BẢO VỆ ADMIN: Không thể cấm chat Admin khác
        if (targetUser.role === 'admin') {
            return res.status(403).json({ message: 'Không thể cấm chat của một Admin khác!' });
        }
        
        // Tính toán Thời gian kết thúc
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
// POST /api/users/:id/unmute
exports.unmuteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const targetUser = await UserProfile.findOne({ supabaseId: id });
        
        if (!targetUser) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        
        targetUser.isMuted = false;
        targetUser.muteReason = null;
        targetUser.mutedAt = null;
        targetUser.mutedBy = null;
        targetUser.muteUntil = null; // Xóa Thời hạn
        
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
// GET /api/users/audit-logs
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
