import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/axiosConfig';

const PLACEHOLDER_COVER = 'https://placehold.co/320x420/e5e7eb/6b7280?text=No+Cover';
const MAX_HOME_BOOKS = 12;

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

const HomePage = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchBooks = useCallback(async () => {
        setLoading(true);
        setErrorMessage('');

        try {
            const response = await api.get('/books', {
                params: { limit: MAX_HOME_BOOKS }
            });

            setBooks(normalizeBooks(response).slice(0, MAX_HOME_BOOKS));
        } catch (error) {
            console.error('Loi tai danh sach truyen:', error);
            setBooks([]);

            const status = error?.response?.status;
            if (status === 404) {
                setErrorMessage('Khong tim thay du lieu truyen (404).');
            } else if (status === 500) {
                setErrorMessage('May chu dang gap su co (500). Vui long thu lai.');
            } else {
                setErrorMessage('Khong the ket noi toi may chu. Vui long thu lai.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    if (loading) {
        return (
            <div className="container mx-auto p-4">
                <h2 className="mb-4 border-l-4 border-indigo-600 pl-3 text-xl font-bold text-indigo-700">
                    Truyen moi cap nhat
                </h2>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {Array.from({ length: MAX_HOME_BOOKS }).map((_, index) => (
                        <div key={index} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                            <div className="aspect-[4/5] animate-pulse bg-gray-200" />
                            <div className="space-y-2 p-3">
                                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
                                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="container mx-auto p-4">
                <div className="mx-auto mt-8 max-w-xl rounded-xl border border-red-100 bg-red-50 p-6 text-center">
                    <h3 className="text-lg font-semibold text-red-700">Khong tai duoc danh sach truyen</h3>
                    <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                    <button
                        type="button"
                        onClick={fetchBooks}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                        Thu lai
                    </button>
                </div>
            </div>
        );
    }

    if ((books?.length ?? 0) === 0) {
        return (
            <div className="container mx-auto p-4">
                <div className="mx-auto mt-8 max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800">Chua co truyen nao</h3>
                    <p className="mt-2 text-sm text-gray-500">Hien chua co du lieu truyen tu MongoDB.</p>
                    <button
                        type="button"
                        onClick={fetchBooks}
                        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        Tai lai
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="mb-4 border-l-4 border-indigo-600 pl-3 text-xl font-bold text-indigo-700">
                Truyen moi cap nhat
            </h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {books.map((book, index) => {
                    const bookId = book?._id ?? `book-${index}`;
                    const title = book?.title?.trim() || 'Chua co ten truyen';
                    const status = book?.status ?? 'Dang cap nhat';
                    const totalChapters = book?.total_chapters ?? 0;
                    const coverUrl = book?.cover_url?.trim() || PLACEHOLDER_COVER;
                    const latestChapters = Array.isArray(book?.latest_chapters)
                        ? book.latest_chapters.slice(0, 2)
                        : [];

                    return (
                        <article
                            key={bookId}
                            className="group flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
                        >
                            <Link
                                to={book?._id ? `/truyen/${book._id}` : '#'}
                                className="aspect-[4/5] overflow-hidden bg-gray-100"
                            >
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

                            <div className="p-3">
                                <h3 className="line-clamp-2 text-sm font-semibold text-gray-900" title={title}>
                                    {book?._id ? (
                                        <Link to={`/truyen/${book._id}`} className="transition hover:text-indigo-600">
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
                                                const chapterKey = chapter?._id ?? `${bookId}-chapter-${chapterIndex}`;
                                                const chapterNumber = toSafeChapterNumber(chapter?.chapter_number);
                                                const chapterTime = formatChapterTimestamp(chapter?.createdAt);

                                                return (
                                                    <div key={chapterKey} className="flex items-center justify-between gap-2">
                                                        {book?._id && chapterNumber ? (
                                                            <Link
                                                                to={`/truyen/${book._id}/chuong/${chapterNumber}`}
                                                                className="line-clamp-1 text-xs font-semibold text-gray-800 rounded-md px-2 py-1 transition hover:bg-indigo-100 hover:text-indigo-700"
                                                            >
                                                                Chuong {chapterNumber}
                                                            </Link>
                                                        ) : (
                                                            <span className="line-clamp-1 text-xs font-semibold text-gray-800">
                                                                Chuong {chapter?.chapter_number ?? '--'}
                                                            </span>
                                                        )}

                                                        <span className="shrink-0 text-[11px] text-gray-500">
                                                            {chapterTime}
                                                        </span>
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
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default HomePage;
