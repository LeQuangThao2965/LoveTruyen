import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaBookOpen, FaClock, FaListOl, FaUserEdit } from 'react-icons/fa';
import api from '../../services/axiosConfig';
import MockComments from '../../components/MockComments';

const CHAPTERS_PER_PAGE = 50;
const COVER_PLACEHOLDER = 'https://placehold.co/280x360/e5e7eb/6b7280?text=No+Cover';

const formatDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const normalizeChapters = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
};

const BookDetail = () => {
    const { bookId } = useParams();

    const [book, setBook] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [chapterPage, setChapterPage] = useState(1);
    const [chapterTotalPages, setChapterTotalPages] = useState(1);
    const [chapterTotal, setChapterTotal] = useState(0);
    const [loadingBook, setLoadingBook] = useState(true);
    const [loadingChapters, setLoadingChapters] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const fetchBook = useCallback(async () => {
        setLoadingBook(true);
        try {
            const response = await api.get(`/books/${bookId}`);
            setBook(response?.book || null);
        } catch (error) {
            console.error('Loi lay chi tiet truyen:', error);
            setErrorMessage('Khong the tai chi tiet truyen.');
        } finally {
            setLoadingBook(false);
        }
    }, [bookId]);

    const fetchChapters = useCallback(
        async (page) => {
            setLoadingChapters(true);
            try {
                const response = await api.get(`/chapters/story/${bookId}`, {
                    params: {
                        page,
                        limit: CHAPTERS_PER_PAGE
                    }
                });

                setChapters(normalizeChapters(response));
                setChapterPage(response?.page || page);
                setChapterTotalPages(response?.totalPages || 1);
                setChapterTotal(response?.total || 0);
            } catch (error) {
                console.error('Loi lay danh sach chuong:', error);
                setErrorMessage('Khong the tai danh sach chuong.');
                setChapters([]);
                setChapterTotal(0);
                setChapterTotalPages(1);
            } finally {
                setLoadingChapters(false);
            }
        },
        [bookId]
    );

    useEffect(() => {
        setChapterPage(1);
        setErrorMessage('');
        fetchBook();
        fetchChapters(1);
    }, [fetchBook, fetchChapters]);

    const chapterSummary = useMemo(() => {
        if (chapterTotal === 0) return 'Chua co chuong';
        return `${chapterTotal} chuong`;
    }, [chapterTotal]);

    if (loadingBook) {
        return <div className="container mx-auto max-w-6xl p-4">Dang tai chi tiet truyen...</div>;
    }

    if (!book) {
        return (
            <div className="container mx-auto max-w-6xl p-4">
                <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                    {errorMessage || 'Khong tim thay truyen.'}
                </div>
            </div>
        );
    }

    const genres = Array.isArray(book?.genres) ? book.genres : [];

    return (
        <div className="container mx-auto max-w-6xl space-y-5 p-4">
            <section className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                    <img
                        src={book?.cover_url || COVER_PLACEHOLDER}
                        alt={book?.title || 'cover'}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                            if (event.currentTarget.src !== COVER_PLACEHOLDER) {
                                event.currentTarget.src = COVER_PLACEHOLDER;
                            }
                        }}
                    />
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-extrabold text-gray-900">{book?.title || '--'}</h1>

                    <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                        <p className="flex items-center gap-2">
                            <FaUserEdit className="text-indigo-500" /> Tac gia: <strong>{book?.author || '--'}</strong>
                        </p>
                        <p className="flex items-center gap-2">
                            <FaListOl className="text-indigo-500" /> {chapterSummary}
                        </p>
                        <p className="flex items-center gap-2">
                            <FaBookOpen className="text-indigo-500" /> Trang thai: <strong>{book?.status || '--'}</strong>
                        </p>
                        <p className="flex items-center gap-2">
                            <FaClock className="text-indigo-500" /> Cap nhat: <strong>{formatDate(book?.updatedAt)}</strong>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {genres.length === 0 ? (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                                Chua co the loai
                            </span>
                        ) : (
                            genres.map((genre) => (
                                <span
                                    key={`${book?._id}-${genre}`}
                                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                                >
                                    {genre}
                                </span>
                            ))
                        )}
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                        {book?.description || 'Chua co mo ta cho truyen nay.'}
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                    <h2 className="text-lg font-bold text-gray-800">Danh sách chương</h2>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                        Tối đa {CHAPTERS_PER_PAGE} chương/trang
                    </span>
                </div>

                {loadingChapters ? (
                    <div className="p-6 text-sm text-gray-500">Dang tai chuong...</div>
                ) : chapters.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">Truyen nay chua co chuong nao.</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                                        <th className="px-4 py-3">Chương</th>
                                        <th className="px-4 py-3">Tiêu đề</th>
                                        <th className="px-4 py-3">Ngày</th>
                                        <th className="px-4 py-3 text-right">READNOW</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {chapters.map((chapter) => (
                                        <tr key={chapter._id} className="transition hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-bold text-indigo-700">
                                                Ch.{chapter.chapter_number}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800">{chapter.title}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {formatDate(chapter.updatedAt || chapter.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    to={`/truyen/${book.slug || book._id}/chuong/${chapter.chapter_number}`}
                                                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                                                >
                                                    Đọc
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
                            <div className="text-sm font-semibold text-gray-600">
                                Trang {chapterPage}/{chapterTotalPages} - Tong {chapterTotal} chuong
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fetchChapters(Math.max(1, chapterPage - 1))}
                                    disabled={chapterPage === 1}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Truoc
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fetchChapters(Math.min(chapterTotalPages, chapterPage + 1))}
                                    disabled={chapterPage === chapterTotalPages}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            <MockComments
                storageKey={`mock_comments_book_${bookId}`}
                title="Binh luan truyện (frontend tam)"
                placeholder="Nhap binh luan cho truyen nay..."
            />
        </div>
    );
};

export default BookDetail;
