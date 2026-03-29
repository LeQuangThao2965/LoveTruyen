import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/axiosConfig';
import HomeBookCard from '../../components/HomeBookCard';

const Search = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        totalPages: 1,
        total: 0,
        limit: 20
    });

    const fetchSearchResults = async (page = 1) => {
        setLoading(true);
        setError('');
        
        try {
            const params = {
                title: query,
                page: page.toString(),
                limit: '20'
            };
            
            const response = await api.get('/books/search-advanced', { params });
            
            setBooks(response.books || []);
            setPagination(response.pagination || pagination);
            
        } catch (err) {
            console.error('Lỗi tìm kiếm:', err);
            setError(err.response?.data?.error || 'Không thể thực hiện tìm kiếm. Vui lòng thử lại.');
            setBooks([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchSearchResults(newPage);
        }
    };

    useEffect(() => {
        if (query.trim()) {
            fetchSearchResults(1);
        }
    }, [query]);

    if (!query.trim()) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Vui lòng nhập từ khóa tìm kiếm</h3>
                    <p className="text-gray-600">Nhập tên truyện bạn muốn tìm trong ô tìm kiếm ở trên</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Kết quả tìm kiếm cho: "{query}"
                </h1>
                {pagination.total > 0 && (
                    <p className="text-gray-600">Tìm thấy {pagination.total} kết quả</p>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                    {error}
                </div>
            )}

            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {!loading && books.length === 0 && !error && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy kết quả</h3>
                    <p className="text-gray-600">Không có truyện nào khớp với từ khóa "{query}"</p>
                </div>
            )}

            {!loading && books.length > 0 && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                        {books.map((book, index) => (
                            <HomeBookCard 
                                key={book._id || `search-book-${index}`} 
                                book={book} 
                            />
                        ))}
                    </div>

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
    );
};

export default Search;
