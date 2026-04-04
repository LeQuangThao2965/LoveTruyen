import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaBookOpen, FaTrash, FaHeartBroken } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/axiosConfig';

const COVER_PLACEHOLDER = 'https://placehold.co/280x360/e5e7eb/6b7280?text=No+Cover';

const FavoriteList = () => {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Gọi API lấy danh sách truyện đang theo dõi
    const fetchFavorites = useCallback(async () => {
        setLoading(true);
        try {
            // Giả định backend có route GET /favorites/my-list
            const response = await api.get('/favorites/my-list');
            // Backend nên trả về mảng các object có chứa thông tin book đã được populate
            setFavorites(response.data || response || []);
        } catch (error) {
            console.error('Lỗi lấy danh sách theo dõi:', error);
            toast.error('Không thể tải tủ sách. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    // 2. Hàm xử lý khi bấm nút "Bỏ theo dõi" trực tiếp trên thẻ truyện
    const handleRemoveFavorite = async (bookId, title) => {
        if (!window.confirm(`Bạn có chắc muốn bỏ theo dõi truyện "${title}" không?`)) return;

        try {
            // Gọi lại API toggle hoặc remove mà bro đã viết ở Backend
            await api.post('/favorites/toggle', { bookId });
            
            // Cập nhật lại giao diện ngay lập tức (xóa truyện đó khỏi mảng favorites)
            setFavorites((prev) => prev.filter((fav) => fav.book_id?._id !== bookId));
            toast.success(`Đã bỏ theo dõi "${title}"`);
        } catch (error) {
            toast.error('Có lỗi xảy ra, vui lòng thử lại!');
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto max-w-6xl p-4 text-center text-gray-500 mt-10">
                Đang tải tủ sách của bạn...
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl p-4 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                <FaBookOpen className="text-2xl text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-800">Tủ sách của tôi</h1>
                <span className="ml-auto rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                    {favorites.length} truyện
                </span>
            </div>

            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-20">
                    <FaHeartBroken className="text-5xl text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">Bạn chưa theo dõi bộ truyện nào.</p>
                    <Link
                        to="/"
                        className="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white transition hover:bg-indigo-700"
                    >
                        Khám phá truyện ngay
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {favorites.map((fav) => {
                        // Lấy thông tin sách từ object (tùy thuộc vào cách backend populate)
                        const book = fav.book_id; 
                        if (!book) return null; // Bỏ qua nếu sách đã bị xóa rễ khỏi DB

                        return (
                            <div
                                key={fav._id}
                                className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                            >
                                {/* Nút Xóa (Bỏ theo dõi) nằm đè lên góc phải ảnh */}
                                <button
                                    onClick={() => handleRemoveFavorite(book._id, book.title)}
                                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                                    title="Bỏ theo dõi"
                                >
                                    <FaTrash className="text-sm" />
                                </button>

                                {/* Ảnh bìa */}
                                <Link to={`/truyen/${book.slug || book._id}`} className="aspect-[2/3] w-full overflow-hidden bg-gray-100">
                                    <img
                                        src={book.cover_url || COVER_PLACEHOLDER}
                                        alt={book.title}
                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                        onError={(e) => {
                                            if (e.currentTarget.src !== COVER_PLACEHOLDER) {
                                                e.currentTarget.src = COVER_PLACEHOLDER;
                                            }
                                        }}
                                    />
                                </Link>

                                {/* Thông tin truyện */}
                                <div className="flex flex-1 flex-col p-3">
                                    <Link
                                        to={`/truyen/${book.slug || book._id}`}
                                        className="line-clamp-2 text-sm font-bold text-gray-800 transition hover:text-indigo-600"
                                        title={book.title}
                                    >
                                        {book.title}
                                    </Link>
                                    <p className="mt-1 truncate text-xs text-gray-500">{book.author}</p>
                                    
                                    <Link
                                        to={`/truyen/${book.slug || book._id}`}
                                        className="mt-auto block w-full rounded border border-indigo-600 bg-indigo-50 py-1.5 text-center text-xs font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white mt-3"
                                    >
                                        Đọc tiếp
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FavoriteList;