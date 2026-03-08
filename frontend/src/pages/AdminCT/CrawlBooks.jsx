import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
    FaBookOpen,
    FaCloudDownloadAlt,
    FaListOl,
    FaPlay,
    FaSpider
} from 'react-icons/fa';
import api from '../../services/axiosConfig';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const DEFAULT_SOURCE_URL = 'https://truyenchucv.org';
const DEFAULT_CHAPTER_CONCURRENCY = 4;
const FALLBACK_TEXT = 'Đang cập nhật...';
const COVER_PLACEHOLDER = 'https://placehold.co/64x80/e5e7eb/6b7280?text=No+Cover';

const normalizeStoryCrawlBooks = (payload) => {
    const sourceBooks = Array.isArray(payload?.books)
        ? payload.books
        : Array.isArray(payload)
            ? payload
            : [];

    return sourceBooks.map((book, index) => {
        const title = typeof book?.title === 'string' ? book.title.trim() : '';
        const href = typeof book?.href === 'string' ? book.href.trim() : '';
        const cover_url = typeof book?.cover_url === 'string' ? book.cover_url.trim() : '';
        const author = typeof book?.author === 'string' ? book.author.trim() : '';

        return {
            title: title || `Truyen #${index + 1}`,
            href,
            cover_url,
            author: author || FALLBACK_TEXT,
            _crawlKey: href || `${title || 'book'}-${index}`
        };
    });
};

const normalizeCrawlerBooksFromDb = (payload) => {
    const sourceBooks = Array.isArray(payload?.books)
        ? payload.books
        : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
                ? payload
                : [];

    return sourceBooks.map((book, index) => {
        const id = typeof book?._id === 'string' ? book._id : '';
        const title = typeof book?.title === 'string' ? book.title.trim() : '';
        const sourceUrl = typeof book?.crawler_source_url === 'string'
            ? book.crawler_source_url.trim()
            : '';
        const cover_url = typeof book?.cover_url === 'string' ? book.cover_url.trim() : '';
        const author = typeof book?.author === 'string' ? book.author.trim() : '';

        return {
            _id: id,
            title: title || `Truyen #${index + 1}`,
            crawler_source_url: sourceUrl,
            cover_url,
            author: author || FALLBACK_TEXT,
            total_chapters: Number(book?.total_chapters || 0),
            updatedAt: book?.updatedAt || null,
            _crawlKey: id || sourceUrl || `${title || 'book'}-${index}`
        };
    });
};

const CrawlBooks = () => {
    const [activeView, setActiveView] = useState('story');
    const [sourceUrl, setSourceUrl] = useState(DEFAULT_SOURCE_URL);
    const [crawlMeta, setCrawlMeta] = useState(null);
    const [storyCrawlBooks, setStoryCrawlBooks] = useState([]);
    const [isCrawlingStories, setIsCrawlingStories] = useState(false);

    const [chapterBooks, setChapterBooks] = useState([]);
    const [isLoadingChapterBooks, setIsLoadingChapterBooks] = useState(false);
    const [isCrawlingChapters, setIsCrawlingChapters] = useState(false);
    const [selectedChapterKeys, setSelectedChapterKeys] = useState([]);
    const [processedChapterKeys, setProcessedChapterKeys] = useState([]);
    const [chapterImportStats, setChapterImportStats] = useState({});

    const [storyItemsPerPage, setStoryItemsPerPage] = useState(20);
    const [storyCurrentPage, setStoryCurrentPage] = useState(1);
    const [chapterItemsPerPage, setChapterItemsPerPage] = useState(20);
    const [chapterCurrentPage, setChapterCurrentPage] = useState(1);

    const storyTotalPages = useMemo(() => {
        if (storyCrawlBooks.length === 0) return 1;
        return Math.ceil(storyCrawlBooks.length / storyItemsPerPage);
    }, [storyCrawlBooks.length, storyItemsPerPage]);

    const paginatedStoryBooks = useMemo(() => {
        const startIndex = (storyCurrentPage - 1) * storyItemsPerPage;
        return storyCrawlBooks.slice(startIndex, startIndex + storyItemsPerPage);
    }, [storyCrawlBooks, storyCurrentPage, storyItemsPerPage]);

    const chapterTotalPages = useMemo(() => {
        if (chapterBooks.length === 0) return 1;
        return Math.ceil(chapterBooks.length / chapterItemsPerPage);
    }, [chapterBooks.length, chapterItemsPerPage]);

    const paginatedChapterBooks = useMemo(() => {
        const startIndex = (chapterCurrentPage - 1) * chapterItemsPerPage;
        return chapterBooks.slice(startIndex, startIndex + chapterItemsPerPage);
    }, [chapterBooks, chapterCurrentPage, chapterItemsPerPage]);

    const isBookSelectableForChapterCrawl = useCallback(
        (book) => {
            const hasBookId = Boolean(book?._id);
            const hasChapterAlready = Number(book?.total_chapters || 0) > 0;
            const isProcessed = processedChapterKeys.includes(book?._crawlKey);
            return hasBookId && !hasChapterAlready && !isProcessed;
        },
        [processedChapterKeys]
    );

    const isCurrentChapterPageFullySelected = useMemo(() => {
        const selectableBooks = paginatedChapterBooks.filter(isBookSelectableForChapterCrawl);
        if (selectableBooks.length === 0) return false;
        return selectableBooks.every((book) => selectedChapterKeys.includes(book._crawlKey));
    }, [isBookSelectableForChapterCrawl, paginatedChapterBooks, selectedChapterKeys]);

    const selectedChapterCount = selectedChapterKeys.length;
    const canCrawlSelectedChapters = selectedChapterCount > 0 && !isCrawlingChapters;

    const fetchCrawledBooks = useCallback(async () => {
        setIsLoadingChapterBooks(true);
        try {
            const response = await api.get('/crawler/books', {
                params: {
                    limit: 200,
                    include_completed: true
                }
            });

            const books = normalizeCrawlerBooksFromDb(response);
            setChapterBooks(books);
            setSelectedChapterKeys((prev) =>
                prev.filter((key) => books.some((book) => book._crawlKey === key))
            );
            setProcessedChapterKeys((prev) =>
                prev.filter((key) => books.some((book) => book._crawlKey === key))
            );
        } catch (error) {
            console.error('Loi tai danh sach truyen crawler:', error);
            toast.error('Khong the tai danh sach truyen de crawl chapter.');
            setChapterBooks([]);
        } finally {
            setIsLoadingChapterBooks(false);
        }
    }, []);

    useEffect(() => {
        if (storyCurrentPage > storyTotalPages) {
            setStoryCurrentPage(storyTotalPages);
        }
    }, [storyCurrentPage, storyTotalPages]);

    useEffect(() => {
        if (chapterCurrentPage > chapterTotalPages) {
            setChapterCurrentPage(chapterTotalPages);
        }
    }, [chapterCurrentPage, chapterTotalPages]);

    useEffect(() => {
        setStoryCurrentPage(1);
    }, [storyItemsPerPage]);

    useEffect(() => {
        setChapterCurrentPage(1);
    }, [chapterItemsPerPage]);

    useEffect(() => {
        if (activeView === 'chapter') {
            fetchCrawledBooks();
        }
    }, [activeView, fetchCrawledBooks]);

    const handleCrawlStories = async () => {
        const trimmedUrl = sourceUrl.trim();
        if (!trimmedUrl) {
            toast.error('Vui long nhap URL crawl.');
            return;
        }

        setIsCrawlingStories(true);
        try {
            const response = await api.post('/crawler/run-latest', {
                url: trimmedUrl,
                limit: 100
            });

            const books = normalizeStoryCrawlBooks(response);
            setStoryCrawlBooks(books);
            setStoryCurrentPage(1);
            setCrawlMeta({
                source: response?.source || trimmedUrl,
                discovered: Number(response?.discovered || 0),
                crawled: Number(response?.crawled || books.length),
                created: Number(response?.created || 0),
                skipped_existing: Number(response?.skipped_existing || 0)
            });

            if (books.length > 0) {
                toast.success(`Da crawl moi ${books.length} truyen.`);
            } else {
                toast.info('Khong co truyen moi de crawl (da ton tai trong DB).');
            }

            await fetchCrawledBooks();
        } catch (error) {
            const message =
                error?.response?.data?.error
                || error?.message
                || 'Crawl truyen that bai.';
            toast.error(message);
        } finally {
            setIsCrawlingStories(false);
        }
    };

    const toggleSelectChapterBook = (bookKey) => {
        setSelectedChapterKeys((prev) =>
            prev.includes(bookKey)
                ? prev.filter((item) => item !== bookKey)
                : [...prev, bookKey]
        );
    };

    const handleToggleSelectCurrentChapterPage = () => {
        const selectableKeys = paginatedChapterBooks
            .filter(isBookSelectableForChapterCrawl)
            .map((book) => book._crawlKey);

        if (selectableKeys.length === 0) return;

        if (isCurrentChapterPageFullySelected) {
            setSelectedChapterKeys((prev) => prev.filter((key) => !selectableKeys.includes(key)));
            return;
        }

        setSelectedChapterKeys((prev) => Array.from(new Set([...prev, ...selectableKeys])));
    };

    const handleCrawlSelectedChapters = async () => {
        if (!canCrawlSelectedChapters) return;

        const selectedBooks = chapterBooks.filter((book) => selectedChapterKeys.includes(book._crawlKey));
        if (selectedBooks.length === 0) {
            toast.error('Vui long chon it nhat 1 truyen de crawl chapter.');
            return;
        }

        setIsCrawlingChapters(true);
        let successCount = 0;
        let skippedCount = 0;
        let failCount = 0;
        const processedKeys = [];
        const nextStats = {};

        for (const book of selectedBooks) {
            try {
                const result = await api.post('/crawler/import-chapters', {
                    book_id: book._id,
                    chapter_concurrency: DEFAULT_CHAPTER_CONCURRENCY
                });

                processedKeys.push(book._crawlKey);

                if (result?.skipped) {
                    skippedCount += 1;
                    nextStats[book._crawlKey] = {
                        skipped: true,
                        stored_chapters: Number(book?.total_chapters || 0),
                        chapter_errors: 0
                    };
                    continue;
                }

                successCount += 1;
                nextStats[book._crawlKey] = {
                    skipped: false,
                    stored_chapters: Number(result?.saved_book?.stored_chapters || 0),
                    chapter_errors: Number(result?.chapter_errors || 0)
                };
            } catch (error) {
                console.error('Loi crawl chapter:', error);
                failCount += 1;
            }
        }

        if (processedKeys.length > 0) {
            setProcessedChapterKeys((prev) => Array.from(new Set([...prev, ...processedKeys])));
            setSelectedChapterKeys((prev) => prev.filter((key) => !processedKeys.includes(key)));
            setChapterImportStats((prev) => ({ ...prev, ...nextStats }));
        }

        if (successCount > 0) {
            toast.success(`Crawl chapter thanh cong ${successCount} truyen.`);
        }
        if (skippedCount > 0) {
            toast.info(`${skippedCount} truyen da co chapter, bo qua.`);
        }
        if (failCount > 0) {
            toast.warn(`${failCount} truyen crawl chapter that bai.`);
        }

        await fetchCrawledBooks();
        setIsCrawlingChapters(false);
    };

    return (
        <div className="container mx-auto max-w-7xl animate-fade-in-up p-4">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-extrabold text-gray-800">
                        <FaSpider className="text-red-500" /> Quan Ly Crawl Truyen
                    </h1>
                    <p className="mt-1 text-gray-500">
                        Crawl metadata truyen truoc, sau do chuyen sang tab chapter de crawl noi dung.
                    </p>
                </div>
            </div>

            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveView('story')}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                            activeView === 'story'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <FaBookOpen className="mr-2 inline-block" />
                        Crawl truyen
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('chapter')}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                            activeView === 'chapter'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <FaListOl className="mr-2 inline-block" />
                        Crawl chapter
                    </button>
                </div>

                {activeView === 'story' ? (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="url"
                                value={sourceUrl}
                                onChange={(event) => setSourceUrl(event.target.value)}
                                placeholder="Nhap URL can crawl..."
                                className="min-w-[280px] flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            />

                            <button
                                type="button"
                                onClick={handleCrawlStories}
                                disabled={isCrawlingStories}
                                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                                <FaPlay /> {isCrawlingStories ? 'Dang crawl...' : 'Crawl truyen'}
                            </button>
                        </div>

                        {crawlMeta && (
                            <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-5">
                                <p><span className="font-semibold">Nguon:</span> {crawlMeta.source}</p>
                                <p><span className="font-semibold">Phat hien:</span> {crawlMeta.discovered}</p>
                                <p><span className="font-semibold">Da crawl moi:</span> {crawlMeta.crawled}</p>
                                <p><span className="font-semibold">Da tao:</span> {crawlMeta.created}</p>
                                <p><span className="font-semibold">Bo qua da ton tai:</span> {crawlMeta.skipped_existing}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={fetchCrawledBooks}
                            disabled={isLoadingChapterBooks}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                            <FaCloudDownloadAlt />
                            {isLoadingChapterBooks ? 'Dang tai danh sach...' : 'Tai lai danh sach'}
                        </button>

                        <button
                            type="button"
                            onClick={handleCrawlSelectedChapters}
                            disabled={!canCrawlSelectedChapters}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition ${
                                canCrawlSelectedChapters
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'cursor-not-allowed bg-gray-400'
                            }`}
                        >
                            <FaPlay />
                            {isCrawlingChapters
                                ? 'Dang crawl chapter...'
                                : `Crawl chapter da chon (${selectedChapterCount})`}
                        </button>
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {activeView === 'story' ? (
                    storyCrawlBooks.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            Chua co du lieu crawl truyen moi. Nhap URL va bam "Crawl truyen" de bat dau.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50 text-sm uppercase tracking-wider text-gray-600">
                                            <th className="px-4 py-3">Anh</th>
                                            <th className="px-4 py-3">Ten truyen</th>
                                            <th className="px-4 py-3">Tac gia</th>
                                            <th className="px-4 py-3">Nguon</th>
                                            <th className="px-4 py-3 text-center">Trang thai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedStoryBooks.map((book) => (
                                            <tr key={book._crawlKey} className="transition hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <img
                                                        src={book.cover_url || COVER_PLACEHOLDER}
                                                        alt={book.title}
                                                        className="h-16 w-12 rounded border border-gray-200 object-cover"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-gray-800">{book.title}</td>
                                                <td className="px-4 py-4 text-sm text-gray-700">{book.author || FALLBACK_TEXT}</td>
                                                <td className="px-4 py-4 text-sm text-blue-600">
                                                    {book.href ? (
                                                        <a href={book.href} target="_blank" rel="noreferrer" className="hover:underline">
                                                            {book.href}
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">--</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                                        Da luu metadata
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <button
                                        type="button"
                                        onClick={() => setStoryCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={storyCurrentPage === 1}
                                        className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Truoc
                                    </button>
                                    <span className="font-semibold">
                                        Trang {storyCurrentPage}/{storyTotalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setStoryCurrentPage((prev) => Math.min(storyTotalPages, prev + 1))}
                                        disabled={storyCurrentPage === storyTotalPages}
                                        className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Sau
                                    </button>
                                </div>

                                <div className="ml-auto flex items-center gap-2 text-sm">
                                    <label htmlFor="story-crawl-per-page" className="font-semibold text-gray-600">
                                        Truyen/trang
                                    </label>
                                    <select
                                        id="story-crawl-per-page"
                                        value={storyItemsPerPage}
                                        onChange={(event) => setStoryItemsPerPage(Number(event.target.value))}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
                                    >
                                        {PAGE_SIZE_OPTIONS.map((size) => (
                                            <option key={size} value={size}>
                                                {size}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )
                ) : isLoadingChapterBooks ? (
                    <div className="p-10 text-center text-gray-500">Dang tai danh sach truyen de crawl chapter...</div>
                ) : chapterBooks.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        Chua co truyen crawler trong database.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-sm uppercase tracking-wider text-gray-600">
                                        <th className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isCurrentChapterPageFullySelected}
                                                onChange={handleToggleSelectCurrentChapterPage}
                                            />
                                        </th>
                                        <th className="px-4 py-3">Anh</th>
                                        <th className="px-4 py-3">Ten truyen</th>
                                        <th className="px-4 py-3">Tac gia</th>
                                        <th className="px-4 py-3">Nguon</th>
                                        <th className="px-4 py-3 text-center">Tong chapter</th>
                                        <th className="px-4 py-3 text-center">Trang thai</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedChapterBooks.map((book) => {
                                        const key = book._crawlKey;
                                        const isSelected = selectedChapterKeys.includes(key);
                                        const isProcessed = processedChapterKeys.includes(key);
                                        const hasChapters = Number(book?.total_chapters || 0) > 0;
                                        const isSelectable = isBookSelectableForChapterCrawl(book);
                                        const stat = chapterImportStats[key];

                                        return (
                                            <tr key={key} className="transition hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={!isSelectable}
                                                        onChange={() => toggleSelectChapterBook(key)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <img
                                                        src={book.cover_url || COVER_PLACEHOLDER}
                                                        alt={book.title}
                                                        className="h-16 w-12 rounded border border-gray-200 object-cover"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-gray-800">{book.title}</td>
                                                <td className="px-4 py-4 text-sm text-gray-700">{book.author || FALLBACK_TEXT}</td>
                                                <td className="px-4 py-4 text-sm text-blue-600">
                                                    {book.crawler_source_url ? (
                                                        <a
                                                            href={book.crawler_source_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="hover:underline"
                                                        >
                                                            {book.crawler_source_url}
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">--</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                                                        {book.total_chapters}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    {isProcessed ? (
                                                        <div className="space-y-1">
                                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                                                Da crawl
                                                            </span>
                                                            {stat && (
                                                                <p className="text-[11px] text-gray-500">
                                                                    {stat.stored_chapters} chuong, loi {stat.chapter_errors}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : hasChapters ? (
                                                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                                            Da co chapter
                                                        </span>
                                                    ) : isSelected ? (
                                                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                                                            Da chon
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                                            Chua chon
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <button
                                    type="button"
                                    onClick={() => setChapterCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={chapterCurrentPage === 1}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Truoc
                                </button>
                                <span className="font-semibold">
                                    Trang {chapterCurrentPage}/{chapterTotalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setChapterCurrentPage((prev) => Math.min(chapterTotalPages, prev + 1))}
                                    disabled={chapterCurrentPage === chapterTotalPages}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Sau
                                </button>
                            </div>

                            <div className="ml-auto flex items-center gap-2 text-sm">
                                <label htmlFor="chapter-crawl-per-page" className="font-semibold text-gray-600">
                                    Truyen/trang
                                </label>
                                <select
                                    id="chapter-crawl-per-page"
                                    value={chapterItemsPerPage}
                                    onChange={(event) => setChapterItemsPerPage(Number(event.target.value))}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                >
                                    {PAGE_SIZE_OPTIONS.map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CrawlBooks;
