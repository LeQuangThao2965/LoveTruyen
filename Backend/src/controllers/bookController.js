const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Book = require('../models/Book');

const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;
const COVER_UPLOAD_DIR = path.resolve(__dirname, '../../../frontend/public/uploaded_covers');
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

// GET /api/books?uploader_id=<id>&status=<status>&limit=12
// Tra ve danh sach truyen kem 2 chapter moi nhat cho moi truyen.
exports.getBooks = async (req, res) => {
    try {
        const { uploader_id, status, limit } = req.query;
        const query = {};

        if (uploader_id) query.uploader_id = uploader_id;
        if (status) query.status = status;

        const parsedLimit = Number(limit);
        const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 200)
            : 100;

        const books = await Book.aggregate([
            { $match: query },
            { $sort: { updatedAt: -1 } },
            { $limit: safeLimit },
            {
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
            }
        ]);

        return res.status(200).json({ books });
    } catch (error) {
        console.error('Loi API lay danh sach truyen:', error);
        return res.status(500).json({
            error: 'Khong the lay danh sach truyen. Vui long thu lai.'
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
