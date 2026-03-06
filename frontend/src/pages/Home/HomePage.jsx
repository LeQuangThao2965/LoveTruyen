import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/axiosConfig';

const PLACEHOLDER_COVER = 'https://placehold.co/320x420/e5e7eb/6b7280?text=No+Cover';
const MAX_HOME_BOOKS = 12;

// Chuẩn hóa dữ liệu trả về để luôn là mảng, tránh lỗi .map().
const normalizeBooks = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.books)) return payload.books;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

// Format mốc thời gian chương:
// - Cùng ngày hiện tại: hiển thị giờ-phút-giây.
// - Khác ngày: hiển thị ngày-tháng-năm.
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
            // Ưu tiên giới hạn số lượng ngay từ backend, đồng thời slice ở frontend để an toàn.
            const response = await api.get('/books', {
                params: { limit: MAX_HOME_BOOKS }
            });

            const safeBooks = normalizeBooks(response).slice(0, MAX_HOME_BOOKS);
            setBooks(safeBooks);
        } catch (error) {
            console.error('Lỗi tải danh sách truyện:', error);
            setBooks([]);

            const status = error?.response?.status;
            if (status === 404) {
                setErrorMessage('Không tìm thấy dữ liệu truyện (404).');
            } else if (status === 500) {
                setErrorMessage('Máy chủ đang gặp sự cố (500). Vui lòng thử lại.');
            } else {
                setErrorMessage('Không thể kết nối tới máy chủ. Vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Chỉ gọi 1 lần khi component mount.
    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    if (loading) {
        return (
            <div className="container mx-auto p-4">
                <h2 className="mb-4 border-l-4 border-indigo-600 pl-3 text-xl font-bold text-indigo-700">
                    Truyện Mới Cập Nhật
                </h2>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {Array.from({ length: 12 }).map((_, index) => (
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
                    <h3 className="text-lg font-semibold text-red-700">Không tải được danh sách truyện</h3>
                    <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                    <button
                        type="button"
                        onClick={fetchBooks}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    if ((books?.length ?? 0) === 0) {
        return (
            <div className="container mx-auto p-4">
                <div className="mx-auto mt-8 max-w-xl rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800">Chưa có truyện nào</h3>
                    <p className="mt-2 text-sm text-gray-500">Hiện chưa có dữ liệu truyện từ MongoDB.</p>
                    <button
                        type="button"
                        onClick={fetchBooks}
                        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        Tải lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="mb-4 border-l-4 border-indigo-600 pl-3 text-xl font-bold text-indigo-700">
                Truyện Mới Cập Nhật
            </h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {books.map((book, index) => {
                    const bookId = book?._id ?? `book-${index}`;
                    const title = book?.title?.trim() || 'Chưa có tên truyện';
                    const status = book?.status ?? 'Đang cập nhật';
                    const totalChapters = book?.total_chapters ?? 0;
                    const coverUrl = book?.cover_url?.trim() || PLACEHOLDER_COVER;
                    const latestChapters = Array.isArray(book?.latest_chapters)
                        ? book.latest_chapters.slice(0, 2)
                        : [];

                    const card = (
                        <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition group-hover:shadow-md">
                            <div className="aspect-[4/5] overflow-hidden bg-gray-100">
                                <img
                                    src={coverUrl}
                                    alt={title}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                    loading="lazy"
                                    onError={(event) => {
                                        // Nếu ảnh lỗi/broken link thì fallback về placeholder.
                                        if (event.currentTarget.src !== PLACEHOLDER_COVER) {
                                            event.currentTarget.src = PLACEHOLDER_COVER;
                                        }
                                    }}
                                />
                            </div>

                            <div className="p-3">
                                <h3 className="line-clamp-2 text-sm font-semibold text-gray-900" title={title}>
                                    {title}
                                </h3>

                                <div className="mt-3 min-h-[56px] border-l border-gray-200 pl-3">
                                    {latestChapters.length === 0 ? (
                                        <p className="text-xs text-gray-400">Chưa có chương mới</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {latestChapters.map((chapter, chapterIndex) => {
                                                const chapterKey = chapter?._id ?? `${bookId}-chapter-${chapterIndex}`;
                                                const chapterNumber = chapter?.chapter_number ?? '--';
                                                const chapterTime = formatChapterTimestamp(chapter?.createdAt);

                                                return (
                                                    <div key={chapterKey} className="flex items-center justify-between gap-2">
                                                        <span className="line-clamp-1 text-xs font-semibold text-gray-800">
                                                            Chương {chapterNumber}
                                                        </span>
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
                                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 line-clamp-1">
                                        {status}
                                    </span>
                                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                                        {totalChapters} chương
                                    </span>
                                </div>
                            </div>
                        </div>
                    );

                    return book?._id ? (
                        <Link to={`/truyen/${book._id}`} key={bookId} className="group">
                            {card}
                        </Link>
                    ) : (
                        <div key={bookId}>{card}</div>
                    );
                })}
            </div>
        </div>
    );
};

export default HomePage;
