import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaBookOpen } from 'react-icons/fa';

const MyBooks = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyBooks();
    }, []);

    const fetchMyBooks = async () => {
        setLoading(true);
        try {
            // Lấy ID người dùng
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // TODO: GỌI API LẤY DANH SÁCH TRUYỆN TỪ MONGODB DỰA TRÊN uploader_id
            // Ví dụ: const response = await axios.get(`http://localhost:5000/api/books?uploader_id=${user.id}`);
            // setBooks(response.data);

            // Tạm thời dùng MOCK DATA (Dữ liệu giả) để hiển thị giao diện
            setTimeout(() => {
                setBooks([
                    {
                        _id: "mongo_id_1",
                        title: "Phàm Nhân Tu Tiên",
                        author: "Vong Ngữ",
                        status: "Đang ra",
                        total_chapters: 145,
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: "mongo_id_2",
                        title: "Đấu Phá Thương Khung",
                        author: "Thiên Tằm Thổ Đậu",
                        status: "Hoàn thành",
                        total_chapters: 1641,
                        updatedAt: new Date(Date.now() - 86400000).toISOString()
                    }
                ]);
                setLoading(false);
            }, 800);

        } catch (error) {
            console.error("Lỗi tải truyện:", error);
            setLoading(false);
        }
    };

    // Hàm format ngày tháng cho đẹp
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        }).format(date);
    };

    return (
        <div className="container mx-auto p-4 max-w-6xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
                        <FaBookOpen className="text-purple-600" /> Quản Lý Truyện Của Tôi
                    </h1>
                    <p className="text-gray-500 mt-1">Quản lý, thêm chương và chỉnh sửa các tác phẩm bạn đã đăng.</p>
                </div>
                <Link 
                    to="/host/upload" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition shadow-md"
                >
                    <FaPlus /> Đăng Truyện Mới
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-500 font-medium animate-pulse">
                        Đang tải danh sách truyện...
                    </div>
                ) : books.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        Bạn chưa đăng bộ truyện nào. Hãy bắt đầu tác phẩm đầu tiên của mình!
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                    <th className="px-6 py-4 font-bold">Tên Truyện</th>
                                    <th className="px-6 py-4 font-bold">Tác Giả</th>
                                    <th className="px-6 py-4 font-bold text-center">Số Chương</th>
                                    <th className="px-6 py-4 font-bold">Trạng Thái</th>
                                    <th className="px-6 py-4 font-bold">Cập Nhật Gần Nhất</th>
                                    <th className="px-6 py-4 font-bold text-center">Hành Động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {books.map((book) => (
                                    <tr key={book._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-bold text-gray-800">{book.title}</td>
                                        <td className="px-6 py-4 text-gray-600">{book.author}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full font-bold text-sm">
                                                {book.total_chapters}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`py-1 px-3 rounded-full font-bold text-xs ${book.status === 'Đang ra' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                                                {book.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {formatDate(book.updatedAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-3">
                                                {/* Nút Thêm Chương Mới */}
                                                <Link 
                                                    to={`/upload-chapter/${book._id}`} 
                                                    className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition"
                                                    title="Thêm chương mới"
                                                >
                                                    <FaPlus size={14} />
                                                </Link>
                                                
                                                {/* Nút Sửa Thông Tin */}
                                                <button 
                                                    className="p-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition"
                                                    title="Sửa thông tin truyện"
                                                >
                                                    <FaEdit size={14} />
                                                </button>
                                                
                                                {/* Nút Xóa Truyện */}
                                                <button 
                                                    className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
                                                    title="Xóa truyện"
                                                >
                                                    <FaTrash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBooks;