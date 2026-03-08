const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const pLimit = require('p-limit');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');

const REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_LIMIT = 10;
const HOME_URL = 'https://truyenchucv.org';
const STATIC_HOST = 'https://static.truyenchucv.org';
const DETAIL_FETCH_DELAY_MS = 220;
const DEFAULT_CHAPTER_CONCURRENCY = 4;
const MAX_CHAPTER_CONCURRENCY = 8;
const CHAPTER_BATCH_PAUSE_MS = 180;

const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const fetchHtml = async (url) => {
    const { data } = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8'
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

const toAbsoluteUrl = (value, baseUrl) => {
    const normalized = normalizeText(value || '');
    if (!normalized) return '';

    try {
        return new URL(normalized, baseUrl).href;
    } catch (error) {
        return '';
    }
};

const extractNextData = ($) => {
    const raw = $('script#__NEXT_DATA__').html();
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
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

const parseChapterNumber = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }

    const text = normalizeText(String(value || ''));
    if (!text) return fallback;

    const chapterKeywordMatch = text.match(/(?:chuong|chương)\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (chapterKeywordMatch?.[1]) {
        const parsed = Number(chapterKeywordMatch[1]);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }

    const numberMatch = text.match(/(?:-|\/)([0-9]+)(?:\.html)?$/i) || text.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (numberMatch?.[1]) {
        const parsed = Number(numberMatch[1]);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }

    return fallback;
};

const firstNonEmpty = (...values) => {
    for (const value of values) {
        const normalized = normalizeText(String(value || ''));
        if (normalized) return normalized;
    }

    return '';
};

const parseLatestBookLinksFromHomepage = ($, sourceUrl, limit = DEFAULT_LIMIT) => {
    const links = [];
    const seenHrefs = new Set();

    $('a[href^="/truyen/"], a[href*="/truyen/"]').each((_, element) => {
        if (links.length >= limit) return;

        const anchor = $(element);
        const className = anchor.attr('class') || '';
        const href = toAbsoluteUrl(anchor.attr('href') || '', sourceUrl);
        const title = normalizeText(anchor.attr('title') || anchor.text() || '');

        const isTargetCardAnchor = className.includes('line-clamp-2')
            && className.includes('font-medium')
            && className.includes('hover:underline');

        if (!isTargetCardAnchor || !href || !title) return;
        if (seenHrefs.has(href)) return;

        seenHrefs.add(href);
        links.push({ title, href });
    });

    return links.slice(0, limit);
};

const extractGenres = (storyPayload, $) => {
    const output = new Set();

    const payloadGenres = [
        storyPayload?.genres,
        storyPayload?.genre,
        storyPayload?.category,
        storyPayload?.categories
    ];

    payloadGenres.forEach((item) => {
        if (!item) return;

        if (Array.isArray(item)) {
            item.forEach((entry) => {
                const name = firstNonEmpty(entry?.name, entry?.label, entry?.slug, entry);
                if (name) output.add(name);
            });
            return;
        }

        const name = firstNonEmpty(item?.name, item?.label, item?.slug, item);
        if (name) output.add(name);
    });

    $('a[href*="the-loai"], a[href*="genre"]').each((_, element) => {
        const text = normalizeText($(element).text() || '');
        if (text && text.length <= 50) output.add(text);
    });

    return Array.from(output);
};

const resolveStoryPayload = (nextData) => {
    const pageProps = nextData?.props?.pageProps || {};
    return (
        pageProps?.story
        || pageProps?.book
        || pageProps?.data?.story
        || pageProps?.data?.book
        || null
    );
};

const chapterItemToLink = (item, storyUrl, order) => {
    if (!item) return null;

    if (typeof item === 'string') {
        const hrefFromString = toAbsoluteUrl(item, storyUrl);
        if (!hrefFromString) return null;
        return {
            href: hrefFromString,
            title: `Chuong ${order + 1}`,
            chapter_number: parseChapterNumber(item, order + 1),
            order
        };
    }

    const href = toAbsoluteUrl(
        item.href || item.url || item.link || item.path || item.slug || '',
        storyUrl
    );

    if (!href) return null;

    const title = firstNonEmpty(
        item.title,
        item.name,
        item.chapter_title,
        item.chapterName,
        `Chuong ${order + 1}`
    );

    const chapterNumber = parseChapterNumber(
        item.chapter_number || item.chapterNumber || item.number || title || href,
        order + 1
    );

    return {
        href,
        title,
        chapter_number: chapterNumber,
        order
    };
};

const extractChapterLinksFromNextData = (nextData, storyUrl) => {
    const pageProps = nextData?.props?.pageProps || {};
    const candidates = [
        pageProps?.story?.chapters,
        pageProps?.story?.chapterList,
        pageProps?.chapters,
        pageProps?.chapterList,
        pageProps?.data?.chapters,
        pageProps?.data?.chapterList
    ];

    const links = [];
    candidates.forEach((candidate) => {
        if (!Array.isArray(candidate)) return;
        candidate.forEach((item, index) => {
            const chapterLink = chapterItemToLink(item, storyUrl, index);
            if (chapterLink) links.push(chapterLink);
        });
    });

    return links;
};

const extractChapterLinksFromDom = ($, storyUrl) => {
    const links = [];
    const storyPath = new URL(storyUrl).pathname.replace(/\/+$/, '').toLowerCase();
    const host = new URL(storyUrl).host;

    $('a[href]').each((index, element) => {
        const href = toAbsoluteUrl($(element).attr('href') || '', storyUrl);
        if (!href) return;

        let parsed;
        try {
            parsed = new URL(href);
        } catch (error) {
            return;
        }

        if (parsed.host !== host) return;

        const pathName = parsed.pathname.toLowerCase();
        if (!pathName || pathName === storyPath) return;

        const looksChapterPath = pathName.includes('/chuong')
            || pathName.includes('/chapter')
            || pathName.startsWith(`${storyPath}/`);

        if (!looksChapterPath) return;

        const title = firstNonEmpty(
            $(element).attr('title'),
            $(element).text(),
            `Chuong ${index + 1}`
        );

        links.push({
            href,
            title,
            chapter_number: parseChapterNumber(`${title} ${href}`, index + 1),
            order: index
        });
    });

    return links;
};

const mergeChapterLinks = (...groups) => {
    const map = new Map();
    let orderSeed = 0;

    groups.flat().forEach((item) => {
        if (!item?.href) return;

        const href = item.href.split('#')[0];
        const existed = map.get(href);
        if (!existed) {
            map.set(href, {
                href,
                title: item.title || '',
                chapter_number: parseChapterNumber(item.chapter_number, 0),
                order: Number.isFinite(item.order) ? item.order : orderSeed++
            });
            return;
        }

        if (!existed.title && item.title) existed.title = item.title;
        if (!existed.chapter_number) {
            existed.chapter_number = parseChapterNumber(item.chapter_number, existed.chapter_number);
        }
    });

    const merged = Array.from(map.values()).map((item, index) => ({
        ...item,
        chapter_number: item.chapter_number || parseChapterNumber(`${item.title} ${item.href}`, index + 1) || index + 1
    }));

    merged.sort((a, b) => {
        if (a.chapter_number !== b.chapter_number) {
            return a.chapter_number - b.chapter_number;
        }

        return a.order - b.order;
    });

    return merged;
};

const extractStorySnapshot = async (storyUrl) => {
    const normalizedStoryUrl = resolveSourceUrl(storyUrl);
    const html = await fetchHtml(normalizedStoryUrl);
    const $ = cheerio.load(html);
    const nextData = extractNextData($);
    const storyPayload = resolveStoryPayload(nextData);

    const title = firstNonEmpty(
        storyPayload?.title,
        storyPayload?.name,
        $('meta[property="og:title"]').attr('content'),
        $('h1').first().text()
    );

    if (!title) {
        throw new Error('Khong lay duoc tieu de truyen tu URL nay.');
    }

    const author = firstNonEmpty(
        storyPayload?.author?.name,
        storyPayload?.authorName,
        storyPayload?.author,
        $('meta[name="author"]').attr('content'),
        'Crawler TruyenChuCV'
    );

    const description = firstNonEmpty(
        storyPayload?.description,
        $('meta[property="og:description"]').attr('content'),
        ''
    );

    const cover_url = resolveCoverUrl(
        firstNonEmpty(
            storyPayload?.coverUrl,
            storyPayload?.cover_url,
            $('meta[property="og:image"]').attr('content'),
            ''
        )
    );

    const genres = extractGenres(storyPayload, $);

    const chapterLinks = mergeChapterLinks(
        extractChapterLinksFromNextData(nextData, normalizedStoryUrl),
        extractChapterLinksFromDom($, normalizedStoryUrl)
    );

    if (chapterLinks.length === 0) {
        throw new Error('Khong tim thay danh sach link chuong tren trang truyen.');
    }

    return {
        source_url: normalizedStoryUrl,
        title,
        author,
        description,
        cover_url,
        genres,
        chapter_links: chapterLinks
    };
};

const extractLongestContentNode = ($) => {
    const selectors = [
        '.chapter-content',
        '#chapter-content',
        '[class*="chapter-content"]',
        '[id*="chapter-content"]',
        '.entry-content',
        '.content-inner',
        'article',
        'main'
    ];

    let selectedNode = null;
    let maxLength = 0;

    selectors.forEach((selector) => {
        $(selector).each((_, element) => {
            const textLength = normalizeText($(element).text() || '').length;
            if (textLength > maxLength) {
                maxLength = textLength;
                selectedNode = $(element);
            }
        });
    });

    return selectedNode;
};

const toReadableContent = ($, node) => {
    if (!node || node.length === 0) return '';

    const cloned = node.clone();
    cloned.find('script,style,noscript,iframe,button,svg').remove();
    cloned.find('br').replaceWith('\n');
    cloned.find('p,div,li,h1,h2,h3,h4,h5,h6,blockquote').each((_, element) => {
        const elementNode = $(element);
        elementNode.prepend('\n');
        elementNode.append('\n');
    });

    const raw = cloned
        .text()
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n');

    const lines = raw.split('\n').map((line) => line.trim());
    const normalized = [];
    let previousEmpty = true;

    lines.forEach((line) => {
        if (!line) {
            if (!previousEmpty) {
                normalized.push('');
                previousEmpty = true;
            }
            return;
        }

        normalized.push(line);
        previousEmpty = false;
    });

    return normalized.join('\n').trim();
};

const crawlSingleChapter = async (chapterLink, fallbackIndex = 1) => {
    const html = await fetchHtml(chapterLink.href);
    const $ = cheerio.load(html);

    const title = firstNonEmpty(
        $('h1').first().text(),
        $('meta[property="og:title"]').attr('content'),
        chapterLink.title,
        `Chuong ${fallbackIndex}`
    );

    const contentNode = extractLongestContentNode($);
    const content = toReadableContent($, contentNode);

    if (!content) {
        throw new Error(`Khong lay duoc noi dung chuong: ${chapterLink.href}`);
    }

    const chapterNumber = parseChapterNumber(
        chapterLink.chapter_number || title || chapterLink.href,
        fallbackIndex
    );

    return {
        chapter_number: chapterNumber,
        title,
        content,
        source_url: chapterLink.href
    };
};

const resolveChapterConcurrency = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_CHAPTER_CONCURRENCY;
    }

    return Math.min(Math.floor(parsed), MAX_CHAPTER_CONCURRENCY);
};

const resolveChapterLimit = (value) => {
    if (value === undefined || value === null || value === '') {
        return 0;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
};

const crawlChapterContents = async (chapterLinks, chapterConcurrency = DEFAULT_CHAPTER_CONCURRENCY) => {
    const safeConcurrency = resolveChapterConcurrency(chapterConcurrency);
    const limiter = pLimit(safeConcurrency);

    const tasks = chapterLinks.map((chapterLink, index) =>
        limiter(async () => {
            if (index > 0 && index % safeConcurrency === 0) {
                await sleep(CHAPTER_BATCH_PAUSE_MS);
            }

            return crawlSingleChapter(chapterLink, index + 1);
        })
    );

    const settled = await Promise.allSettled(tasks);
    const chapters = [];
    const errors = [];

    settled.forEach((item, index) => {
        if (item.status === 'fulfilled') {
            chapters.push(item.value);
            return;
        }

        errors.push({
            href: chapterLinks[index]?.href || '',
            message: item.reason?.message || 'Unknown chapter crawl error'
        });
    });

    chapters.sort((a, b) => a.chapter_number - b.chapter_number);

    return { chapters, errors, concurrency: safeConcurrency };
};

const upsertBookLite = async (bookLite) => {
    const titleRegex = new RegExp(`^${escapeRegex(bookLite.title)}$`, 'i');
    const sourceUrl = normalizeText(bookLite.href || '');

    let book = await Book.findOne({
        $or: [
            sourceUrl ? { crawler_source_url: sourceUrl } : null,
            { title: titleRegex }
        ].filter(Boolean)
    });

    let action = 'updated';

    if (!book) {
        book = new Book({
            title: bookLite.title,
            author: 'Crawler TruyenChuCV',
            description: '',
            cover_url: bookLite.cover_url || '',
            total_chapters: 0,
            uploader_id: process.env.CRAWLER_UPLOADER_ID || 'system_crawler',
            crawler_source_url: sourceUrl
        });
        action = 'created';
    } else if (sourceUrl && !book.crawler_source_url) {
        book.crawler_source_url = sourceUrl;
    }

    if (bookLite.cover_url) {
        book.cover_url = bookLite.cover_url;
    }

    await book.save();
    return { book, action };
};

const upsertBookWithChapters = async (storySnapshot, crawledChapters) => {
    const titleRegex = new RegExp(`^${escapeRegex(storySnapshot.title)}$`, 'i');

    let book = await Book.findOne({
        $or: [
            storySnapshot.source_url ? { crawler_source_url: storySnapshot.source_url } : null,
            { title: titleRegex }
        ].filter(Boolean)
    });

    const action = book ? 'updated' : 'created';
    const uploaderId = process.env.CRAWLER_UPLOADER_ID || 'system_crawler';

    if (!book) {
        book = new Book({
            title: storySnapshot.title,
            author: storySnapshot.author || 'Crawler TruyenChuCV',
            description: storySnapshot.description || '',
            genres: storySnapshot.genres || [],
            cover_url: storySnapshot.cover_url || '',
            total_chapters: 0,
            status: 'Đang cập nhật',
            uploader_id: uploaderId,
            crawler_source_url: storySnapshot.source_url || ''
        });
    } else {
        book.title = storySnapshot.title || book.title;
        book.author = storySnapshot.author || book.author;
        if (storySnapshot.description) book.description = storySnapshot.description;
        if (storySnapshot.cover_url) book.cover_url = storySnapshot.cover_url;
        if (Array.isArray(storySnapshot.genres) && storySnapshot.genres.length > 0) {
            book.genres = Array.from(new Set(storySnapshot.genres.map((item) => normalizeText(item)).filter(Boolean)));
        }
        if (storySnapshot.source_url) {
            book.crawler_source_url = storySnapshot.source_url;
        }
    }

    await book.save();

    const chapterMap = new Map();
    crawledChapters.forEach((chapter, index) => {
        const chapterNumber = parseChapterNumber(chapter.chapter_number, index + 1);
        if (!chapterNumber || !chapter.content) return;
        if (chapterMap.has(chapterNumber)) return;

        chapterMap.set(chapterNumber, {
            chapter_number: chapterNumber,
            title: firstNonEmpty(chapter.title, `Chuong ${chapterNumber}`),
            content: chapter.content
        });
    });

    const chapterPayload = Array.from(chapterMap.values()).sort((a, b) => a.chapter_number - b.chapter_number);

    if (chapterPayload.length > 0) {
        await Chapter.bulkWrite(
            chapterPayload.map((chapter) => ({
                updateOne: {
                    filter: { book_id: book._id, chapter_number: chapter.chapter_number },
                    update: {
                        $set: {
                            title: chapter.title,
                            content: chapter.content
                        }
                    },
                    upsert: true
                }
            })),
            { ordered: false }
        );
    }

    const totalChapters = await Chapter.countDocuments({ book_id: book._id });
    book.total_chapters = totalChapters;
    await book.save();

    return {
        action,
        book,
        stored_chapters: totalChapters,
        crawled_chapters: chapterPayload.length
    };
};

// Crawl nhanh: lay title + cover cua danh sach truyen moi nhat.
const crawlLatestBooksFromTruyenChuCV = async (limit = DEFAULT_LIMIT, sourceUrl = HOME_URL) => {
    const safeLimit = Number.isFinite(Number(limit))
        ? Math.max(1, Math.min(Number(limit), 200))
        : DEFAULT_LIMIT;
    const normalizedSourceUrl = resolveSourceUrl(sourceUrl);

    const html = await fetchHtml(normalizedSourceUrl);
    const $ = cheerio.load(html);
    const latestBookLinks = parseLatestBookLinksFromHomepage($, normalizedSourceUrl, safeLimit);

    if (latestBookLinks.length === 0) {
        throw new Error('Khong tim thay truyen tu selector card tren homepage.');
    }

    const detailLimiter = pLimit(DEFAULT_CHAPTER_CONCURRENCY);

    const latestBooks = await Promise.all(
        latestBookLinks.map((item, index) =>
            detailLimiter(async () => {
                try {
                    await sleep((index % DEFAULT_CHAPTER_CONCURRENCY) * DETAIL_FETCH_DELAY_MS);
                    const cover_url = await extractCoverFromStoryPage(item.href);
                    return {
                        title: item.title,
                        href: item.href,
                        cover_url
                    };
                } catch (error) {
                    return {
                        title: item.title,
                        href: item.href,
                        cover_url: ''
                    };
                }
            })
        )
    );

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
        books: latestBooks
    };
};

const extractCoverFromStoryPage = async (storyUrl) => {
    const html = await fetchHtml(storyUrl);
    const $ = cheerio.load(html);

    const ogImage = normalizeText($('meta[property="og:image"]').attr('content') || '');
    if (ogImage) {
        return resolveCoverUrl(ogImage);
    }

    const nextData = extractNextData($);
    const storyPayload = resolveStoryPayload(nextData);
    const coverFromNextData = firstNonEmpty(
        storyPayload?.coverUrl,
        storyPayload?.cover_url,
        nextData?.props?.pageProps?.coverUrl
    );

    return resolveCoverUrl(coverFromNextData);
};

const crawlStoryWithChapters = async (storyUrl, options = {}) => {
    const snapshot = await extractStorySnapshot(storyUrl);
    const chapterLimit = resolveChapterLimit(options.chapter_limit);
    const chapterConcurrency = resolveChapterConcurrency(
        options.chapter_concurrency
        || options.concurrency
        || process.env.CRAWLER_CHAPTER_CONCURRENCY
    );

    const chapterLinks = chapterLimit > 0
        ? snapshot.chapter_links.slice(0, chapterLimit)
        : snapshot.chapter_links;

    if (chapterLinks.length === 0) {
        throw new Error('Danh sach chuong rong sau khi ap dung chapter_limit.');
    }

    const chapterCrawlResult = await crawlChapterContents(chapterLinks, chapterConcurrency);

    if (chapterCrawlResult.chapters.length === 0) {
        throw new Error('Khong crawl duoc noi dung chuong nao.');
    }

    const saved = await upsertBookWithChapters(snapshot, chapterCrawlResult.chapters);

    return {
        source: snapshot.source_url,
        title: snapshot.title,
        author: snapshot.author,
        total_chapter_links: snapshot.chapter_links.length,
        chapter_requested: chapterLinks.length,
        chapter_crawled: chapterCrawlResult.chapters.length,
        chapter_errors: chapterCrawlResult.errors.length,
        chapter_concurrency: chapterCrawlResult.concurrency,
        saved_book: {
            id: saved.book._id,
            title: saved.book.title,
            action: saved.action,
            stored_chapters: saved.stored_chapters,
            crawled_chapters: saved.crawled_chapters
        },
        errors: chapterCrawlResult.errors
    };
};

const scrapeStory = async (url, options = {}) => crawlStoryWithChapters(url, options);

const startCrawlerCron = () => {
    const cronExpression = '0 0,12 * * *';
    const timezone = process.env.CRAWLER_TIMEZONE || DEFAULT_TIMEZONE;
    const limit = Number(process.env.CRAWLER_LATEST_LIMIT || DEFAULT_LIMIT);

    const task = cron.schedule(
        cronExpression,
        async () => {
            try {
                const result = await crawlLatestBooksFromTruyenChuCV(limit);
                console.log('[Crawler] Hoan tat auto crawl:', result);
            } catch (error) {
                console.error('[Crawler] Loi khi auto crawl:', error.message);
            }
        },
        { timezone }
    );

    console.log(`[Crawler] Da bat cron "${cronExpression}" (${timezone}), limit=${limit}.`);
    return task;
};

module.exports = {
    scrapeStory,
    crawlStoryWithChapters,
    crawlLatestBooksFromTruyenChuCV,
    startCrawlerCron
};
