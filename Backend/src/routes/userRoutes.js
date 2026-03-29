const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');
const { requireAdmin, requireSuperAdmin } = require('../middlewares/adminMiddleware');

// Import controllers
const userController = require('../controllers/userController');
const adminUserController = require('../controllers/adminUserController');

// ========== USER SELF ROUTES (Không cần admin) ==========
// Lấy hoặc tạo profile - user mới đăng nhập sẽ gọi
router.get('/me/profile', verifyToken, userController.getOrCreateProfile);

// Đồng bộ role từ Supabase vào MongoDB
router.post('/sync-role', verifyToken, userController.syncUserRole);

// ========== ADMIN ROUTES (Cần verifyToken + requireAdmin) ==========
// Apply admin middleware cho tất cả routes bên dưới
router.use(verifyToken, requireAdmin);

// List và chi tiết user
router.get('/', adminUserController.getUsers);
router.get('/audit-logs', adminUserController.getAuditLogs);
router.get('/:id/details', adminUserController.getUserDetails);

// Chỉ admin mới được đổi role (super admin)
router.patch('/:id/role', requireSuperAdmin, adminUserController.changeUserRole);

// Admin và host đều được ban/unban/mute/unmute
router.post('/:id/ban', adminUserController.banUser);
router.post('/:id/unban', adminUserController.unbanUser);
router.post('/:id/toggle-ban', adminUserController.toggleBanUser);
router.post('/:id/mute', adminUserController.muteUser);
router.post('/:id/unmute', adminUserController.unmuteUser);

module.exports = router;
