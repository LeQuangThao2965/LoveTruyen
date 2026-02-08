const User = require('../models/user');

// Toggle Follow (Nếu chưa theo dõi thì thêm, có rồi thì xóa)
exports.toggleFollowStory = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy từ token
        const { storyId } = req.body;

        const user = await User.findOne({ supabaseId: userId });
        
        // Kiểm tra xem đã theo dõi chưa (Check trong mảng library)
        const isFollowing = user.library.some(item => item.storyId.toString() === storyId);

        if (isFollowing) {
            // HỦY THEO DÕI: Lọc bỏ truyện ra khỏi mảng
            user.library = user.library.filter(item => item.storyId.toString() !== storyId);
            await user.save();
            return res.json({ success: true, message: "Đã hủy theo dõi", isFollowing: false });
        } else {
            // THEO DÕI: Thêm vào mảng
            user.library.push({ storyId: storyId });
            await user.save();
            return res.json({ success: true, message: "Đã theo dõi truyện", isFollowing: true });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};