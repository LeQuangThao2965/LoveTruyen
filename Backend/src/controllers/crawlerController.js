const { crawlLatestBooksFromTruyenChuCV, scrapeStory } = require('../crawler/scraper');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;
const DEFAULT_CHAPTER_CONCURRENCY = 4;
const MAX_CHAPTER_CONCURRENCY = 8;

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

// Crawl 1 truyen + toan bo chuong de luu vao books/chapters.
exports.importStoryWithChapters = async (req, res) => {
    try {
        const storyUrl = resolveSourceUrl(req);
        if (!storyUrl) {
            return res.status(400).json({
                error: 'Thieu URL truyen can crawl.'
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
