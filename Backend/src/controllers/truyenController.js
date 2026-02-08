const Story = require('../models/Story');

// 1. Lấy danh sách truyện (Có phân trang & lọc)
// GET /api/stories?page=1&limit=10
exports.getStories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Query tìm kiếm cơ bản (Lấy tất cả, sắp xếp mới nhất)
        const stories = await Story.find()
            .sort({ createdAt: -1 }) // Truyện mới nhất lên đầu
            .skip(skip)
            .limit(limit)
            .select('-description'); // Tối ưu: Không lấy nội dung mô tả dài dòng khi hiển thị danh sách

        const total = await Story.countDocuments();

        res.json({
            success: true,
            count: stories.length,
            total,
            currentPage: page,
            data: stories
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Thêm truyện mới (Cần đăng nhập)
// POST /api/stories
exports.createStory = async (req, res) => {
    try {
        // req.user lấy từ middleware xác thực (bước trước mình làm rồi á)
        const uploaderId = req.user.id; 

        const newStory = new Story({
            ...req.body, // Lấy title, author, description từ client gửi lên
            uploader: uploaderId // Gán người đăng là user đang đăng nhập
        });

        const savedStory = await newStory.save();

        res.status(201).json({
            success: true,
            data: savedStory
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 3. Lấy chi tiết 1 truyện
// GET /api/stories/:id
exports.getStoryById = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy truyện' });
        }
        res.json({ success: true, data: story });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};