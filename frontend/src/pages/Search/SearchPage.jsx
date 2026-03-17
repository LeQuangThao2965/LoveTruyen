import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import api from '../services/axiosConfig';

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    const limit = 20;

    useEffect(() => {
        if (query.trim()) {
            performSearch(query, 1);
        }
    }, [query]);

    const performSearch = async (searchQuery, page = 1) => {
        setLoading(true);
        setError('');
        
        try {
            const response = await api.get('/books', {
                params: {
                    title: searchQuery.trim(),
                    page,
                    limit
                }
            });

            setSearchResults(response.books || []);
            setTotalPages(response.totalPages || 1);
            setTotalResults(response.total || 0);
            setCurrentPage(page);
        } catch (err) {
            console.error('Lỗi khi tìm kiếm:', err);
            setError('Không thể tìm kiếm. Vui lòng thử lại.');
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            performSearch(query, newPage);
        }
    };

    if (!query.trim()) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center text-gray-500">
                    <p className="text-lg">Vui lòng nhập từ khóa tìm kiếm</p>
                    <Link to="/" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
                        ← Quay lại trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Kết quả tìm kiếm cho: "{query}"
                </h1>
                <p className="text-gray-600">
                    {totalResults > 0 
                        ? `Tìm thấy ${totalResults} kết quả` 
                        : 'Không tìm thấy kết quả nào'
                    }
                </p>
                <Link to="/" className="text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
                    ← Quay lại trang chủ
                </Link>
            </div>

            {/* Loading */}
            {loading && (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-500">Đang tìm kiếm...</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            {/* Search Results */}
            {!loading && !error && searchResults.length > 0 && (
                <div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                        {searchResults.map((book) => (
                            <Link
                                key={book._id}
                                to={`/truyen/${book._id}`}
                                className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                            >
                                <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
                                    <img
                                        src={book.cover_url || 'https://via.placeholder.com/200x250?text=No+Cover'}
                                        alt={book.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/200x250?text=No+Cover';
                                        }}
                                    />
                                </div>
                                <div className="p-3">
                                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                                        {book.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                                        {book.author}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>{book.total_chapters || 0} chương</span>
                                        <span>{book.total_views || 0} lượt xem</span>
                                    </div>
                                    {book.status && (
                                        <div className="mt-2">
                                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                                book.status === 'Hoàn thành' 
                                                    ? 'bg-green-100 text-green-700'
                                                    : book.status === 'Đang cập nhật'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {book.status}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${
                                    currentPage === 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                ←
                            </button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                                            currentPage === pageNum
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${
                                    currentPage === totalPages
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* No Results */}
            {!loading && !error && searchResults.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Không tìm thấy truyện nào
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Không có kết quả nào cho từ khóa "{query}"
                    </p>
                    <div className="space-y-2">
                        <p className="text-sm text-gray-400">Gợi ý:</p>
                        <ul className="text-sm text-gray-500 space-y-1">
                            <li>• Kiểm tra lại chính tả từ khóa</li>
                            <li>• Thử dùng từ khóa khác</li>
                            <li>• Tìm theo tên tác giả</li>
                        </ul>
                    </div>
                    <Link to="/" className="text-indigo-600 hover:text-indigo-800 mt-6 inline-block">
                        ← Quay lại trang chủ
                    </Link>
                </div>
            )}
        </div>
    );
};

export default SearchPage;
