import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaBookOpen, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import api from '../../services/axiosConfig';
import UploadBook from './UploadBook';

const PLACEHOLDER_COVER = 'https://placehold.co/120x160/e5e7eb/6b7280?text=No+Cover';
const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
const BASE_GENRES = [
    'Fantasy',
    'Hiện đại',
    'Sci-fi',
    'Romance',
    'Cổ Trang',
    'Kiếm Hiệp',
    'Tu Tiên'
];

const normalizeGenreKey = (value = '') =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const splitGenreText = (value) =>
    value
        .split(/[,/;|]+/g)
        .map((item) => item.trim())
        .filter(Boolean);

const extractGenreValues = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.flatMap(extractGenreValues);
    }

    if (typeof value === 'string') {
        return splitGenreText(value);
    }

    if (typeof value === 'object') {
        if (typeof value.name === 'string') return splitGenreText(value.name);
        if (typeof value.label === 'string') return splitGenreText(value.label);
        if (typeof value.slug === 'string') return splitGenreText(value.slug);
    }

    return [];
};

const getBookGenres = (book) => {
    const rawGenres = [
        book?.genre,
        book?.genres,
        book?.category,
        book?.categories,
        book?.tag,
        book?.tags
    ];

    const uniqueGenreMap = new Map();

    rawGenres
        .flatMap(extractGenreValues)
        .forEach((genre) => {
            const key = normalizeGenreKey(genre);
            if (!key || uniqueGenreMap.has(key)) return;
            uniqueGenreMap.set(key, genre.trim());
        });

    return Array.from(uniqueGenreMap.values());
};

const normalizeBooks = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.books)) return payload.books;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const MyBooks = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [showAllBooks, setShowAllBooks] = useState(false);
    const [showCoverColumn, setShowCoverColumn] = useState(false);
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchMyBooks();
    }, [showAllBooks]);

    useEffect(() => {
        if (searchParams.get('openUpload') !== '1') return;

        setIsUploadModalOpen(true);
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('openUpload');
        setSearchParams(nextSearchParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const fetchMyBooks = async () => {
        setLoading(true);

        try {
            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (!user) {
                setBooks([]);
                setUserRole('');
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            const currentRole = profile?.role || 'user';
            setUserRole(currentRole);

            const params =
                currentRole === 'admin' && showAllBooks
                    ? {}
                    : { uploader_id: user.id };

            const response = await api.get('/books', { params });
            setBooks(normalizeBooks(response));
        } catch (error) {
            console.error('Lỗi tải truyện:', error);
            setBooks([]);
            toast.error('Không thể tải danh sách truyện. Vui lòng kiểm tra API /api/books.');
        } finally {
            setLoading(false);
        }
    };

    const availableGenres = useMemo(() => {
        const map = new Map();

        [...BASE_GENRES, ...books.flatMap(getBookGenres)].forEach((genre) => {
            const key = normalizeGenreKey(genre);
            if (!key || map.has(key)) return;
            map.set(key, genre.trim());
        });

        return Array.from(map.values());
    }, [books]);

    const filteredBooks = useMemo(() => {
        if (selectedGenres.length === 0) return books;

        const selectedGenreKeys = selectedGenres.map(normalizeGenreKey);

        return books.filter((book) => {
            const bookGenreKeys = getBookGenres(book).map(normalizeGenreKey);

            return selectedGenreKeys.some((selectedKey) =>
                bookGenreKeys.some((bookKey) => bookKey === selectedKey)
            );
        });
    }, [books, selectedGenres]);

    const totalPages = useMemo(() => {
        if (filteredBooks.length === 0) return 1;
        return Math.ceil(filteredBooks.length / itemsPerPage);
    }, [filteredBooks.length, itemsPerPage]);

    const paginatedBooks = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredBooks.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredBooks, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedGenres, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const formatDate = (dateString) => {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const toggleGenre = (genre) => {
        setSelectedGenres((prev) =>
            prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre]
        );
    };

    return (
        <div className="container mx-auto p-4 max-w-6xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
                        <FaBookOpen className="text-purple-600" /> Quản Lý Truyện Đã Đăng
                    </h1>
                    <p className="text-gray-500 mt-1">Trang quản lý truyện dành cho Host và Admin.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition shadow-md shrink-0"
                >
                    <FaPlus /> Đăng Truyện Mới
                </button>
            </div>

            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">Thể loại:</span>
                    {availableGenres.map((genre) => {
                        const isSelected = selectedGenres.includes(genre);

                        return (
                            <button
                                key={genre}
                                type="button"
                                onClick={() => toggleGenre(genre)}
                                className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                                    isSelected
                                        ? 'border-indigo-600 bg-indigo-600 text-white'
                                        : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600'
                                }`}
                            >
                                {genre}
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setSelectedGenres([])}
                        className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Xóa lọc
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                    {userRole === 'admin' && (
                        <button
                            type="button"
                            onClick={() => setShowAllBooks((prev) => !prev)}
                            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                                showAllBooks
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Hiển thị toàn bộ truyện: {showAllBooks ? 'true' : 'false'}
                        </button>
                    )}

                    {(userRole === 'host' || userRole === 'admin') && (
                        <button
                            type="button"
                            onClick={() => setShowCoverColumn((prev) => !prev)}
                            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                                showCoverColumn
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Hiển thị ảnh bìa: {showCoverColumn ? 'true' : 'false'}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-500 font-medium animate-pulse">
                        Đang tải danh sách truyện...
                    </div>
                ) : books.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        Bạn chưa đăng bộ truyện nào. Hãy bắt đầu tác phẩm đầu tiên của mình.
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        Không có truyện phù hợp với thể loại đã chọn.
                    </div>
                ) : (
                    <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                    {showCoverColumn && <th className="px-6 py-4 font-bold">Ảnh bìa</th>}
                                    <th className="px-6 py-4 font-bold">Tên Truyện</th>
                                    <th className="px-6 py-4 font-bold">Tác Giả</th>
                                    <th className="px-6 py-4 font-bold">Thể loại</th>
                                    <th className="px-6 py-4 font-bold text-center">Số Chương</th>
                                    <th className="px-6 py-4 font-bold">Trạng Thái</th>
                                    <th className="px-6 py-4 font-bold">Cập Nhật Gần Nhất</th>
                                    <th className="px-6 py-4 font-bold text-center">Hành Động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedBooks.map((book, index) => {
                                    const bookGenres = getBookGenres(book);
                                    const bookId = book?._id ?? `${book?.title || 'book'}-${index}`;

                                    return (
                                        <tr key={bookId} className="hover:bg-gray-50 transition">
                                            {showCoverColumn && (
                                                <td className="px-6 py-4">
                                                    <img
                                                        src={book?.cover_url?.trim() || PLACEHOLDER_COVER}
                                                        alt={book?.title || 'cover'}
                                                        className="h-16 w-12 rounded object-cover border border-gray-200 bg-gray-100"
                                                        loading="lazy"
                                                        onError={(event) => {
                                                            if (event.currentTarget.src !== PLACEHOLDER_COVER) {
                                                                event.currentTarget.src = PLACEHOLDER_COVER;
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            )}

                                            <td className="px-6 py-4 font-bold text-gray-800">{book.title || '--'}</td>
                                            <td className="px-6 py-4 text-gray-600">{book.author || '--'}</td>
                                            <td className="px-6 py-4">
                                                {bookGenres.length === 0 ? (
                                                    <span className="text-xs text-gray-400">--</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {bookGenres.slice(0, 3).map((genre) => (
                                                            <span
                                                                key={`${bookId}-${genre}`}
                                                                className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700"
                                                            >
                                                                {genre}
                                                            </span>
                                                        ))}
                                                        {bookGenres.length > 3 && (
                                                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                                                +{bookGenres.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full font-bold text-sm">
                                                    {book.total_chapters ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`py-1 px-3 rounded-full font-bold text-xs ${
                                                        book.status === 'Đang cập nhật'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-200 text-gray-700'
                                                    }`}
                                                >
                                                    {book.status || 'Đang cập nhật'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(book.updatedAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-3">
                                                    <Link
                                                        to={`/upload-chapter/${book._id}`}
                                                        className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition"
                                                        title="Thêm chương mới"
                                                    >
                                                        <FaPlus size={14} />
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        className="p-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition"
                                                        title="Sửa thông tin truyện"
                                                    >
                                                        <FaEdit size={14} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
                                                        title="Xóa truyện"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                </div>
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
                            <label htmlFor="books-per-page" className="font-semibold text-gray-600">
                                Truyện/trang
                            </label>
                            <select
                                id="books-per-page"
                                value={itemsPerPage}
                                onChange={(event) => setItemsPerPage(Number(event.target.value))}
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

            <UploadBook
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={fetchMyBooks}
            />
        </div>
    );
};

export default MyBooks;
