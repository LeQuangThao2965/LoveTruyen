import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Điều chỉnh đường dẫn nếu cần
import { toast } from 'react-toastify';
import { FaBook, FaUserEdit, FaImage, FaAlignLeft, FaUpload } from 'react-icons/fa';

const UploadBook = () => {
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);

    // Lưu trữ dữ liệu Form
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        cover_url: '',
        description: ''
    });

    // Lấy ID của người dùng hiện tại để gán làm uploader_id
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        fetchUser();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!userId) {
            return toast.error("Lỗi: Không tìm thấy thông tin tài khoản!");
        }

        setLoading(true);

        try {
            // Chuẩn bị dữ liệu để gửi lên Backend MongoDB
            const payload = {
                ...formData,
                uploader_id: userId
            };

            // TODO: GỌI API BACKEND NODE.JS CỦA BẠN Ở ĐÂY
            // Ví dụ: await axios.post('http://localhost:5000/api/books', payload);
            
            console.log("Dữ liệu gửi lên server:", payload);
            
            // Giả lập thời gian chờ mạng
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast.success("Đăng truyện thành công!");
            
            // Reset form sau khi đăng thành công
            setFormData({ title: '', author: '', cover_url: '', description: '' });
            
        } catch (error) {
            toast.error("Lỗi khi đăng truyện: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-3xl animate-fade-in-up">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        Đăng Truyện Mới
                    </h1>
                    <p className="text-gray-500 mt-2">Điền các thông tin cơ bản để khởi tạo bộ truyện của bạn.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Hàng 1: Tên truyện & Tác giả */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <FaBook className="text-indigo-500" /> Tên truyện
                            </label>
                            <input 
                                type="text" 
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                placeholder="VD: Phàm Nhân Tu Tiên"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition outline-none"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <FaUserEdit className="text-purple-500" /> Tác giả
                            </label>
                            <input 
                                type="text" 
                                name="author"
                                value={formData.author}
                                onChange={handleChange}
                                required
                                placeholder="VD: Vong Ngữ"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition outline-none"
                            />
                        </div>
                    </div>

                    {/* Hàng 2: Link Ảnh bìa */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <FaImage className="text-green-500" /> Link ảnh bìa (Cover URL)
                        </label>
                        <input 
                            type="url" 
                            name="cover_url"
                            value={formData.cover_url}
                            onChange={handleChange}
                            placeholder="https://imgur.com/..."
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition outline-none"
                        />
                    </div>

                    {/* Hàng 3: Giới thiệu truyện */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <FaAlignLeft className="text-orange-500" /> Giới thiệu nội dung (Mô tả)
                        </label>
                        <textarea 
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows="5"
                            placeholder="Tóm tắt nội dung bộ truyện..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition outline-none resize-y"
                        ></textarea>
                    </div>

                    {/* Nút Submit */}
                    <div className="pt-4 text-right">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-8 rounded-xl hover:opacity-90 transition shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 ml-auto"
                        >
                            <FaUpload /> {loading ? 'Đang xử lý...' : 'Tạo Truyện Ngay'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadBook;