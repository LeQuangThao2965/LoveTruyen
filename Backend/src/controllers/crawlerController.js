const { crawlLatestBooksFromTruyenChuCV } = require('../crawler/scraper');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

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

// Chay crawl thu cong de lay title + cover tu truyenchucv.org.
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
    }
};
