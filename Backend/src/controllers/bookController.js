const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Book = require('../models/Book');

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
// API gợi ý tìm kiếm (autocomplete)
exports.getBookSuggestions = async (req, res) => {
    try {
        const { q: query, limit = 8 } = req.query;

        if (!query || query.trim().length < 2) {
            return res.json({ suggestions: [] });
        }

        const safeLimit = Math.min(10, Math.max(1, Number(limit) || 8));

        const suggestions = await Book.aggregate([
            {
                $match: {
                    $text: {
                        $search: query.trim(),
                        $caseSensitive: false,
                        $diacriticSensitive: false
                    }
                }
            },
            {
                $addFields: {
                    score: { $meta: 'textScore' },
                    // Tính relevance score dựa trên match với title
                    titleMatch: {
                        $cond: {
                            if: { $eq: [{ $strLenCP: { $toLower: query } }, { $strLenCP: { $toLower: '$title' } }] },
                            then: 1,
                            else: {
                                $cond: {
                                    if: { $regexMatch: { input: { $toLower: '$title' }, regex: { $toLower: query } } },
                                    then: 0.8,
                                    else: 0.5
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    finalScore: {
                        $multiply: ['$score', '$titleMatch', 10]
                    }
                }
            },
            { $sort: { finalScore: -1, total_views: -1 } },
            { $limit: safeLimit },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    cover_url: 1,
                    total_views: 1,
                    finalScore: 1
                }
            }
        ]);

        const PLACEHOLDER_COVER = 'https://placehold.co/60x80/e5e7eb/6b7280?text=No+Cover';

        res.json({
            suggestions: suggestions.map(book => ({
                id: book._id,
                title: book.title,
                thumbnail: book.cover_url || PLACEHOLDER_COVER,
                views: book.total_views || 0,
                score: book.finalScore
            })),
            query: query.trim(),
            total: suggestions.length
        });

    } catch (error) {
        console.error('Lỗi lấy gợi ý sách:', error);
        res.status(500).json({
            error: 'Lỗi server khi lấy gợi ý sách',
            message: error.message
        });
    }
};

// Tìm kiếm truyện nâng cao
exports.searchBooks = async (req, res) => {
    try {
        const {
            q: query,
            genre,
            status,
            year_start,
            year_end,
            sort = 'updatedAt',
            page = 1,
            limit = 12
        } = req.query;

        // Build match stage
        const matchStage = {};

        // Text search
        if (query && query.trim()) {
            matchStage.$text = {
                $search: query.trim(),
                $caseSensitive: false,
                $diacriticSensitive: false
            };
        }

        // Multi-genre filter (support comma-separated genres)
        if (genre && genre.trim()) {
            const genres = genre.split(',').map(g => g.trim()).filter(g => g);
            if (genres.length > 0) {
                matchStage.genres = {
                    $in: genres
                };
            }
        }

        // Status filter
        if (status && status.trim()) {
            matchStage.status = status.trim();
        }

        // Year range filter
        if (year_start || year_end) {
            matchStage.publication_year = {};
            if (year_start) {
                const startYear = parseInt(year_start);
                if (!isNaN(startYear) && startYear >= 1900) {
                    matchStage.publication_year.$gte = startYear;
                }
            }
            if (year_end) {
                const endYear = parseInt(year_end);
                if (!isNaN(endYear) && endYear <= new Date().getFullYear() + 1) {
                    matchStage.publication_year.$lte = endYear;
                }
            }
            // Remove empty year filter if no valid conditions
            if (Object.keys(matchStage.publication_year).length === 0) {
                delete matchStage.publication_year;
            }
        }

        // Sort options
        let sortStage = {};
        switch (sort) {
            case 'total_views':
                sortStage = { total_views: -1, updatedAt: -1 };
                break;
            case 'title':
                sortStage = { title: 1, updatedAt: -1 };
                break;
            case 'publication_year':
                sortStage = { publication_year: -1, updatedAt: -1 };
                break;
            case 'createdAt':
                sortStage = { createdAt: -1 };
                break;
            case 'updatedAt':
            default:
                sortStage = { updatedAt: -1 };
                break;
        }

        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
        const skip = (safePage - 1) * safeLimit;

        const [books, total] = await Promise.all([
            Book.aggregate([
                { $match: matchStage },
                { $sort: sortStage },
                { $skip: skip },
                { $limit: safeLimit },
                {
                    $lookup: {
                        from: 'chapters',
                        localField: '_id',
                        foreignField: 'book_id',
                        as: 'latest_chapters',
                        pipeline: [
                            { $sort: { chapter_number: -1 } },
                            { $limit: 2 }
                        ]
                    }
                },
                {
                    $project: {
                        title: 1,
                        author: 1,
                        description: 1,
                        cover_url: 1,
                        genres: 1,
                        publication_year: 1,
                        status: 1,
                        total_chapters: 1,
                        total_views: 1,
                        weekly_views_current: 1,
                        weekly_views_start: 1,
                        latest_chapters: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        // Add text search score if searching
                        ...(query && { score: { $meta: 'textScore' } })
                    }
                }
            ]),
            Book.countDocuments(matchStage)
        ]);

        const totalPages = Math.ceil(total / safeLimit);

        res.json({
            books,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages,
            hasNextPage: safePage < totalPages,
            hasPrevPage: safePage > 1
        });

    } catch (error) {
        console.error('Lỗi tìm kiếm sách:', error);
        res.status(500).json({
            error: 'Lỗi server khi tìm kiếm sách',
            message: error.message
        });
    }
};

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

// GET /api/books/:id
exports.getBookById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Book id khong hop le.' });
        }

        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ error: 'Khong tim thay truyen.' });
        }

        return res.status(200).json({ book });
    } catch (error) {
        console.error('Loi API lay chi tiet truyen:', error);
        return res.status(500).json({
            error: 'Khong the lay chi tiet truyen. Vui long thu lai.'
        });
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

        const newBook = new Book({
            title: normalizedTitle,
            author: normalizedAuthor,
            description: normalizedDescription,
            cover_url: normalizedCoverUrl,
            uploader_id: normalizedUploaderId
        });

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
