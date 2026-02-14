import { useEffect, useState } from 'react';
import { storyService } from '../services/storyService';
import { Link } from 'react-router-dom';

const HomePage = () => {
    const [stories, setStories] = useState([]); // Chứa danh sách truyện
    const [loading, setLoading] = useState(true); // Trạng thái đang tải

    // useEffect chạy 1 lần duy nhất khi vào trang
    useEffect(() => {
        const fetchStories = async () => {
            try {
                // Gọi API lấy truyện
                const response = await storyService.getLatestStories();
                
                // Backend trả về: { success: true, data: [...] }
                // Axios interceptor đã lấy .data rồi, nên ta kiểm tra response.success
                if (response.success) {
                    setStories(response.data);
                }
            } catch (error) {
                console.log("Lỗi tải truyện:", error);
            } finally {
                setLoading(false); // Tải xong (dù lỗi hay không) cũng tắt loading
            }
        };

        fetchStories();
    }, []);

    if (loading) return <div className="text-center p-10">Đang tải truyện...</div>;

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-xl font-bold mb-4 text-indigo-700 border-l-4 border-indigo-600 pl-3">
                Truyện Mới Cập Nhật
            </h2>
            
            {/* Grid hiển thị truyện */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {stories.map((story) => (
                    <Link to={`/truyen/${story._id}`} key={story._id} className="group">
                        <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition bg-white h-full flex flex-col">
                            {/* Ảnh bìa */}
                            <div className="aspect-[2/3] overflow-hidden">
                                <img 
                                    src={story.coverImage || "https://via.placeholder.com/300x400"} 
                                    alt={story.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                            </div>
                            
                            {/* Thông tin */}
                            <div className="p-2 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-semibold text-sm line-clamp-2 mb-1" title={story.title}>
                                        {story.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 line-clamp-1">{story.author}</p>
                                </div>
                                
                                {story.latestChapter && (
                                    <div className="mt-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded inline-block w-fit">
                                        Chương {story.latestChapter.number}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {stories.length === 0 && (
                <p className="text-center text-gray-500">Chưa có truyện nào được đăng.</p>
            )}
        </div>
    );
};

export default HomePage;