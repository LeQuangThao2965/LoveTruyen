const mongoose = require('mongoose');
const { crawlLatestBooksFromTruyenChuCV, scrapeStory } = require('../crawler/scraper');
const Book = require('../models/Book');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;
const DEFAULT_CHAPTER_CONCURRENCY = 4;
const MAX_CHAPTER_CONCURRENCY = 8;
const DEFAULT_PAGE = 1;

const resolveLimit = (req) => {
    const rawLimit = req?.query?.limit ?? req?.body?.limit ?? process.env.CRAWLER_LATEST_LIMIT ?? DEFAULT_LIMIT;
    const parsed = Number(rawLimit);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_LIMIT;
    }

    return Math.min(Math.floor(parsed), MAX_LIMIT);
};

const resolveSourceUrl = (req) => {
    const rawUrl = req?.query?.url ?? req?.body?.url;
    if (typeof rawUrl !== 'string') return undefined;

    const normalized = rawUrl.trim();
    return normalized || undefined;
};

const resolveChapterConcurrency = (req) => {
    const raw = req?.query?.chapter_concurrency ?? req?.body?.chapter_concurrency ?? DEFAULT_CHAPTER_CONCURRENCY;
    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_CHAPTER_CONCURRENCY;
    }

    return Math.min(Math.floor(parsed), MAX_CHAPTER_CONCURRENCY);
};

const resolveChapterLimit = (req) => {
    const raw = req?.query?.chapter_limit ?? req?.body?.chapter_limit;
    if (raw === undefined || raw === null || raw === '') return 0;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;

    return Math.floor(parsed);
};

const resolvePage = (req) => {
    const raw = req?.query?.page ?? req?.body?.page ?? DEFAULT_PAGE;
    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_PAGE;
    }

    return Math.floor(parsed);
};

const resolveBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;

    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false;

    return fallback;
};

const handleCrawlerError = (res, error) => {
    if (error?.message === 'URL crawl khong hop le.') {
        return res.status(400).json({
            error: error.message
        });
    }

    console.error('[CrawlerController] Loi crawl thu cong:', error);
    return res.status(500).json({
        error: 'Khong the crawl du lieu luc nay.',
        detail: error.message
    });
};

// Chay crawl thu cong de lay title + cover tu URL.
exports.runLatestBookCrawl = async (req, res) => {
    try {
        const limit = resolveLimit(req);
        const sourceUrl = resolveSourceUrl(req);
        const result = await crawlLatestBooksFromTruyenChuCV(limit, sourceUrl);

        return res.status(200).json({
            message: 'Crawler da chay xong.',
            ...result
        });
    } catch (error) {
        return handleCrawlerError(res, error);
    }
};

// Lay danh sach truyen da crawl de chon crawl chapter.
exports.getCrawledBooks = async (req, res) => {
    try {
        const page = resolvePage(req);
        const limit = resolveLimit(req);
        const skip = (page - 1) * limit;
        const includeCompleted = resolveBoolean(req?.query?.include_completed, false);

        const query = {
            crawler_source_url: { $exists: true, $ne: '' }
        };

        if (!includeCompleted) {
            query.total_chapters = { $lte: 0 };
        }

        const [books, total] = await Promise.all([
            Book.find(query)
                .select('_id title author cover_url crawler_source_url total_chapters updatedAt')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Book.countDocuments(query)
        ]);

        return res.status(200).json({
            books,
            page,
            limit,
            total,
            totalPages: total > 0 ? Math.ceil(total / limit) : 1
        });
    } catch (error) {
        return handleCrawlerError(res, error);
    }
};

// Crawl 1 truyen + toan bo chuong de luu vao books/chapters.
exports.importStoryWithChapters = async (req, res) => {
    try {
        const storyUrl = resolveSourceUrl(req);
        if (!storyUrl) {
            return res.status(400).json({
                error: 'Thieu URL truyen can crawl.'
            });
        }

        const force = resolveBoolean(req?.body?.force ?? req?.query?.force, false);
        const existingBook = await Book.findOne({ crawler_source_url: storyUrl })
            .select('_id title total_chapters')
            .lean();
        if (existingBook && Number(existingBook.total_chapters || 0) > 0 && !force) {
            return res.status(200).json({
                skipped: true,
                reason: 'already_has_chapters',
                message: 'Truyen da co chapter, bo qua crawl.',
                book: existingBook
            });
        }

        const chapterConcurrency = resolveChapterConcurrency(req);
        const chapterLimit = resolveChapterLimit(req);

        const result = await scrapeStory(storyUrl, {
            chapter_concurrency: chapterConcurrency,
            chapter_limit: chapterLimit
        });

        return res.status(200).json({
            message: 'Crawl truyen + chuong thanh cong.',
            ...result
        });
    } catch (error) {
        return handleCrawlerError(res, error);
    }
};

// Crawl chapter cho truyen da ton tai trong DB.
exports.importChaptersByBook = async (req, res) => {
    try {
        const rawBookId = req?.body?.book_id ?? req?.query?.book_id;
        if (!rawBookId || !mongoose.Types.ObjectId.isValid(rawBookId)) {
            return res.status(400).json({
                error: 'book_id khong hop le.'
            });
        }

        const book = await Book.findById(rawBookId);
        if (!book) {
            return res.status(404).json({
                error: 'Khong tim thay truyen can crawl chapter.'
            });
        }

        const force = resolveBoolean(req?.body?.force ?? req?.query?.force, false);
        if ((book.total_chapters || 0) > 0 && !force) {
            return res.status(200).json({
                skipped: true,
                reason: 'already_has_chapters',
                message: 'Truyen da co chapter, bo qua crawl.',
                book: {
                    _id: book._id,
                    title: book.title,
                    total_chapters: book.total_chapters
                }
            });
        }

        const sourceUrl = (book.crawler_source_url || '').trim() || resolveSourceUrl(req);
        if (!sourceUrl) {
            return res.status(400).json({
                error: 'Truyen nay chua co crawler_source_url de crawl chapter.'
            });
        }

        const chapterConcurrency = resolveChapterConcurrency(req);
        const chapterLimit = resolveChapterLimit(req);

        const result = await scrapeStory(sourceUrl, {
            chapter_concurrency: chapterConcurrency,
            chapter_limit: chapterLimit
        });

        return res.status(200).json({
            skipped: false,
            message: 'Crawl chapter thanh cong.',
            ...result
        });
    } catch (error) {
        return handleCrawlerError(res, error);
    }
};
