import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/axiosConfig';
import SharedHomeBookCard from '../../components/HomeBookCard';

const PLACEHOLDER_COVER = 'https://placehold.co/320x420/e5e7eb/6b7280?text=No+Cover';
const HOT_BOOK_LIMIT = 10;
const NEW_BOOKS_PER_PAGE = 14;
const HOT_AUTO_SCROLL_MS = 2500;

const normalizeBooks = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.books)) return payload.books;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const toSafeChapterNumber = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.floor(parsed);
};

const formatChapterTimestamp = (value) => {
    if (!value) return '--';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';

    const now = new Date();
    const isSameDate =
        date.getDate() === now.getDate()
        && date.getMonth() === now.getMonth()
        && date.getFullYear() === now.getFullYear();

    if (isSameDate) {
        return new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
};

const formatViewCount = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(Math.floor(parsed));
};

const getErrorMessage = (error) => {
    const status = error?.response?.status;
    if (status === 404) return 'Khong tim thay du lieu truyen (404).';
    if (status === 500) return 'May chu dang gap su co (500). Vui long thu lai.';
    return 'Khong the ket noi toi may chu. Vui long thu lai.';
};

const HomeBookCard = ({ book, ranking }) => {
    const bookId = book?._id || '';
    const title = book?.title?.trim() || 'Chua co ten truyen';
    const coverUrl = book?.cover_url?.trim() || PLACEHOLDER_COVER;
    const status = book?.status || 'Dang cap nhat';
    const totalChapters = Number(book?.total_chapters || 0);
    const latestChapters = Array.isArray(book?.latest_chapters)
        ? book.latest_chapters.slice(0, 2)
        : [];
    const weeklyViews = Number(book?.weekly_views_current || 0);

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
            <Link
                to={bookId ? `/truyen/${bookId}` : '#'}
                className="relative aspect-[4/5] overflow-hidden bg-gray-100"
            >
                {typeof ranking === 'number' && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-orange-500 px-2 py-1 text-[11px] font-bold text-white shadow">
                        Top {ranking}
                    </span>
                )}
                <img
                    src={coverUrl}
                    alt={title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(event) => {
                        if (event.currentTarget.src !== PLACEHOLDER_COVER) {
                            event.currentTarget.src = PLACEHOLDER_COVER;
                        }
                    }}
                />
            </Link>

            <div className="flex flex-1 flex-col p-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-gray-900" title={title}>
                    {bookId ? (
                        <Link to={`/truyen/${bookId}`} className="transition hover:text-indigo-600">
                            {title}
                        </Link>
                    ) : (
                        title
                    )}
                </h3>

                <div className="mt-3 min-h-[56px] border-l border-gray-200 pl-3">
                    {latestChapters.length === 0 ? (
                        <p className="text-xs text-gray-400">Chua co chuong moi</p>
                    ) : (
                        <div className="space-y-2">
                            {latestChapters.map((chapter, chapterIndex) => {
                                const chapterKey = chapter?._id || `${bookId}-chapter-${chapterIndex}`;
                                const chapterNumber = toSafeChapterNumber(chapter?.chapter_number);
                                const chapterTime = formatChapterTimestamp(chapter?.createdAt);

                                return (
                                    <div key={chapterKey} className="flex items-center justify-between gap-2">
                                        {bookId && chapterNumber ? (
                                            <Link
                                                to={`/truyen/${bookId}/chuong/${chapterNumber}`}
                                                className="line-clamp-1 rounded-md px-2 py-1 text-xs font-semibold text-gray-800 transition hover:bg-indigo-100 hover:text-indigo-700"
                                            >
                                                Chuong {chapterNumber}
                                            </Link>
                                        ) : (
                                            <span className="line-clamp-1 text-xs font-semibold text-gray-800">
                                                Chuong {chapter?.chapter_number || '--'}
                                            </span>
                                        )}

                                        <span className="shrink-0 text-[11px] text-gray-500">{chapterTime}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="line-clamp-1 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                        {status}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                        {totalChapters} chuong
                    </span>
                </div>

                {typeof ranking === 'number' && (
                    <div className="mt-2 rounded-md bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">
                        {formatViewCount(weeklyViews)} luot xem tuan nay
                    </div>
                )}
            </div>
        </article>
    );
};

const HomePage = () => {
    const [hotBooks, setHotBooks] = useState([]);
    const [newBooks, setNewBooks] = useState([]);
    const [newPage, setNewPage] = useState(1);
    const [newTotalPages, setNewTotalPages] = useState(1);
    const [newTotalBooks, setNewTotalBooks] = useState(0);

    const [hotLoading, setHotLoading] = useState(true);
    const [newLoading, setNewLoading] = useState(true);
    const [hotError, setHotError] = useState('');
    const [newError, setNewError] = useState('');

    const hotScrollRef = useRef(null);
    const hotTrackRef = useRef(null);
    const dragStateRef = useRef({
        isDragging: false,
        startX: 0,
        startScrollLeft: 0
    });

    const hotLoopBooks = useMemo(() => {
        if (hotBooks.length > 1) return [...hotBooks, ...hotBooks];
        return hotBooks;
    }, [hotBooks]);

    const getHotStepWidth = useCallback(() => {
        const track = hotTrackRef.current;
        if (!track) return 0;

        const firstCard = track.querySelector('[data-hot-card="true"]');
        if (!firstCard) return 0;

        const style = window.getComputedStyle(track);
        const gap = Number.parseFloat(style.columnGap || style.gap || '0') || 0;
        return firstCard.getBoundingClientRect().width + gap;
    }, []);

    const normalizeHotScrollLoop = useCallback(() => {
        const container = hotScrollRef.current;
        if (!container || hotBooks.length <= 1) return;

        const step = getHotStepWidth();
        if (!step) return;

        const singleLoopWidth = step * hotBooks.length;
        if (container.scrollLeft >= singleLoopWidth) {
            container.scrollLeft -= singleLoopWidth;
        } else if (container.scrollLeft < 0) {
            container.scrollLeft += singleLoopWidth;
        }
    }, [getHotStepWidth, hotBooks.length]);

    const scrollHotByOne = useCallback(
        (direction) => {
            const container = hotScrollRef.current;
            if (!container || hotBooks.length <= 1) return;

            const step = getHotStepWidth();
            if (!step) return;

            container.scrollBy({
                left: direction * step,
                behavior: 'smooth'
            });

            window.setTimeout(normalizeHotScrollLoop, 450);
        },
        [getHotStepWidth, hotBooks.length, normalizeHotScrollLoop]
    );

    const fetchHotBooks = useCallback(async () => {
        setHotLoading(true);
        setHotError('');

        try {
            const response = await api.get('/books/hot-weekly', {
                params: { limit: HOT_BOOK_LIMIT }
            });
            setHotBooks(normalizeBooks(response).slice(0, HOT_BOOK_LIMIT));
        } catch (error) {
            console.error('Loi tai danh sach truyen hot:', error);
            setHotBooks([]);
            setHotError(getErrorMessage(error));
        } finally {
            setHotLoading(false);
        }
    }, []);

    const fetchNewBooks = useCallback(async (targetPage) => {
        setNewLoading(true);
        setNewError('');

        try {
            const response = await api.get('/books', {
                params: {
                    page: targetPage,
                    limit: NEW_BOOKS_PER_PAGE
                }
            });

            const safeTotalPages = Math.max(1, Number(response?.totalPages) || 1);
            const safeTotal = Math.max(0, Number(response?.total) || 0);

            setNewBooks(normalizeBooks(response));
            setNewTotalPages(safeTotalPages);
            setNewTotalBooks(safeTotal);
        } catch (error) {
            console.error('Loi tai danh sach truyen moi:', error);
            setNewBooks([]);
            setNewTotalPages(1);
            setNewTotalBooks(0);
            setNewError(getErrorMessage(error));
        } finally {
            setNewLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHotBooks();
    }, [fetchHotBooks]);

    useEffect(() => {
        fetchNewBooks(newPage);
    }, [fetchNewBooks, newPage]);

    useEffect(() => {
        if (newPage > newTotalPages) {
            setNewPage(newTotalPages);
        }
    }, [newPage, newTotalPages]);

    useEffect(() => {
        if (hotBooks.length <= 1) return undefined;

        const timer = window.setInterval(() => {
            if (!dragStateRef.current.isDragging) {
                scrollHotByOne(1);
            }
        }, HOT_AUTO_SCROLL_MS);

        return () => {
            window.clearInterval(timer);
        };
    }, [hotBooks.length, scrollHotByOne]);

    const handleHotPointerDown = (event) => {
        const container = hotScrollRef.current;
        if (!container) return;

        dragStateRef.current = {
            isDragging: true,
            startX: event.clientX,
            startScrollLeft: container.scrollLeft
        };

        if (typeof container.setPointerCapture === 'function') {
            container.setPointerCapture(event.pointerId);
        }
    };

    const handleHotPointerMove = (event) => {
        const container = hotScrollRef.current;
        const dragState = dragStateRef.current;
        if (!container || !dragState.isDragging) return;

        const deltaX = event.clientX - dragState.startX;
        container.scrollLeft = dragState.startScrollLeft - deltaX;
        normalizeHotScrollLoop();
    };

    const handleHotPointerUp = (event) => {
        const container = hotScrollRef.current;
        if (!container) return;

        dragStateRef.current.isDragging = false;
        if (
            typeof container.releasePointerCapture === 'function'
            && typeof container.hasPointerCapture === 'function'
            && container.hasPointerCapture(event.pointerId)
        ) {
            container.releasePointerCapture(event.pointerId);
        }
        normalizeHotScrollLoop();
    };

    const goToPrevNewPage = () => {
        setNewPage((prev) => Math.max(1, prev - 1));
    };

    const goToNextNewPage = () => {
        setNewPage((prev) => Math.min(newTotalPages, prev + 1));
    };

    return (
        <div className="container mx-auto space-y-8 p-4">
            <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="border-l-4 border-orange-500 pl-3 text-xl font-bold text-orange-700">
                        Truyện hot Tuần
                    </h2>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => scrollHotByOne(-1)}
                            disabled={hotLoading || hotBooks.length <= 1}
                            className="rounded-full border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Lui 1 truyen hot"
                        >
                            {'<'}
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollHotByOne(1)}
                            disabled={hotLoading || hotBooks.length <= 1}
                            className="rounded-full border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Tien 1 truyen hot"
                        >
                            {'>'}
                        </button>
                    </div>
                </div>

                {hotLoading ? (
                    <div className="flex gap-3 overflow-hidden">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div
                                key={`hot-skeleton-${index}`}
                                className="w-[170px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white"
                            >
                                <div className="aspect-[4/5] animate-pulse bg-gray-200" />
                                <div className="space-y-2 p-3">
                                    <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : hotError ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                        <p>{hotError}</p>
                        <button
                            type="button"
                            onClick={fetchHotBooks}
                            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white transition hover:bg-red-700"
                        >
                            Thu lai
                        </button>
                    </div>
                ) : hotBooks.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        Chua co du lieu truyen hot trong tuan.
                    </div>
                ) : (
                    <div
                        ref={hotScrollRef}
                        className="cursor-grab overflow-x-auto pb-2 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
                        onPointerDown={handleHotPointerDown}
                        onPointerMove={handleHotPointerMove}
                        onPointerUp={handleHotPointerUp}
                        onPointerCancel={handleHotPointerUp}
                        onPointerLeave={handleHotPointerUp}
                        onScroll={normalizeHotScrollLoop}
                    >
                        <div ref={hotTrackRef} className="flex min-w-max gap-3">
                            {hotLoopBooks.map((book, index) => (
                                <div
                                    key={`${book?._id || 'hot-book'}-${index}`}
                                    data-hot-card="true"
                                    className="w-[170px] shrink-0 sm:w-[190px] lg:w-[210px]"
                                >
                                    <HomeBookCard
                                        book={book}
                                        ranking={index < hotBooks.length ? index + 1 : undefined}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="border-l-4 border-indigo-600 pl-3 text-xl font-bold text-indigo-700">
                        Truyen moi cap nhat
                    </h2>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {NEW_BOOKS_PER_PAGE} truyen/trang - Tong {newTotalBooks}
                    </span>
                </div>

                {newLoading ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                        {Array.from({ length: NEW_BOOKS_PER_PAGE }).map((_, index) => (
                            <div key={`new-skeleton-${index}`} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                                <div className="aspect-[4/5] animate-pulse bg-gray-200" />
                                <div className="space-y-2 p-3">
                                    <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : newError ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                        <p>{newError}</p>
                        <button
                            type="button"
                            onClick={() => fetchNewBooks(newPage)}
                            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white transition hover:bg-red-700"
                        >
                            Thu lai
                        </button>
                    </div>
                ) : newBooks.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        Chua co du lieu truyen moi.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                            {newBooks.map((book, index) => (
                                <HomeBookCard key={book?._id || `new-book-${index}`} book={book} />
                            ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                            <button
                                type="button"
                                onClick={goToPrevNewPage}
                                disabled={newPage <= 1 || newLoading}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Truoc
                            </button>

                            <span className="text-sm font-semibold text-gray-600">
                                Trang {newPage}/{newTotalPages}
                            </span>

                            <button
                                type="button"
                                onClick={goToNextNewPage}
                                disabled={newPage >= newTotalPages || newLoading}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Sau
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default HomePage;
