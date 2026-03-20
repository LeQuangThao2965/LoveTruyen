import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const UserPagination = ({ pagination, onPageChange }) => {
    const { page, limit, total, totalPages } = pagination;

    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-center gap-2 mt-4">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <FaChevronLeft className="text-sm" />
            </button>
            {startPage > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        1
                    </button>
                    {startPage > 2 && <span className="text-gray-500">...</span>}
                </>
            )}
            {pages.map(pageNum => (
                <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 rounded-lg border transition-colors ${
                        pageNum === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    {pageNum}
                </button>
            ))}
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        {totalPages}
                    </button>
                </>
            )}
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <FaChevronRight className="text-sm" />
            </button>
        </div>
    );
};

export const PaginationFooter = ({ pagination, onPageChange }) => {
    const { page, limit, total } = pagination;

    if (total === 0) return null;

    return (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                    Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} của {total} user
                </div>
                <UserPagination pagination={pagination} onPageChange={onPageChange} />
            </div>
        </div>
    );
};

export default UserPagination;
