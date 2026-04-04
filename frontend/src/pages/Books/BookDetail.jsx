import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaBookOpen, FaClock, FaListOl, FaUserEdit } from 'react-icons/fa';
import api from '../../services/axiosConfig';
import MockComments from '../../components/MockComments';

import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { toast } from 'react-toastify'; // Để hiện thông báo

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

    const [isFavorited, setIsFavorited] = useState(false);
    const [loadingFav, setLoadingFav] = useState(false);

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
    //////////////////////////////////////////////////////////////////////////

    const checkFavoriteStatus = useCallback(async (actualBookId) => {
        if (!actualBookId) return; // Nếu chưa có ID thật thì không làm gì cả
        try {
            const res = await api.get(`/favorites/check/${actualBookId}`);
            setIsFavorited(res.isFavorited);
        } catch (error) {
            console.log("Chưa đăng nhập hoặc lỗi check favorite");
        }
    }, []);
    
    /////////////////////////////////////////////////////////////////////
    // useEffect 1: Chạy 1 lần duy nhất lúc mới vào trang để lấy thông tin truyện
    useEffect(() => {
        setChapterPage(1);
        setErrorMessage('');
        fetchBook();
        fetchChapters(1);
    }, [fetchBook, fetchChapters]);

    // useEffect 2: Theo dõi biến 'book', cứ khi nào lấy được book._id thật thì mới check favorite
    useEffect(() => {
        if (book && book._id) {
            checkFavoriteStatus(book._id);
        }
    }, [book, checkFavoriteStatus]);
    /////////////////////////////////////////////////////////////////////

    if (loadingBook) {
        return <div className="container mx-auto max-w-6xl p-4">Dang tai chi tiet truyen...</div>;
    }

    const handleToggleFavorite = async () => {
        setLoadingFav(true);
        try {
            const res = await api.post('/favorites/toggle', { bookId: book._id });
            setIsFavorited(res.isFavorited);
            if (res.isFavorited) {
                toast.success('Đã thêm vào tủ sách!');
            } else {
                toast.info('Đã bỏ theo dõi.');
            }
        } catch (error) {
            toast.error('Vui lòng đăng nhập để sử dụng tính năng này!');
        } finally {
            setLoadingFav(false);
        }
    };
    //////////////////////////////////////////////////////////////////////////

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
                {/* Cột 1: Ảnh bìa (Giữ nguyên) */}
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

                {/* Cột 2: Nội dung - Đã thêm relative flex flex-col để đẩy nút xuống đáy */}
                <div className="relative flex flex-col space-y-3 pb-12"> 
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

                    {/* NÚT THEO DÕI: Nằm ở góc dưới bên phải */}
                    <button
                        onClick={handleToggleFavorite}
                        disabled={loadingFav}
                        className={`absolute bottom-0 right-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all ${
                            isFavorited 
                            ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        {isFavorited ? <FaHeart className="text-lg" /> : <FaRegHeart className="text-lg" />}
                        {isFavorited ? 'Đã Theo dõi' : 'Theo dõi'}
                    </button>
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

            {/* ĐÃ SỬA: Bọc điều kiện book._id để chống lỗi 500 do Slug */}
            {book?._id && (
                <MockComments
                    bookId={book._id}
                    title="Bình luận truyện"
                    placeholder="Nhập bình luận cho truyện này..."
                />
            )}
        </div>
    );
};

export default BookDetail;
