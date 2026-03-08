const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const Book = require('../models/Book');

const REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_LIMIT = 10;
const HOME_URL = 'https://truyenchucv.org';
const STATIC_HOST = 'https://static.truyenchucv.org';
const DETAIL_FETCH_DELAY_MS = 600;

const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const fetchHtml = async (url) => {
    const { data } = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    return data;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveSourceUrl = (value = HOME_URL) => {
    const normalized = normalizeText(value || HOME_URL);

    if (!normalized) {
        return HOME_URL;
    }

    try {
        const parsed = new URL(normalized);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Unsupported protocol');
        }
        return parsed.href;
    } catch (error) {
        throw new Error('URL crawl khong hop le.');
    }
};

const extractNextData = ($) => {
    const raw = $('script#__NEXT_DATA__').html();
    if (!raw) {
        throw new Error('Khong tim thay __NEXT_DATA__ tren trang nguon.');
    }

    return JSON.parse(raw);
};

const resolveCoverUrl = (coverPath) => {
    const value = normalizeText(coverPath || '');
    if (!value) return '';

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    try {
        return new URL(value, STATIC_HOST).href;
    } catch (error) {
        return value;
    }
};

const parseLatestBookLinksFromHomepage = ($, limit = DEFAULT_LIMIT) => {
    const links = [];
    const seenHrefs = new Set();

    $('a[href^="/truyen/"]').each((_, element) => {
        if (links.length >= limit) return;

        const anchor = $(element);
        const className = anchor.attr('class') || '';
        const href = normalizeText(anchor.attr('href') || '');
        const title = normalizeText(anchor.attr('title') || anchor.text() || '');

        // Dung theo the mac dinh cua homepage:
        // <a ... class="line-clamp-2 font-medium hover:underline">...</a>
        const isTargetCardAnchor = className.includes('line-clamp-2')
            && className.includes('font-medium')
            && className.includes('hover:underline');

        if (!isTargetCardAnchor || !href || !title) return;
        if (seenHrefs.has(href)) return;

        seenHrefs.add(href);
        links.push({
            title,
            href
        });
    });

    return links.slice(0, limit);
};

const extractCoverFromStoryPage = async (storyUrl) => {
    const html = await fetchHtml(storyUrl);
    const $ = cheerio.load(html);

    // Uu tien og:image vi day la cover on dinh nhat tren trang chi tiet.
    const ogImage = normalizeText($('meta[property="og:image"]').attr('content') || '');
    if (ogImage) {
        return resolveCoverUrl(ogImage);
    }

    // Fallback neu og:image khong co.
    const nextData = extractNextData($);
    const coverFromNextData = normalizeText(
        nextData?.props?.pageProps?.story?.coverUrl
        || nextData?.props?.pageProps?.coverUrl
        || ''
    );

    return resolveCoverUrl(coverFromNextData);
};

const upsertBookLite = async (bookLite) => {
    const titleRegex = new RegExp(`^${escapeRegex(bookLite.title)}$`, 'i');

    let book = await Book.findOne({ title: titleRegex });
    let action = 'updated';

    if (!book) {
        book = new Book({
            title: bookLite.title,
            author: 'Crawler TruyenChuCV',
            description: '',
            cover_url: bookLite.cover_url || '',
            total_chapters: 0,
            uploader_id: process.env.CRAWLER_UPLOADER_ID || 'system_crawler'
        });
        action = 'created';
    } else {
        // Buoc hien tai chi dong bo cover_url neu co.
        if (bookLite.cover_url) {
            book.cover_url = bookLite.cover_url;
        }
    }

    await book.save();
    return { book, action };
};

// Crawl nhanh: lay title + cover cua 10 truyen moi nhat.
const crawlLatestBooksFromTruyenChuCV = async (limit = DEFAULT_LIMIT, sourceUrl = HOME_URL) => {
    const safeLimit = Number.isFinite(Number(limit))
        ? Math.max(1, Math.min(Number(limit), 200))
        : DEFAULT_LIMIT;
    const normalizedSourceUrl = resolveSourceUrl(sourceUrl);

    const html = await fetchHtml(normalizedSourceUrl);
    const $ = cheerio.load(html);
    const latestBookLinks = parseLatestBookLinksFromHomepage($, safeLimit);

    if (latestBookLinks.length === 0) {
        throw new Error('Khong tim thay truyen tu selector card tren homepage.');
    }

    const latestBooks = [];
    for (const item of latestBookLinks) {
        try {
            const storyUrl = new URL(item.href, normalizedSourceUrl).href;
            const cover_url = await extractCoverFromStoryPage(storyUrl);
            latestBooks.push({
                title: item.title,
                href: item.href,
                cover_url
            });
        } catch (error) {
            latestBooks.push({
                title: item.title,
                href: item.href,
                cover_url: ''
            });
            console.error(`[Crawler] Loi lay cover: ${item.title}`, error.message);
        }

        // Delay nhe de giam nguy co bi chan khi fetch nhieu trang lien tiep.
        await sleep(DETAIL_FETCH_DELAY_MS);
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const bookLite of latestBooks) {
        try {
            const { action } = await upsertBookLite(bookLite);
            if (action === 'created') createdCount += 1;
            else updatedCount += 1;
        } catch (error) {
            console.error(`[Crawler] Loi upsert book: ${bookLite.title}`, error.message);
        }
    }

    return {
        source: normalizedSourceUrl,
        requested_limit: safeLimit,
        crawled: latestBooks.length,
        created: createdCount,
        updated: updatedCount,
        books: latestBooks.map((book) => ({
            title: book.title,
            cover_url: book.cover_url,
            href: book.href
        }))
    };
};

// Ham giu san de buoc sau mo rong crawl chapter theo tung truyen.
const scrapeStory = async (url) => {
    throw new Error(`Chuc nang crawl chapter cho ${url} se duoc bo sung o buoc tiep theo.`);
};

const startCrawlerCron = () => {
    const cronExpression = '0 0,12 * * *';
    const timezone = process.env.CRAWLER_TIMEZONE || DEFAULT_TIMEZONE;
    const limit = Number(process.env.CRAWLER_LATEST_LIMIT || DEFAULT_LIMIT);

    const task = cron.schedule(cronExpression, async () => {
        try {
            const result = await crawlLatestBooksFromTruyenChuCV(limit);
            console.log('[Crawler] Hoan tat auto crawl:', result);
        } catch (error) {
            console.error('[Crawler] Loi khi auto crawl:', error.message);
        }
    }, { timezone });

    console.log(`[Crawler] Da bat cron "${cronExpression}" (${timezone}), limit=${limit}.`);
    return task;
};

module.exports = {
    scrapeStory,
    crawlLatestBooksFromTruyenChuCV,
    startCrawlerCron
};
