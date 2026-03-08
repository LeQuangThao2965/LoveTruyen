import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaCloudUploadAlt, FaPlay, FaSpider } from 'react-icons/fa';
import api from '../../services/axiosConfig';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const DEFAULT_SOURCE_URL = 'https://truyenchucv.org';

const normalizeCrawledBooks = (payload) => {
    const sourceBooks = Array.isArray(payload?.books)
        ? payload.books
        : Array.isArray(payload)
            ? payload
            : [];

    return sourceBooks.map((book, index) => {
        const title = typeof book?.title === 'string' ? book.title.trim() : '';
        const href = typeof book?.href === 'string' ? book.href.trim() : '';
        const cover_url = typeof book?.cover_url === 'string' ? book.cover_url.trim() : '';

        return {
            title: title || `Truyện #${index + 1}`,
            href,
            cover_url,
            _crawlKey: href || `${title || 'book'}-${index}`
        };
    });
};

const CrawlBooks = () => {
    const [sourceUrl, setSourceUrl] = useState(DEFAULT_SOURCE_URL);
    const [crawlMeta, setCrawlMeta] = useState(null);
    const [crawlBooks, setCrawlBooks] = useState([]);
    const [isCrawling, setIsCrawling] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [postedKeys, setPostedKeys] = useState([]);
    const [importStats, setImportStats] = useState({});
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = useMemo(() => {
        if (crawlBooks.length === 0) return 1;
        return Math.ceil(crawlBooks.length / itemsPerPage);
    }, [crawlBooks.length, itemsPerPage]);

    const paginatedBooks = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return crawlBooks.slice(startIndex, startIndex + itemsPerPage);
    }, [crawlBooks, currentPage, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const selectedCount = selectedKeys.length;
    const canPostSelected = selectedCount > 0 && !isPosting;

    const toggleSelect = (bookKey) => {
        setSelectedKeys((prev) =>
            prev.includes(bookKey)
                ? prev.filter((item) => item !== bookKey)
                : [...prev, bookKey]
        );
    };

    const isCurrentPageFullySelected =
        paginatedBooks.length > 0
        && paginatedBooks.every((book) => selectedKeys.includes(book._crawlKey) || postedKeys.includes(book._crawlKey));

    const handleToggleSelectCurrentPage = () => {
        const currentPageSelectableKeys = paginatedBooks
            .filter((book) => !postedKeys.includes(book._crawlKey))
            .map((book) => book._crawlKey);

        if (currentPageSelectableKeys.length === 0) return;

        if (isCurrentPageFullySelected) {
            setSelectedKeys((prev) => prev.filter((key) => !currentPageSelectableKeys.includes(key)));
            return;
        }

        setSelectedKeys((prev) => Array.from(new Set([...prev, ...currentPageSelectableKeys])));
    };

    const handleCrawl = async () => {
        const trimmedUrl = sourceUrl.trim();
        if (!trimmedUrl) {
            toast.error('Vui lòng nhập URL crawl.');
            return;
        }

        setIsCrawling(true);
        try {
            const response = await api.post('/crawler/run-latest', {
                url: trimmedUrl,
                limit: 100
            });

            const normalizedBooks = normalizeCrawledBooks(response);
            setCrawlBooks(normalizedBooks);
            setCrawlMeta({
                source: response?.source || trimmedUrl,
                crawled: response?.crawled ?? normalizedBooks.length,
                created: response?.created ?? 0,
                updated: response?.updated ?? 0
            });
            setSelectedKeys([]);
            setPostedKeys([]);
            setImportStats({});
            setCurrentPage(1);

            toast.success(`Crawl xong ${normalizedBooks.length} truyện.`);
        } catch (error) {
            const message =
                error?.response?.data?.error
                || error?.message
                || 'Crawl thất bại.';
            toast.error(message);
        } finally {
            setIsCrawling(false);
        }
    };

    const handlePostSelected = async () => {
        if (!canPostSelected) return;

        const booksToPost = crawlBooks.filter((book) => selectedKeys.includes(book._crawlKey));
        if (booksToPost.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 truyện để đăng.');
            return;
        }

        setIsPosting(true);
        let successCount = 0;
        let failCount = 0;
        const postedBookKeys = [];
        const nextStats = {};

        for (const book of booksToPost) {
            try {
                const result = await api.post('/crawler/import-story', {
                    url: book.href,
                    chapter_concurrency: 4
                });

                successCount += 1;
                postedBookKeys.push(book._crawlKey);
                nextStats[book._crawlKey] = {
                    chapter_crawled: result?.chapter_crawled ?? 0,
                    chapter_errors: result?.chapter_errors ?? 0,
                    stored_chapters: result?.saved_book?.stored_chapters ?? 0
                };
            } catch (error) {
                failCount += 1;
            }
        }

        if (postedBookKeys.length > 0) {
            setPostedKeys((prev) => Array.from(new Set([...prev, ...postedBookKeys])));
            setSelectedKeys((prev) => prev.filter((key) => !postedBookKeys.includes(key)));
            setImportStats((prev) => ({ ...prev, ...nextStats }));
        }

        if (successCount > 0) {
            toast.success(`Đăng thành công ${successCount} truyện (kèm chương).`);
        }
        if (failCount > 0) {
            toast.warn(`${failCount} truyện đăng thất bại hoặc crawl chương lỗi.`);
        }

        setIsPosting(false);
    };

    return (
        <div className="container mx-auto max-w-7xl p-4 animate-fade-in-up">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-extrabold text-gray-800">
                        <FaSpider className="text-red-500" /> Quản Lý Crawl Truyện
                    </h1>
                    <p className="mt-1 text-gray-500">Crawl dữ liệu từ URL bất kỳ rồi chọn truyện để đăng vào hệ thống.</p>
                </div>
            </div>

            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="url"
                        value={sourceUrl}
                        onChange={(event) => setSourceUrl(event.target.value)}
                        placeholder="Nhập URL cần crawl..."
                        className="min-w-[280px] flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />

                    <button
                        type="button"
                        onClick={handleCrawl}
                        disabled={isCrawling}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                        <FaPlay /> {isCrawling ? 'Đang crawl...' : 'Crawl truyện'}
                    </button>

                    <button
                        type="button"
                        onClick={handlePostSelected}
                        disabled={!canPostSelected}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition ${
                            canPostSelected
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <FaCloudUploadAlt /> {isPosting ? 'Đang đăng...' : `Đăng đã chọn (${selectedCount})`}
                    </button>
                </div>

                {crawlMeta && (
                    <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-4">
                        <p><span className="font-semibold">Nguồn:</span> {crawlMeta.source}</p>
                        <p><span className="font-semibold">Đã crawl:</span> {crawlMeta.crawled}</p>
                        <p><span className="font-semibold">Tạo mới:</span> {crawlMeta.created}</p>
                        <p><span className="font-semibold">Cập nhật:</span> {crawlMeta.updated}</p>
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {crawlBooks.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        Chưa có dữ liệu crawl. Nhập URL và bấm "Crawl truyện" để bắt đầu.
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
                                                checked={isCurrentPageFullySelected}
                                                onChange={handleToggleSelectCurrentPage}
                                            />
                                        </th>
                                        <th className="px-4 py-3">Ảnh</th>
                                        <th className="px-4 py-3">Tên truyện</th>
                                        <th className="px-4 py-3">Nguồn</th>
                                        <th className="px-4 py-3 text-center">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedBooks.map((book) => {
                                        const isPosted = postedKeys.includes(book._crawlKey);
                                        const isSelected = selectedKeys.includes(book._crawlKey);
                                        const stat = importStats[book._crawlKey];

                                        return (
                                            <tr key={book._crawlKey} className="transition hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected || isPosted}
                                                        disabled={isPosted}
                                                        onChange={() => toggleSelect(book._crawlKey)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <img
                                                        src={book.cover_url || 'https://placehold.co/64x80/e5e7eb/6b7280?text=No+Cover'}
                                                        alt={book.title}
                                                        className="h-16 w-12 rounded border border-gray-200 object-cover"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-gray-800">{book.title}</td>
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
                                                    {isPosted ? (
                                                        <div className="space-y-1">
                                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                                                Đã đăng
                                                            </span>
                                                            {stat && (
                                                                <p className="text-[11px] text-gray-500">
                                                                    {stat.stored_chapters} chương, lỗi {stat.chapter_errors}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : isSelected ? (
                                                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                                                            Đã chọn
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                                            Chưa chọn
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
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Trước
                                </button>
                                <span className="font-semibold">
                                    Trang {currentPage}/{totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Sau
                                </button>
                            </div>

                            <div className="ml-auto flex items-center gap-2 text-sm">
                                <label htmlFor="crawl-per-page" className="font-semibold text-gray-600">
                                    Truyện/trang
                                </label>
                                <select
                                    id="crawl-per-page"
                                    value={itemsPerPage}
                                    onChange={(event) => setItemsPerPage(Number(event.target.value))}
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
                )}
            </div>
        </div>
    );
};

export default CrawlBooks;
