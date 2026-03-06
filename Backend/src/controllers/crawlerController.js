const { crawlLatestBooksFromTruyenChuCV } = require('../crawler/scraper');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

const resolveLimit = (req) => {
    const rawLimit = req?.query?.limit ?? req?.body?.limit ?? process.env.CRAWLER_LATEST_LIMIT ?? DEFAULT_LIMIT;
    const parsed = Number(rawLimit);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_LIMIT;
    }

    return Math.min(Math.floor(parsed), MAX_LIMIT);
};

// Chay crawl thu cong de lay title + cover tu truyenchucv.org.
exports.runLatestBookCrawl = async (req, res) => {
    try {
        const limit = resolveLimit(req);
        const result = await crawlLatestBooksFromTruyenChuCV(limit);

        return res.status(200).json({
            message: 'Crawler da chay xong.',
            ...result
        });
    } catch (error) {
        console.error('[CrawlerController] Loi crawl thu cong:', error);
        return res.status(500).json({
            error: 'Khong the crawl du lieu luc nay.',
            detail: error.message
        });
    }
};
