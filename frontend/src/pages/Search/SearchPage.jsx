import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/axiosConfig';

const PLACEHOLDER_COVER = 'https://placehold.co/320x420/e5e7eb/6b7280?text=No+Cover';
const RESULTS_PER_PAGE = 12;

const normalizeBooks = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.books)) return payload.books;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [totalBooks, setTotalBooks] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedGenres, setSelectedGenres] = useState([]);

    const query = searchParams.get('q') || '';
    const genre = searchParams.get('genre') || '';
    const status = searchParams.get('status') || '';
    const yearStart = searchParams.get('year_start') || '';
    const yearEnd = searchParams.get('year_end') || '';
    const sortBy = searchParams.get('sort') || 'updatedAt';

    // Available genres for multi-select
    const availableGenres = [
        'Tiên Hiệp', 'Huyền Huyễn', 'Đô Thị', 'Lịch Sử', 'Kiếm Hiệp',
        'Ngôn Tình', 'Dã Sử', 'Khoa Học', 'Đồng Nhân', 'Hài Hước',
        'Máu Đầu', 'Cổ Trang', 'Hài Hước', 'Light Novel', 'Truyện Ma'
    ];

    // Initialize selected genres from URL params
    useEffect(() => {
        if (genre) {
            const genres = genre.split(',').filter(g => g.trim());
            setSelectedGenres(genres);
        } else {
            setSelectedGenres([]);
        }
    }, [genre]);

    const fetchSearchResults = useCallback(async (page = 1) => {
        if (!query.trim() && selectedGenres.length === 0 && !status && !yearStart && !yearEnd) {
            setBooks([]);
            setTotalBooks(0);
            setTotalPages(1);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: RESULTS_PER_PAGE.toString(),
                ...(query.trim() && { q: query.trim() }),
                ...(genre && { genre }),
                ...(status && { status }),
                ...(yearStart && { year_start: yearStart }),
                ...(yearEnd && { year_end: yearEnd }),
                ...(sortBy && { sort: sortBy })
            });

            const response = await api.get(`/books/search?${params.toString()}`);
            
            const booksData = normalizeBooks(response);
            const safeTotal = Math.max(0, Number(response?.total) || 0);
            const safeTotalPages = Math.max(1, Math.ceil(safeTotal / RESULTS_PER_PAGE));

            setBooks(booksData);
            setTotalBooks(safeTotal);
            setTotalPages(safeTotalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error('Lỗi tìm kiếm:', error);
            setError('Không thể tìm kiếm. Vui lòng thử lại.');
            setBooks([]);
            setTotalBooks(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [query, selectedGenres, genre, status, yearStart, yearEnd, sortBy]);

    useEffect(() => {
        fetchSearchResults(1);
    }, [fetchSearchResults]);

    const handleSearch = (e) => {
        e.preventDefault();
        const newQuery = e.target.elements.search.value;
        const newParams = new URLSearchParams(searchParams);
        
        if (newQuery.trim()) {
            newParams.set('q', newQuery.trim());
        } else {
            newParams.delete('q');
        }
        
        newParams.delete('page'); // Reset về trang 1
        setSearchParams(newParams);
    };

    const handleFilterChange = (filterType, value) => {
        const newParams = new URLSearchParams(searchParams);
        
        if (filterType === 'genre') {
            // Handle multi-genre selection
            if (selectedGenres.includes(value)) {
                // Remove genre
                const newGenres = selectedGenres.filter(g => g !== value);
                setSelectedGenres(newGenres);
                if (newGenres.length > 0) {
                    newParams.set('genre', newGenres.join(','));
                } else {
                    newParams.delete('genre');
                }
            } else {
                // Add genre
                const newGenres = [...selectedGenres, value];
                setSelectedGenres(newGenres);
                newParams.set('genre', newGenres.join(','));
            }
        } else {
            // Handle other filters
            if (value) {
                newParams.set(filterType, value);
            } else {
                newParams.delete(filterType);
            }
        }
        
        newParams.delete('page'); // Reset về trang 1
        setSearchParams(newParams);
    };

    const handleYearRangeChange = (type, value) => {
        const newParams = new URLSearchParams(searchParams);
        
        if (value && value.trim()) {
            newParams.set(type, value.trim());
        } else {
            newParams.delete(type);
        }
        
        newParams.delete('page'); // Reset về trang 1
        setSearchParams(newParams);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('page', page.toString());
            setSearchParams(newParams);
        }
    };

    const BookCard = ({ book }) => {
        const bookId = book?._id || '';
        const title = book?.title?.trim() || 'Chưa có tên truyện';
        const coverUrl = book?.cover_url?.trim() || PLACEHOLDER_COVER;
        const status = book?.status || 'Đang cập nhật';
        const totalChapters = Number(book?.total_chapters || 0);
        const totalViews = Number(book?.total_views || 0);
        const publicationYear = book?.publication_year;

        return (
            <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
                <Link
                    to={bookId ? `/truyen/${bookId}` : '#'}
                    className="relative aspect-[4/5] overflow-hidden bg-gray-100"
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
                    <span className="absolute left-2 top-2 rounded bg-blue-500 px-2 py-1 text-[11px] font-bold text-white">
                        {status}
                    </span>
                    {publicationYear && (
                        <span className="absolute right-2 top-2 rounded bg-gray-800/80 px-2 py-1 text-[11px] font-bold text-white">
                            {publicationYear}
                        </span>
                    )}
                </Link>

                <div className="flex flex-1 flex-col p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900" title={title}>
                        {bookId ? (
                            <Link to={`/truyen/${bookId}`} className="hover:text-indigo-600">
                                {title}
                            </Link>
                        ) : (
                            title
                        )}
                    </h3>
                    
                    <div className="mt-2 text-xs text-gray-500">
                        <span>{totalChapters} chương</span>
                        <span className="mx-1">•</span>
                        <span>{totalViews.toLocaleString('vi-VN')} lượt đọc</span>
                    </div>
                </div>
            </article>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Tìm Kiếm Truyện</h1>
                    
                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="mb-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="search"
                                defaultValue={query}
                                placeholder="Nhập tên truyện, tác giả..."
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700 transition"
                            >
                                Tìm kiếm
                            </button>
                        </div>
                    </form>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                        {/* Multi-Genre Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thể loại (chọn nhiều)</label>
                            <div className="max-w-xs">
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 rounded-lg bg-white">
                                    {availableGenres.map((g) => (
                                        <label key={g} className="flex items-center text-xs">
                                            <input
                                                type="checkbox"
                                                checked={selectedGenres.includes(g)}
                                                onChange={() => handleFilterChange('genre', g)}
                                                className="mr-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            {g}
                                        </label>
                                    ))}
                                </div>
                                {selectedGenres.length > 0 && (
                                    <div className="mt-1 text-xs text-gray-500">
                                        Đã chọn: {selectedGenres.join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                            <select
                                value={status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="">Tất cả</option>
                                <option value="Đang cập nhật">Đang cập nhật</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                                <option value="Tạm hoãn">Tạm hoãn</option>
                            </select>
                        </div>

                        {/* Year Range Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Năm xuất bản</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="Từ"
                                    value={yearStart}
                                    onChange={(e) => handleYearRangeChange('year_start', e.target.value)}
                                    min="1900"
                                    max={new Date().getFullYear() + 1}
                                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                                <span className="text-gray-500">-</span>
                                <input
                                    type="number"
                                    placeholder="Đến"
                                    value={yearEnd}
                                    onChange={(e) => handleYearRangeChange('year_end', e.target.value)}
                                    min="1900"
                                    max={new Date().getFullYear() + 1}
                                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Sort Options */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sắp xếp</label>
                            <select
                                value={sortBy}
                                onChange={(e) => handleFilterChange('sort', e.target.value)}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="updatedAt">Mới cập nhật</option>
                                <option value="total_views">Lượt đọc</option>
                                <option value="title">Tên A-Z</option>
                                <option value="publication_year">Năm xuất bản</option>
                                <option value="createdAt">Ngày đăng</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results Info */}
                <div className="mb-4 text-sm text-gray-600">
                    {query && `Tìm kiếm cho: "${query}"`}
                    {totalBooks > 0 && ` - Tìm thấy ${totalBooks} kết quả`}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="text-gray-500">Đang tìm kiếm...</div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {/* Results Grid */}
                {!loading && !error && books.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 mb-6">
                        {books.map((book) => (
                            <BookCard key={book?._id || `search-book-${Math.random()}`} book={book} />
                        ))}
                    </div>
                )}

                {/* No Results */}
                {!loading && !error && books.length === 0 && (query || selectedGenres.length > 0 || status || yearStart || yearEnd) && (
                    <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">Không tìm thấy kết quả nào</div>
                        <div className="text-sm text-gray-400">
                            Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm
                        </div>
                    </div>
                )}

                {/* No Search */}
                {!loading && !error && !query && selectedGenres.length === 0 && !status && !yearStart && !yearEnd && (
                    <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">Nhập từ khóa hoặc chọn bộ lọc để tìm kiếm truyện</div>
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Trước
                        </button>

                        <span className="text-sm text-gray-600">
                            Trang {currentPage} / {totalPages}
                        </span>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
