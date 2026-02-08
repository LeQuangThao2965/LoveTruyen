const Chapter = require('../models/Chapter');
const Story = require('../models/Story');

exports.addChapter = async (req, res) => {
    try {
        const { storyId, title, content, chapterNumber } = req.body;

        // 1. Tạo chương (Code cũ)
        const newChapter = new Chapter({ storyId, title, chapterNumber, content });
        await newChapter.save();

        // 2. Update Story (Code cũ)
        const story = await Story.findByIdAndUpdate(storyId, {
            latestChapter: { title, number: chapterNumber, updatedAt: new Date() },
            $inc: { 'stats.totalChapters': 1 }
        }, { new: true }); // new: true để lấy data mới nhất sau update

        // --- PHẦN MỚI: XỬ LÝ THÔNG BÁO ---

        // A. Tìm tất cả user đang theo dõi truyện này
        // Logic: Tìm trong bảng User, những ai có library chứa storyId này
        const followers = await User.find({ "library.storyId": storyId }).select('supabaseId');
        
        if (followers.length > 0) {
            const io = getIO();
            const notificationData = {
                title: `Truyện "${story.title}" có chương mới!`,
                message: `Chương ${chapterNumber}: ${title} vừa được cập nhật.`,
                link: `/truyen/${storyId}/chuong/${newChapter._id}`,
                type: 'new_chapter'
            };

            // B. Chạy vòng lặp để gửi cho từng người (Có thể tối ưu bằng Queue nếu user đông)
            const notifyPromises = followers.map(async (follower) => {
                // 1. Lưu vào Database (Để hiện trong danh sách thông báo)
                await Notification.create({
                    userId: follower.supabaseId,
                    ...notificationData
                });

                // 2. Bắn Socket (Hiện Popup ngay lập tức nếu đang online)
                // Gửi vào room trùng tên với ID User
                io.to(follower.supabaseId).emit("receive_notification", notificationData);
            });

            // Chạy song song cho nhanh
            await Promise.all(notifyPromises);
        }

        res.status(201).json({ success: true, data: newChapter });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Lấy danh sách chương của 1 truyện (Chỉ lấy tên, không lấy nội dung để nhẹ)
exports.getChaptersByStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const chapters = await Chapter.find({ storyId })
            .select('title chapterNumber createdAt views') // Chỉ lấy các trường cần thiết
            .sort({ chapterNumber: 1 }); // Sắp xếp từ chương 1 -> n

        res.json({ success: true, data: chapters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Đọc nội dung 1 chương
exports.getChapterDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const chapter = await Chapter.findById(id);
        
        if (!chapter) return res.status(404).json({ message: 'Chương không tồn tại' });

        // Tăng view (Mỗi lần đọc +1 view) - Có thể tối ưu bằng Redis sau
        chapter.views += 1;
        await chapter.save();

        res.json({ success: true, data: chapter });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};