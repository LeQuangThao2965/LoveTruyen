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