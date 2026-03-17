import { Link } from 'react-router-dom';

const PLACEHOLDER_COVER = 'https://picsum.photos/seed/nocover/300x400.jpg';

const HomeBookCard = ({ book, ranking }) => {
    const bookId = book?._id || '';
    const title = book?.title?.trim() || 'Chua co ten truyen';
    const coverUrl = book?.cover_url?.trim() || PLACEHOLDER_COVER;
    const author = book?.author?.trim() || 'Tac gia';
    const totalChapters = book?.total_chapters || 0;
    const views = book?.total_views || 0;
    const status = book?.status || 'Đang cập nhật';

    // Get latest chapters for display
    const latestChapters = book?.latest_chapters || [];
    const displayChapters = latestChapters.slice(0, 2);

    return (
        <Link 
            to={`/truyen/${bookId}`}
            className="group block w-full transition-transform duration-200 hover:scale-105"
            data-book-id={bookId}
        >
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200">
                {/* Cover Image with Ranking Badge */}
                <div className="relative aspect-4/5 bg-gray-100 overflow-hidden">
                    {ranking && (
                        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                            #{ranking}
                        </div>
                    )}
                    
                    <img
                        src={coverUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                            e.target.src = PLACEHOLDER_COVER;
                        }}
                        loading="lazy"
                    />
                    
                    {/* Status Badge */}
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {status}
                    </div>
                </div>

                {/* Book Info */}
                <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                        {title}
                    </h3>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                        {author}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{totalChapters} chương</span>
                        <span>{views.toLocaleString()} lượt đọc</span>
                    </div>

                    {/* Latest Chapters */}
                    {displayChapters.length > 0 && (
                        <div className="space-y-1">
                            {displayChapters.map((chapter, index) => (
                                <div 
                                    key={chapter._id || index}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors line-clamp-1"
                                >
                                    {chapter.title || `Chương ${chapter.chapter_number || index + 1}`}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default HomeBookCard;
