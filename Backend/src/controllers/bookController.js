const Book = require('../models/Book');

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
