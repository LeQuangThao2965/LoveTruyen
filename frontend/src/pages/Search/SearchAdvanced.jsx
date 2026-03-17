import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/axiosConfig';
import HomeBookCard from '../../components/HomeBookCard';

// Danh sách thể loại phổ biến
const POPULAR_GENRES = [
    'Tiên Hiệp', 'Huyền Huyễn', 'Kiếm Hiệp', 'Đô Thị', 'Ngôn Tình',
    'Dã Sử', 'Khoa Huyễn', 'Kinh Dị', 'Hài Hước', 'Truyện Ma',
    'Trinh Thám', 'Tiểu Thuyết', 'Lịch Sử', 'Võng Du', 'Dị Giới',
    'Hệ Thống', 'Hậu Cung', 'Cổ Trang', 'Ngược', 'Sủng',
    'HE', 'SE', 'BL', 'GL', 'Hướng nội',
    'Xuyên Nhi', 'Dị Năng', 'Sủng Thê', 'Ngọt Văn', 'Cung Đấu',
    'Huyền Ảo', 'Kiếm Tiên', 'Đại Chiến', 'Hài Hước', 'Lãng Mạn',
    'Thiếu Nhi', 'Diễn Nghệ', 'Cung Tử', 'Bách Hợp', 'Trọng Sinh',
    'Quân Sự', 'Hành Động', 'Khoa Học Viễn Tưởng', 'Thể Thao', 'Đấu Phá',
    'Mạt Thế', 'Dân Tộc', 'Gia Đình', 'Giáo Dục', 'Kinh Tế',
    'Chính Trị', 'Pháp Luật', 'Tâm Lý', 'Xã Hội', 'Văn Hóa',
    'Kỹ Thuật', 'Y Học', 'Thần Thoại', 'Bí Ẩn', 'Linh Tinh'
];

const SearchAdvanced = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // State cho filters
    const [filters, setFilters] = useState({
        title: searchParams.get('title') || '',
        genres: searchParams.get('genres')?.split(',') || [],
        year_start: searchParams.get('year_start') || '',
        year_end: searchParams.get('year_end') || '',
        sort_by: searchParams.get('sort_by') || 'relevance',
        sort_order: searchParams.get('sort_order') || 'desc'
    });
    
    // State cho results
    const [books, setBooks] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        totalPages: 1,
        total: 0,
        limit: 20
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // State cho genre search
    const [genreSearchQuery, setGenreSearchQuery] = useState('');
    
    // Filtered genres cho quick select
    const filteredGenres = useMemo(() => {
        if (!genreSearchQuery.trim()) return POPULAR_GENRES;
        return POPULAR_GENRES.filter(genre => 
            genre.toLowerCase().includes(genreSearchQuery.toLowerCase())
        );
    }, [genreSearchQuery]);

    // Fetch search results
    const fetchSearchResults = useCallback(async (page = 1) => {
        setLoading(true);
        setError('');
        
        try {
            const params = new URLSearchParams();
            if (filters.title.trim()) params.append('title', filters.title.trim());
            if (filters.genres.length > 0) params.append('genres', filters.genres.join(','));
            if (filters.year_start) params.append('year_start', filters.year_start);
            if (filters.year_end) params.append('year_end', filters.year_end);
            if (filters.sort_by) params.append('sort_by', filters.sort_by);
            if (filters.sort_order) params.append('sort_order', filters.sort_order);
            params.append('page', page.toString());
            params.append('limit', '20');
            
            const response = await api.get('/books/search-advanced', { params });
            
            setBooks(response.books || []);
            setPagination(response.pagination || pagination);
            
            // Update URL params
            setSearchParams(params);
            
        } catch (err) {
            console.error('Lỗi tìm kiếm:', err);
            setError(err.response?.data?.error || 'Không thể thực hiện tìm kiếm. Vui lòng thử lại.');
            setBooks([]);
        } finally {
            setLoading(false);
        }
    }, [filters, setLoading, setError, setBooks, setPagination, setSearchParams]);

    // Handle filter changes
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle genre selection
    const handleGenreToggle = (genre) => {
        setFilters(prev => {
            const newGenres = prev.genres.includes(genre)
                ? prev.genres.filter(g => g !== genre)
                : [...prev.genres, genre];
            return { ...prev, genres: newGenres };
        });
    };

    // Handle search submit
    const handleSearch = () => {
        fetchSearchResults(1);
    };

    // Handle reset
    const handleReset = () => {
        setFilters({
            title: '',
            genres: [],
            year_start: '',
            year_end: ''
        });
        setGenreSearchQuery('');
        setBooks([]);
        setError('');
        setSearchParams({});
    };

    // Handle pagination
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchSearchResults(newPage);
        }
    };

    // Initial load
    useEffect(() => {
        const hasActiveFilters = filters.title.trim() || 
                               filters.genres.length > 0 || 
                               filters.year_start || 
                               filters.year_end ||
                               filters.sort_by !== 'relevance' ||
                               filters.sort_order !== 'desc';
        if (hasActiveFilters) {
            fetchSearchResults(1);
        }
    }, [fetchSearchResults, filters.title, filters.genres.length, filters.year_start, filters.year_end, filters.sort_by, filters.sort_order]);

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Tìm Kiếm Nâng Cao</h1>
                <p className="text-gray-600">Tìm truyện theo tên, thể loại, và năm xuất bản</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bộ Lọc Tìm Kiếm</h2>
                        
                        {/* Sort Options */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sắp xếp theo
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={filters.sort_by}
                                    onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="relevance">Độ liên quan</option>
                                    <option value="updated_at">Ngày cập nhật mới nhất</option>
                                    <option value="createdAt">Ngày đăng</option>
                                    <option value="total_views">Lượt đọc</option>
                                    <option value="total_chapters">Số chương</option>
                                    <option value="rating">Đánh giá</option>
                                    <option value="status">Trạng thái</option>
                                </select>
                                <select
                                    value={filters.sort_order}
                                    onChange={(e) => handleFilterChange('sort_order', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="desc">Giảm dần</option>
                                    <option value="asc">Tăng dần</option>
                                </select>
                            </div>
                        </div>

                        {/* Title Search */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tên truyện
                            </label>
                            <input
                                type="text"
                                value={filters.title}
                                onChange={(e) => handleFilterChange('title', e.target.value)}
                                placeholder="Nhập tên truyện..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Genre Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Thể loại (có thể chọn nhiều)
                            </label>
                            
                            {/* Quick Genre Search */}
                            <div className="mb-2">
                                <input
                                    type="text"
                                    value={genreSearchQuery}
                                    onChange={(e) => setGenreSearchQuery(e.target.value)}
                                    placeholder="Tìm nhanh thể loại..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                            </div>
                            
                            {/* Genre List */}
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                                {filteredGenres.map(genre => (
                                    <label key={genre} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={filters.genres.includes(genre)}
                                            onChange={() => handleGenreToggle(genre)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">{genre}</span>
                                    </label>
                                ))}
                            </div>
                            
                            {/* Selected Genres */}
                            {filters.genres.length > 0 && (
                                <div className="mt-2">
                                    <div className="text-xs text-gray-500 mb-1">Đã chọn:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {filters.genres.map(genre => (
                                            <span
                                                key={genre}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 cursor-pointer hover:bg-indigo-200"
                                                onClick={() => handleGenreToggle(genre)}
                                            >
                                                {genre}
                                                <span className="ml-1">×</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Year Range */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Khoảng năm xuất bản
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    value={filters.year_start}
                                    onChange={(e) => handleFilterChange('year_start', e.target.value)}
                                    placeholder="Từ năm"
                                    min="2000"
                                    max={new Date().getFullYear()}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <input
                                    type="number"
                                    value={filters.year_end}
                                    onChange={(e) => handleFilterChange('year_end', e.target.value)}
                                    placeholder="Đến năm"
                                    min="2000"
                                    max={new Date().getFullYear()}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Đang tìm...' : 'Tìm kiếm'}
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="lg:col-span-3">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                            {error}
                        </div>
                    )}

                    {/* Results Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Kết quả tìm kiếm
                                </h3>
                                {pagination.total > 0 && (
                                    <p className="text-sm text-gray-600">
                                        Tìm thấy {pagination.total} truyện
                                    </p>
                                )}
                            </div>
                            {books.length > 0 && (
                                <div className="text-sm text-gray-500">
                                    Trang {pagination.current} / {pagination.totalPages}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    )}

                    {/* No Results */}
                    {!loading && books.length === 0 && !error && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                            <div className="text-gray-400 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy kết quả</h3>
                            <p className="text-gray-600 mb-4">
                                Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
                            </p>
                            <button
                                onClick={handleReset}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    )}

                    {/* Results Grid */}
                    {!loading && books.length > 0 && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                                {books.map((book, index) => (
                                    <HomeBookCard 
                                        key={`${book._id || ''}-${index}`} 
                                        book={book} 
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex justify-center items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.current - 1)}
                                        disabled={pagination.current === 1}
                                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Trước
                                    </button>
                                    
                                    <div className="flex space-x-1">
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            const pageNum = i + 1;
                                            const isActive = pageNum === pagination.current;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`px-3 py-1 rounded-md ${
                                                        isActive 
                                                            ? 'bg-indigo-600 text-white' 
                                                            : 'border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <button
                                        onClick={() => handlePageChange(pagination.current + 1)}
                                        disabled={pagination.current === pagination.totalPages}
                                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchAdvanced;
