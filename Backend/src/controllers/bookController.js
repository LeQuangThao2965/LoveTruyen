const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');

const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;
const COVER_UPLOAD_DIR = path.resolve(__dirname, '../../../frontend/public/uploaded_covers');
const DEFAULT_GET_BOOK_LIMIT = 100;
const MAX_GET_BOOK_LIMIT = 200;
const DEFAULT_PAGE = 1;
const DEFAULT_HOT_LIMIT = 10;
const MAX_HOT_LIMIT = 10;
const MIME_TO_EXTENSION = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp'
};

const generateSlug = (text) => {
    return text.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Xóa dấu tiếng Việt
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '') // Xóa ký tự đặc biệt
        .replace(/\s+/g, '-') // Biến khoảng trắng thành gạch nối
        .replace(/-+/g, '-') // Xóa gạch nối thừa
        .trim();
};

const sanitizeFileName = (value = '') => {
    const parsedName = path.parse(value).name || 'cover';
    return parsedName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80);
};

const parseBase64Image = (value = '') => {
    const matched = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matched) return null;

    const mimeType = matched[1].toLowerCase();
    const base64Data = matched[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (!buffer.length) return null;

    return { mimeType, buffer };
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const getWeekStart = (value = new Date()) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);

    // Monday is the first day of week.
    const day = date.getDay();
    const offset = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - offset);

    return date;
};

const latestChapterLookupStage = {
    $lookup: {
        from: 'chapters',
        let: {
            bookId: '$_id',
            bookIdString: { $toString: '$_id' }
        },
        pipeline: [
            {
                // Ho tro ca 2 schema chapter cu/moi:
                // - book_id + chapter_number
                // - storyId + chapterNumber
                $match: {
                    $expr: {
                        $or: [
                            { $eq: ['$book_id', '$$bookId'] },
                            { $eq: ['$storyId', '$$bookId'] },
                            { $eq: ['$storyId', '$$bookIdString'] }
                        ]
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 2 },
            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    chapter_number: {
                        $ifNull: ['$chapter_number', '$chapterNumber']
                    }
                }
            }
        ],
        as: 'latest_chapters'
    }
};

// GET /api/books?uploader_id=<id>&status=<status>&limit=12
// Tra ve danh sach truyen kem 2 chapter moi nhat cho moi truyen.
exports.getBooks = async (req, res) => {
    try {
        const { uploader_id, status, limit, page } = req.query;
        const query = {};

        if (uploader_id) query.uploader_id = uploader_id;
        if (status) query.status = status;

        const safeLimit = Math.min(
            parsePositiveInt(limit, DEFAULT_GET_BOOK_LIMIT),
            MAX_GET_BOOK_LIMIT
        );
        const safePage = parsePositiveInt(page, DEFAULT_PAGE);
        const skip = (safePage - 1) * safeLimit;

        const [books, total] = await Promise.all([
            Book.aggregate([
                { $match: query },
                { $sort: { updatedAt: -1 } },
                { $skip: skip },
                { $limit: safeLimit },
                latestChapterLookupStage
            ]),
            Book.countDocuments(query)
        ]);

        return res.status(200).json({
            books,
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: total > 0 ? Math.ceil(total / safeLimit) : 1
        });
    } catch (error) {
        console.error('Loi API lay danh sach truyen:', error);
        return res.status(500).json({
            error: 'Khong the lay danh sach truyen. Vui long thu lai.'
        });
    }
};

// GET /api/books/hot-weekly?limit=10
exports.getHotBooksWeekly = async (req, res) => {
    try {
        const safeLimit = Math.min(
            parsePositiveInt(req.query?.limit, DEFAULT_HOT_LIMIT),
            MAX_HOT_LIMIT
        );
        const weekStart = getWeekStart();

        const books = await Book.aggregate([
            {
                $addFields: {
                    weekly_views_current: {
                        $cond: [
                            { $eq: ['$weekly_views_start', weekStart] },
                            { $ifNull: ['$weekly_views', 0] },
                            0
                        ]
                    },
                    total_views: { $ifNull: ['$total_views', 0] }
                }
            },
            {
                $sort: {
                    weekly_views_current: -1,
                    total_views: -1,
                    updatedAt: -1
                }
            },
            { $limit: safeLimit },
            latestChapterLookupStage
        ]);

        return res.status(200).json({
            books,
            weekStart
        });
    } catch (error) {
        console.error('Loi API lay truyen hot tuan:', error);
        return res.status(500).json({
            error: 'Khong the lay danh sach truyen hot tuan. Vui long thu lai.'
        });
    }
};

// GET /api/books/:idOrSlug
exports.getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        let book;

        // Kiểm tra xem Param truyền vào là _id (24 ký tự) hay là slug (tên chữ)
        if (mongoose.Types.ObjectId.isValid(id)) {
            book = await Book.findById(id);
        } else {
            book = await Book.findOne({ slug: id }); // Tìm bằng slug
        }

        if (!book) {
            return res.status(404).json({ error: 'Khong tim thay truyen.' });
        }

        return res.status(200).json({ book });
    } catch (error) {
        console.error('Loi API lay chi tiet truyen:', error);
        return res.status(500).json({ error: 'Khong the lay chi tiet truyen.' });
    }
};

// POST /api/books/upload-cover
exports.uploadBookCover = async (req, res) => {
    try {
        const { file_name, file_base64 } = req.body || {};

        if (!file_name || !file_base64) {
            return res.status(400).json({
                error: 'Thieu du lieu upload cover: file_name, file_base64.'
            });
        }

        const parsedImage = parseBase64Image(file_base64);
        if (!parsedImage) {
            return res.status(400).json({
                error: 'Dinh dang anh khong hop le.'
            });
        }

        if (parsedImage.buffer.length > MAX_COVER_SIZE_BYTES) {
            return res.status(400).json({
                error: 'Anh bia vuot qua 5MB.'
            });
        }

        const extension = MIME_TO_EXTENSION[parsedImage.mimeType];
        if (!extension) {
            return res.status(415).json({
                error: 'Dinh dang anh chua duoc ho tro.'
            });
        }

        await fs.promises.mkdir(COVER_UPLOAD_DIR, { recursive: true });

        const safeName = sanitizeFileName(file_name);
        const finalFileName = `${Date.now()}-${safeName}.${extension}`;
        const finalFilePath = path.join(COVER_UPLOAD_DIR, finalFileName);

        await fs.promises.writeFile(finalFilePath, parsedImage.buffer);

        const coverPublicUrl = `${req.protocol}://${req.get('host')}/uploaded_covers/${finalFileName}`;

        return res.status(201).json({
            message: 'Upload cover thanh cong.',
            cover_url: coverPublicUrl
        });
    } catch (error) {
        console.error('Loi upload cover:', error);
        return res.status(500).json({
            error: 'Khong the upload anh bia. Vui long thu lai.'
        });
    }
};

// POST /api/books
exports.createBook = async (req, res) => {
    try {
        const { title, author, description, cover_url, uploader_id } = req.body;

        // Chuan hoa dau vao de tranh luu gia tri khong hop le.
        const normalizedTitle = typeof title === 'string' ? title.trim() : '';
        const normalizedAuthor = typeof author === 'string' ? author.trim() : '';
        const normalizedDescription = typeof description === 'string' ? description.trim() : '';
        const normalizedCoverUrl = typeof cover_url === 'string' ? cover_url.trim() : '';
        const normalizedUploaderId = typeof uploader_id === 'string' ? uploader_id.trim() : '';

        if (!normalizedTitle || !normalizedAuthor || !normalizedUploaderId) {
            return res.status(400).json({
                error: 'Thieu thong tin bat buoc: title, author, uploader_id.'
            });
        }

        // Tạo slug, thêm vài mã số random ở cuối để tránh bị trùng lặp nếu 2 truyện trùng tên
        const baseSlug = generateSlug(normalizedTitle);
        const uniqueSlug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;

        const newBook = new Book({
            title: normalizedTitle,
            slug: uniqueSlug, // <--- THÊM DÒNG NÀY VÀO DB
            author: normalizedAuthor,
            description: normalizedDescription,
            cover_url: normalizedCoverUrl,
            uploader_id: normalizedUploaderId
        });
        /////////////////////////////////////////////////////////////////////////////////////
        const savedBook = await newBook.save();

        return res.status(201).json({
            message: 'Dang truyen thanh cong!',
            book: savedBook
        });


    } catch (error) {
        console.error('Loi API dang truyen:', error);
        return res.status(500).json({
            error: 'May chu dang gap su co, vui long thu lai!'
        });
    }
};

// GET /api/books/host-stats?uploader_id=<id>&all=true
// Tra ve thong ke tong quan cho Host/Admin.
// - uploader_id: loc theo nguoi dang (host)
// - all=true: admin xem thong ke toan bo he thong
exports.getHostStats = async (req, res) => {
    try {
        const { uploader_id, all } = req.query;
        const showAll = all === 'true';

        if (!showAll && (!uploader_id || typeof uploader_id !== 'string' || !uploader_id.trim())) {
            return res.status(400).json({ error: 'Thieu uploader_id.' });
        }

        const weekStart = getWeekStart();
        const matchStage = showAll ? {} : { uploader_id: uploader_id.trim() };
        const findFilter = showAll ? {} : { uploader_id: uploader_id.trim() };

        const [aggregateResult, topBooks] = await Promise.all([
            Book.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalBooks: { $sum: 1 },
                        totalViews: { $sum: { $ifNull: ['$total_views', 0] } },
                        totalChapters: { $sum: { $ifNull: ['$total_chapters', 0] } },
                        weeklyViews: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$weekly_views_start', weekStart] },
                                    { $ifNull: ['$weekly_views', 0] },
                                    0
                                ]
                            }
                        },
                        statusList: { $push: { $ifNull: ['$status', 'Đang cập nhật'] } }
                    }
                }
            ]),
            Book.find(
                findFilter,
                { title: 1, cover_url: 1, total_views: 1, total_chapters: 1, status: 1 }
            )
                .sort({ total_views: -1 })
                .limit(5)
                .lean()
        ]);

        const stats = aggregateResult[0] ?? {
            totalBooks: 0,
            totalViews: 0,
            totalChapters: 0,
            weeklyViews: 0,
            statusList: []
        };

        // Dem so truyen theo trang thai
        const booksByStatus = stats.statusList.reduce((acc, status) => {
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return res.status(200).json({
            totalBooks: stats.totalBooks,
            totalViews: stats.totalViews,
            weeklyViews: stats.weeklyViews,
            totalChapters: stats.totalChapters,
            booksByStatus,
            topBooks
        });
    } catch (error) {
        console.error('Loi API host stats:', error);
        return res.status(500).json({ error: 'Khong the lay thong ke. Vui long thu lai.' });
// GET /api/books/suggestions?q=<keyword>
exports.getBookSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || typeof q !== 'string' || q.trim().length === 0) {
            return res.json([]);
        }

        const keyword = q.trim().toLowerCase();
        const limit = Math.min(parsePositiveInt(req.query.limit, 8), 12);

        // Tìm kiếm theo title và author với regex case-insensitive
        const books = await Book.aggregate([
            {
                $match: {
                    $or: [
                        { title: { $regex: keyword, $options: 'i' } },
                        { author: { $regex: keyword, $options: 'i' } }
                    ]
                }
            },
            {
                $addFields: {
                    // Tính điểm relevance cho việc sắp xếp
                    relevanceScore: {
                        $add: [
                            { $cond: [{ $regexMatch: { input: { $toLower: '$title' }, regex: keyword } }, 10, 0] },
                            { $cond: [{ $eq: [{ $toLower: '$title' }, keyword] }, 5, 0] },
                            { $cond: [{ $regexMatch: { input: { $toLower: '$author' }, regex: keyword } }, 3, 0] },
                            { $cond: [{ $eq: [{ $toLower: '$author' }, keyword] }, 2, 0] }
                        ]
                    }
                }
            },
            { $sort: { relevanceScore: -1, total_views: -1, updatedAt: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    author: 1,
                    cover_url: 1,
                    total_views: 1,
                    relevanceScore: 1
                }
            }
        ]);

        return res.json(books);
    } catch (error) {
        console.error('Loi API suggestions:', error);
        return res.status(500).json({
            error: 'Khong the lay danh sach gợi ý. Vui long thu lai.'
        });
    }
};

// GET /api/books/search-advanced
exports.getBooksAdvancedSearch = async (req, res) => {
    try {
        const {
            title,
            genres,
            year_start,
            year_end,
            status,
            sort_by = 'relevance',
            sort_order = 'desc',
            page = 1,
            limit = 20
        } = req.query;

        const safePage = parsePositiveInt(page, DEFAULT_PAGE);
        const safeLimit = Math.min(parsePositiveInt(limit, DEFAULT_GET_BOOK_LIMIT), MAX_GET_BOOK_LIMIT);
        const skip = (safePage - 1) * safeLimit;

        // Build match conditions
        const matchConditions = {};

        // Genres filter (AND condition - phải có tất cả genres được chọn)
        if (genres && typeof genres === 'string') {
            const genresArray = genres.split(',').map(g => g.trim()).filter(g => g);
            if (genresArray.length > 0) {
                matchConditions.genres = { $all: genresArray };
            }
        }

        // Year range filter
        if (year_start || year_end) {
            matchConditions.createdAt = {};
            if (year_start) {
                const startYear = parsePositiveInt(year_start, 2000);
                matchConditions.createdAt.$gte = new Date(`${startYear}-01-01T00:00:00.000Z`);
            }
            if (year_end) {
                const endYear = parsePositiveInt(year_end, new Date().getFullYear());
                matchConditions.createdAt.$lte = new Date(`${endYear}-12-31T23:59:59.999Z`);
            }
        }

        // Status filter
        if (status && typeof status === 'string' && status.trim()) {
            matchConditions.status = status.trim();
        }

        // Add relevance scoring for title search
        let relevanceStage = {};
        let titleMatchConditions = {};
        
        if (title && typeof title === 'string' && title.trim()) {
            const searchTerm = title.trim();
            
            // Tạo search term không dấu
            const removeDiacritics = (str) => {
                return str.normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[đĐ]/g, d => d === 'đ' ? 'd' : 'D');
            };
            
            const searchTermNoDiacritics = removeDiacritics(searchTerm);
            
            // Tạo điều kiện tìm kiếm: có dấu HOẶC không dấu
            titleMatchConditions = {
                $or: [
                    { title: { $regex: searchTerm, $options: 'i' } }, // Tìm kiếm có dấu
                    { title: { $regex: searchTermNoDiacritics, $options: 'i' } } // Tìm kiếm không dấu
                ]
            };
            
            // TODO: Implement proper relevance scoring sau
            /*
            relevanceStage = {
                $addFields: {
                    relevanceScore: {
                        $cond: [
                            { $ne: [
                                { $indexOfCP: [{ $toLower: '$title' }, title.trim().toLowerCase()] },
                                -1
                            ] }
                        ],
                        then: 10,
                        else: 0
                    }
                }
            };
            */
        }

        // Build sort options
        let sortOptions = {};
        if (sort_by) {
            switch (sort_by) {
                case 'relevance':
                    // Mặc định: relevance score (nếu có title search) + updated_at
                    sortOptions = { 
                        total_views: -1, // Phụ cho relevance
                        updated_at: -1
                    };
                    break;
                case 'updated_at':
                    sortOptions = { updated_at: sort_order === 'desc' ? -1 : 1 };
                    break;
                case 'createdAt':
                    sortOptions = { createdAt: sort_order === 'desc' ? -1 : 1 };
                    break;
                case 'total_views':
                    sortOptions = { total_views: sort_order === 'desc' ? -1 : 1 };
                    break;
                case 'total_chapters':
                    sortOptions = { total_chapters: sort_order === 'desc' ? -1 : 1 };
                    break;
                case 'rating':
                    sortOptions = { rating: sort_order === 'desc' ? -1 : 1 };
                    break;
                case 'status':
                    // Sắp xếp theo trạng thái: Hoàn thành > Đang cập nhật > Tạm dừng
                    sortOptions = { 
                        $switch: {
                            branches: [
                                { case: { $eq: ['$status', 'Hoàn thành'] }, then: 1 },
                                { case: { $eq: ['$status', 'completed'] }, then: 1 },
                                { case: { $eq: ['$status', 'Đang cập nhật'] }, then: 2 },
                                { case: { $eq: ['$status', 'on-going'] }, then: 2 },
                                { case: { $eq: ['$status', 'Tạm dừng'] }, then: 3 },
                                { case: { $eq: ['$status', 'dropped'] }, then: 3 }
                            ],
                            default: 99
                        }
                    };
                    break;
                default:
                    sortOptions = { updated_at: -1, total_views: -1 };
            }
        } else {
            // Mặc định nếu không có sort_by: updated_at + total_views
            sortOptions = { updated_at: -1, total_views: -1 };
        }

        // Execute aggregation
        const aggregationPipeline = [
            { $match: matchConditions }
        ];

        // Add title search conditions if searching by title
        if (Object.keys(titleMatchConditions).length > 0) {
            aggregationPipeline.push({ $match: titleMatchConditions });
        }

        // Add relevance stage if searching by title
        if (Object.keys(relevanceStage).length > 0) {
            aggregationPipeline.push(relevanceStage);
        }

        // Add sort stage
        aggregationPipeline.push({ $sort: sortOptions });

        // Add pagination and lookup stages
        aggregationPipeline.push(
            { $skip: skip },
            { $limit: safeLimit },
            {
                $lookup: {
                    from: 'chapters',
                    let: { bookId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$book_id', '$$bookId'] } } },
                        { $sort: { chapter_number: -1 } },
                        { $limit: 2 },
                        { $project: { title: 1, chapter_number: 1 } }
                    ],
                    as: 'latest_chapters'
                }
            },
            {
                $project: {
                    title: 1,
                    author: 1,
                    description: 1,
                    cover_url: 1,
                    genres: 1,
                    status: 1,
                    total_chapters: 1,
                    total_views: 1,
                    weekly_views: 1,
                    latest_chapters: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        );

        const [books, total] = await Promise.all([
            Book.aggregate(aggregationPipeline),
            Book.countDocuments(matchConditions)
        ]);

        const safeTotal = Math.max(0, Number(total) || 0);
        const totalPages = Math.ceil(safeTotal / safeLimit) || 1;

        return res.json({
            books: books || [],
            pagination: {
                current: safePage,
                totalPages: totalPages,
                total: safeTotal,
                limit: safeLimit
            },
            filters: {
                title: title || '',
                genres: genres || '',
                year_start: year_start || '',
                year_end: year_end || '',
                status: status || '',
                sort_by: sort_by || 'relevance',
                sort_order: sort_order || 'desc'
            }
        });
    } catch (error) {
        console.error('Lỗi API advanced search:', error);
        return res.status(500).json({
            error: 'Không thể thực hiện tìm kiếm nâng cao. Vui lòng thử lại.'
        });
    }
};
//////////////////////////////////////////////////////////////////////////
// PUT /api/books/:id
exports.updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, description, cover_url, status, genres } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID truyện không hợp lệ.' });
        }

        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy truyện.' });
        }

        // Cập nhật các trường dữ liệu
        if (title) book.title = title.trim();
        if (author) book.author = author.trim();
        if (description !== undefined) book.description = description.trim();
        if (cover_url !== undefined) book.cover_url = cover_url.trim();
        if (status) book.status = status;
        if (Array.isArray(genres)) book.genres = genres;

        // Lưu ý: Không tự động đổi Slug khi đổi Tên truyện để tránh lỗi 404 cho các link đã share (Chuẩn SEO)

        const updatedBook = await book.save();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin truyện thành công.',
            book: updatedBook
        });
    } catch (error) {
        console.error('Lỗi API cập nhật truyện:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật truyện.' });
    }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// DELETE /api/books/:id
exports.deleteBook = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID truyện không hợp lệ.' });
        }

        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ error: 'Không tìm thấy truyện.' });
        }

        // BẢO ĐẢM TOÀN VẸN DỮ LIỆU: Xóa toàn bộ chương liên quan TRƯỚC
        await Chapter.deleteMany({ book_id: id });

        // Sau khi đã dọn sạch chương, tiến hành xóa truyện
        await Book.findByIdAndDelete(id);

        return res.status(200).json({ 
            message: 'Đã xóa truyện và toàn bộ chương liên quan thành công.' 
        });
    } catch (error) {
        console.error('Lỗi API xóa truyện:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ khi xóa truyện.' });
    }
};
