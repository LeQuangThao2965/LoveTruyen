const mongoose = require('mongoose');
const Chapter = require('../models/Chapter');
const Book = require('../models/Book');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Hàm thông minh tự động dịch Slug thành _id của Book
const resolveBookId = async (idOrSlug) => {
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
        return new mongoose.Types.ObjectId(idOrSlug);
    }
    const book = await Book.findOne({ slug: idOrSlug }).select('_id');
    return book ? book._id : null;
};

const toObjectId = (value) => {
    if (!value || typeof value !== 'string') return null;
    if (!mongoose.Types.ObjectId.isValid(value)) return null;
    return new mongoose.Types.ObjectId(value);
};

const parsePositiveInt = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const getWeekStart = (value = new Date()) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);

    const day = date.getDay();
    const offset = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - offset);

    return date;
};

const toBookObjectId = (value) => {
    if (!value) return null;

    if (value instanceof mongoose.Types.ObjectId) return value;
    if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
        return new mongoose.Types.ObjectId(value);
    }

    return null;
};

const resolveBookIdFromChapter = (chapter, fallbackStoryId) => {
    const chapterBookId =
        chapter?.book_id
        ?? chapter?.storyId
        ?? chapter?._doc?.book_id
        ?? chapter?._doc?.storyId;

    return toBookObjectId(chapterBookId) || toBookObjectId(fallbackStoryId);
};

const incrementBookViewStats = async (bookId) => {
    const safeBookId = toBookObjectId(bookId);
    if (!safeBookId) return;

    const weekStart = getWeekStart();

    try {
        await Book.updateOne(
            { _id: safeBookId },
            [
                {
                    $set: {
                        __sameWeek: { $eq: ['$weekly_views_start', weekStart] }
                    }
                },
                {
                    $set: {
                        total_views: {
                            $add: [{ $ifNull: ['$total_views', 0] }, 1]
                        },
                        weekly_views: {
                            $cond: [
                                '$__sameWeek',
                                { $add: [{ $ifNull: ['$weekly_views', 0] }, 1] },
                                1
                            ]
                        },
                        weekly_views_start: weekStart
                    }
                },
                { $unset: '__sameWeek' }
            ]
        );
    } catch (pipelineError) {
        // Fallback for older MongoDB versions that don't support update pipeline.
        const current = await Book.findById(safeBookId)
            .select('_id total_views weekly_views weekly_views_start')
            .lean();
        if (!current) return;

        const isSameWeek =
            current.weekly_views_start instanceof Date
            && current.weekly_views_start.getTime() === weekStart.getTime();

        await Book.updateOne(
            { _id: safeBookId },
            {
                $set: {
                    weekly_views_start: weekStart,
                    weekly_views: isSameWeek
                        ? Number(current.weekly_views || 0) + 1
                        : 1
                },
                $inc: { total_views: 1 }
            }
        );

        console.warn('Fallback increment view stats because update pipeline failed:', pipelineError?.message);
    }
};

const buildStoryOrFilters = (storyId) => {
    const normalized = typeof storyId === 'string' ? storyId.trim() : '';
    const objectId = toObjectId(normalized);

    if (!normalized && !objectId) return [];

    const filters = [];

    if (objectId) {
        filters.push({ book_id: objectId });
        filters.push({ storyId: objectId });
    }

    if (normalized) {
        filters.push({ storyId: normalized });
    }

    return filters;
};

const normalizeChapter = (chapter, fallbackNumber = 0) => {
    const chapterNumber = parsePositiveInt(
        chapter?.chapter_number ?? chapter?.chapterNumber,
        fallbackNumber
    );

    return {
        _id: chapter?._id,
        title: chapter?.title || `Chuong ${chapterNumber}`,
        chapter_number: chapterNumber,
        content: chapter?.content || '',
        createdAt: chapter?.createdAt,
        updatedAt: chapter?.updatedAt
    };
};

// POST /api/chapters
exports.addChapter = async (req, res) => {
    try {
        const rawBookId = req.body?.book_id || req.body?.storyId || '';
        const bookId = toObjectId(rawBookId);
        const chapterNumber = parsePositiveInt(
            req.body?.chapter_number ?? req.body?.chapterNumber
        );
        const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
        const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

        if (!bookId) {
            return res.status(400).json({
                success: false,
                message: 'book_id khong hop le.'
            });
        }

        if (!chapterNumber || !title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Thieu truong bat buoc: chapter_number, title, content.'
            });
        }

        // Check if chapter with same book_id and chapter_number already exists
        const existingChapter = await Chapter.findOne({ 
            book_id: bookId, 
            chapter_number: chapterNumber 
        });

        if (existingChapter) {
            return res.status(400).json({
                success: false,
                message: `Chương ${chapterNumber} đã tồn tại cho truyện này. Vui lòng sử dụng số chương khác.`
            });
        }

        const chapter = await Chapter.create({
            book_id: bookId,
            chapter_number: chapterNumber,
            title: title,
            content: content
        });

        const totalChapters = await Chapter.countDocuments({ book_id: bookId });
        await Book.findByIdAndUpdate(bookId, { total_chapters: totalChapters });

        return res.status(201).json({
            success: true,
            data: normalizeChapter(chapter, chapterNumber)
        });
    } catch (error) {
        console.error('Loi addChapter:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET /api/chapters/story/:storyId?page=1&limit=50
exports.getChaptersByStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const actualBookId = await resolveBookId(storyId); // Dịch ra _id

        if (!actualBookId) {
            return res.status(404).json({ success: false, message: 'Khong tim thay truyen' });
        }
        
        const page = parsePositiveInt(req.query?.page, 1);
        const limit = Math.min(parsePositiveInt(req.query?.limit, DEFAULT_LIMIT), MAX_LIMIT);
        const skip = (page - 1) * limit;

        const query = { book_id: actualBookId }; // Truy vấn chính xác bằng book_id

        const [chapters, total] = await Promise.all([
            Chapter.find(query)
                .select('_id title chapter_number chapterNumber createdAt updatedAt')
                .sort({ chapter_number: 1, chapterNumber: 1, createdAt: 1 })
                .skip(skip)
                .limit(limit),
            Chapter.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: total > 0 ? Math.ceil(total / limit) : 1,
            data: chapters.map((chapter, index) =>
                normalizeChapter(chapter, skip + index + 1)
            )
        });
    } catch (error) {
        console.error('Loi getChaptersByStory:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/chapters/story/:storyId/chapter/:chapterNumber
exports.getChapterByStoryAndNumber = async (req, res) => {
    try {
        const { storyId, chapterNumber } = req.params;
        const normalizedChapterNumber = parsePositiveInt(chapterNumber);
        const actualBookId = await resolveBookId(storyId);

        if (!actualBookId) {
            return res.status(404).json({ success: false, message: 'Khong tim thay truyen' });
        }

        const chapter = await Chapter.findOne({
            book_id: actualBookId, // Truy vấn chính xác bằng book_id
            chapter_number: normalizedChapterNumber
        });

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chuong khong ton tai.'
            });
        }

        try {
            await incrementBookViewStats(resolveBookIdFromChapter(chapter, storyId));
        } catch (viewError) {
            console.error('Loi cap nhat view truyen:', viewError);
        }

        return res.status(200).json({
            success: true,
            data: normalizeChapter(chapter, normalizedChapterNumber)
        });
    } catch (error) {
        console.error('Loi getChapterByStoryAndNumber:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/chapters/:id
exports.getChapterDetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Chapter id khong hop le.' });
        }

        const chapter = await Chapter.findById(id);
        if (!chapter) {
            return res.status(404).json({ success: false, message: 'Chuong khong ton tai.' });
        }

        try {
            await incrementBookViewStats(resolveBookIdFromChapter(chapter));
        } catch (viewError) {
            console.error('Loi cap nhat view truyen:', viewError);
        }

        return res.status(200).json({
            success: true,
            data: normalizeChapter(chapter)
        });
    } catch (error) {
        console.error('Loi getChapterDetail:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PUT /api/chapters/:id
exports.updateChapter = async (req, res) => {
    try {
        const { id } = req.params;
        const { chapter_number, title, content } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID chương không hợp lệ.' });
        }

        const chapter = await Chapter.findById(id);
        if (!chapter) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chương.' });
        }

        const newChapterNumber = parseFloat(chapter_number);
        
        // KIỂM TRA TOÀN VẸN DỮ LIỆU: Nếu đổi số chương, phải đảm bảo số mới chưa bị trùng
        if (newChapterNumber && newChapterNumber !== chapter.chapter_number) {
            const isDuplicate = await Chapter.findOne({
                book_id: chapter.book_id,
                chapter_number: newChapterNumber
            });
            if (isDuplicate) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Chương ${newChapterNumber} đã tồn tại trong bộ truyện này. Vui lòng chọn số khác!` 
                });
            }
            chapter.chapter_number = newChapterNumber;
        }

        if (title !== undefined) chapter.title = title.trim();
        if (content) chapter.content = content.trim();

        await chapter.save();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật chương thành công.',
            data: normalizeChapter(chapter, chapter.chapter_number)
        });
    } catch (error) {
        console.error('Lỗi API cập nhật chương:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật chương.' });
    }
};

// DELETE /api/chapters
exports.deleteChapters = async (req, res) => {
    try {
        const { chapterIds } = req.body; // Mảng chứa các ID chương cần xóa

        if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có chương nào được chọn để xóa.' });
        }

        // 1. Tìm ra các chương này thuộc về cuốn truyện nào (để lát nữa cập nhật lại tổng số chương)
        const chaptersToDelete = await Chapter.find({ _id: { $in: chapterIds } });
        if (chaptersToDelete.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy các chương này trong Database.' });
        }

        // Lấy danh sách book_id duy nhất (Thường là chỉ có 1 book_id vì ta đang xóa trong trang EditBook)
        const bookIdsToUpdate = [...new Set(chaptersToDelete.map(ch => ch.book_id.toString()))];

        // 2. Thực hiện xóa hàng loạt
        await Chapter.deleteMany({ _id: { $in: chapterIds } });

        // 3. ĐẢM BẢO TOÀN VẸN DỮ LIỆU: Đếm và cập nhật lại biến total_chapters trong bảng Books
        for (const bId of bookIdsToUpdate) {
            const remainingCount = await Chapter.countDocuments({ book_id: bId });
            await Book.findByIdAndUpdate(bId, { total_chapters: remainingCount });
        }

        return res.status(200).json({
            success: true,
            message: `Đã xóa thành công ${chapterIds.length} chương.`
        });
    } catch (error) {
        console.error('Lỗi API xóa chương:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa chương.' });
    }
};