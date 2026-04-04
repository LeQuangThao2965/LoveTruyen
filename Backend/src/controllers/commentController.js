// Backend/src/controllers/commentController.js
const Comment = require('../models/Comment');
const UserProfile = require('../models/UserProfile');
const supabase = require('../configs/supabase');

// POST /api/comments
exports.createComment = async (req, res) => {
    try {
        const { bookId, chapterId, content } = req.body;
        const userId = req.user.id; // Lấy từ token đăng nhập

        if (!bookId) {
            return res.status(400).json({ message: 'Thiếu ID truyện (bookId)!' });
        }

        // 1. Kiểm tra xem user có bị cấm chat (mute) trong MongoDB không
        const userProfile = await UserProfile.findOne({ supabaseId: userId });
        if (userProfile?.isMuted && userProfile?.muteUntil > new Date()) {
            return res.status(403).json({ 
                code: 'USER_MUTED', 
                muteUntil: userProfile.muteUntil,
                message: 'Bạn đang bị cấm chat!' 
            });
        }

        // 2. Lưu bình luận vào MongoDB
        const newComment = await Comment.create({
            bookId,
            chapterId: chapterId || null,
            userId,
            content: content.trim()
        });

        return res.status(201).json(newComment);
    } catch (error) {
        console.error('Lỗi khi tạo bình luận:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi gửi bình luận.' });
    }
};

// GET /api/comments?bookId=...&page=1&limit=20
exports.getComments = async (req, res) => {
    try {
        const { bookId, page = 1, limit = 20 } = req.query;
        
        if (!bookId) {
            return res.status(400).json({ message: 'Thiếu bookId' });
        }

        // ĐÃ SỬA: Chỉ dùng bookId, KHÔNG dùng chapterId để lấy TOÀN BỘ comment của truyện
        const query = { bookId };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Lấy danh sách bình luận (Mới nhất lên đầu)
        const comments = await Comment.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Comment.countDocuments(query);

        // Lấy thông tin Tên (display_name) và Avatar từ Supabase
        const userIds = [...new Set(comments.map(c => c.userId))];
        let profilesMap = {};
        
        if (userIds.length > 0) {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('id, display_name, username, avatar_url')
                .in('id', userIds);
                
            if (!error && profiles) {
                profiles.forEach(p => {
                    profilesMap[p.id] = {
                        name: p.display_name || p.username || 'Khách',
                        avatar: p.avatar_url || null
                    };
                });
            }
        }

        // Gắn tên, avatar và chapterId vào từng bình luận
        const enrichedComments = comments.map(c => ({
            _id: c._id,
            content: c.content,
            createdAt: c.createdAt,
            chapterId: c.chapterId, // <-- Quan trọng: Gửi số chương về Frontend
            author: profilesMap[c.userId]?.name || 'Tài khoản ẩn',
            avatar_url: profilesMap[c.userId]?.avatar || null
        }));

        res.json({
            comments: enrichedComments,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });

    } catch (error) {
        console.error('Lỗi khi lấy bình luận:', error);
        res.status(500).json({ message: 'Lỗi máy chủ khi lấy bình luận.' });
    }
};