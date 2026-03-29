// Backend/src/controllers/userController.js
// Các hàm cho user hiện tại (không phải admin functions)

const UserProfile = require('../models/UserProfile');

// 1. getOrCreateProfile - Lấy hoặc tạo profile (cho user mới đăng nhập)
// GET /api/users/me/profile
exports.getOrCreateProfile = async (req, res) => {
    try {
        const supabaseId = req.user.id;
        const email = req.user.email;
        
        console.log(`\n========== [getOrCreateProfile] START ==========`);
        console.log(`[getOrCreateProfile] Request from user: ${email}`);
        console.log(`[getOrCreateProfile] Looking for supabaseId: ${supabaseId}`);
        
        let profile = await UserProfile.findOne({ supabaseId });
        console.log(`[getOrCreateProfile] Query result:`, profile ? {
            _id: profile._id,
            supabaseId: profile.supabaseId,
            email: profile.email,
            role: profile.role,
            status: profile.status
        } : 'NOT FOUND - Will create new');
        
        // Nếu chưa có, tự động tạo mới
        if (!profile) {
            console.log(`[getOrCreateProfile] Creating NEW profile for ${email}`);
            profile = new UserProfile({
                supabaseId,
                email,
                username: email.split('@')[0],
                role: 'user', // Default role
                status: 'active',
                coins: 0
            });
            await profile.save();
            console.log(`[getOrCreateProfile] Created successfully:`, {
                _id: profile._id,
                supabaseId: profile.supabaseId,
                role: profile.role
            });
        } else {
            console.log(`[getOrCreateProfile] Existing profile found, role: ${profile.role}, status: ${profile.status}`);
            
            // 🚫 Kiểm tra nếu user bị ban
            if (profile.status === 'banned') {
                console.log(`[getOrCreateProfile] User BANNED - Access denied`);
                return res.status(403).json({
                    success: false,
                    code: 'ACCOUNT_BANNED',
                    message: 'Tài khoản đã bị khóa',
                    reason: profile.banReason || 'Vi phạm quy định',
                    banTime: profile.bannedAt || null
                });
            }
        }
        
        console.log(`[getOrCreateProfile] Returning profile with role: ${profile.role}`);
        console.log(`========== [getOrCreateProfile] END ==========\n`);
        
        res.json({
            success: true,
            profile: {
                supabaseId: profile.supabaseId,
                email: profile.email,
                username: profile.username,
                role: profile.role,
                status: profile.status,
                coins: profile.coins,
                createdAt: profile.createdAt
            }
        });
    } catch (error) {
        console.error('[getOrCreateProfile] ERROR:', error);
        res.status(500).json({ message: error.message });
    }
};

// 2. syncUserRole - Đồng bộ role từ Supabase vào MongoDB
// POST /api/users/sync-role
exports.syncUserRole = async (req, res) => {
    try {
        const supabase = require('../configs/supabase');
        
        console.log('[syncUserRole] Starting role sync for user:', req.user?.id);
        
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            console.log('[syncUserRole] Error getting user from Supabase:', error);
            return res.status(401).json({ message: 'Token không hợp lệ' });
        }
        
        // Lấy role từ public.profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            console.log('[syncUserRole] Error getting profile:', profileError);
            return res.status(500).json({ 
                message: 'Không lấy được role từ Supabase',
                error: profileError.message 
            });
        }
        
        // Cập nhật vào MongoDB
        const userProfile = await UserProfile.findOneAndUpdate(
            { supabaseId: user.id },
            { 
                role: profile?.role || 'user',
                email: user.email,
                username: user.email.split('@')[0]
            },
            { upsert: true, new: true }
        );
        
        console.log('[syncUserRole] Updated MongoDB profile:', {
            supabaseId: userProfile.supabaseId,
            role: userProfile.role
        });
        
        res.json({
            success: true,
            message: 'Đã đồng bộ role',
            role: userProfile.role,
            supabaseRole: profile?.role
        });
    } catch (error) {
        console.error('[syncUserRole] Sync role error:', error);
        res.status(500).json({ message: error.message });
    }
};
