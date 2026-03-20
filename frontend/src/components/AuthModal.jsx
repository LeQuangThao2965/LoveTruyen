import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import api from '../services/axiosConfig';

// Bộ Icon SVG (Không cần cài thư viện)
const Icons = {
    Google: () => (
        <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2 6.5 2 12s4.42 10 10 10c5.05 0 8.76-3.43 8.76-10 0-.67-.06-1.33-.11-1.9z" />
        </svg>
    ),
    Times: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    User: () => (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    Lock: () => (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    )
};

const AuthModal = ({ isOpen, onClose }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        username: '', 
        password: '',
        confirmPassword: ''
    });

    if (!isOpen) return null;

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setFormData({ username: '', password: '', confirmPassword: '' });
    };

    const handleClose = () => {
        onClose();
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // QUAN TRỌNG: Thống nhất dùng 1 đuôi email ảo duy nhất
    const generateFakeEmail = (username) => {
        return `${username.trim().toLowerCase()}@lovetruyen.local`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const cleanUsername = formData.username.trim().toLowerCase();
        const fakeEmail = generateFakeEmail(cleanUsername);

        try {
            if (isLoginView) {
                // --- ĐĂNG NHẬP ---
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: fakeEmail, 
                    password: formData.password,
                });
                
                if (error) throw error;

                // 🚀 Gọi API kiểm tra trạng thái tài khoản (ban/mute)
                try {
                    await api.get('/users/me/profile');
                } catch (apiError) {
                    // 🚫 Nếu API trả về 403 -> Tài khoản bị ban
                    if (apiError.response?.status === 403) {
                        const errorData = apiError.response.data;
                        
                        // Xử lý lỗi tài khoản bị ban
                        if (errorData?.code === 'ACCOUNT_BANNED') {
                            const reason = errorData?.reason || 'Vi phạm quy định';
                            const banTime = errorData?.banTime 
                                ? new Date(errorData.banTime).toLocaleString('vi-VN')
                                : 'Vĩnh viễn';
                            
                            // Hiện thông báo bằng toast với định dạng rõ ràng
                            const message = `Tài khoản bị khóa!\n\nLý do: ${reason}\nThời gian: ${banTime}\n\nVui lòng đăng nhập lại sau.`;
                            
                            toast.error(message, {
                                autoClose: 10000,
                                pauseOnHover: true,
                                closeOnClick: true,
                            });
                            
                            // 1. Xóa token trước
                            localStorage.removeItem('access_token');
                            
                            // 2. Đăng xuất khỏi Supabase
                            await supabase.auth.signOut();
                            
                            setLoading(false);
                            
                            // 3. Delay 10 giây rồi đóng modal
                            setTimeout(() => {
                                onClose();
                            }, 10000);
                            
                            return;
                        }
                    }
                    // Các lỗi khác từ API, vẫn cho phép đăng nhập
                }
                
                toast.success("Đăng nhập thành công!");
                localStorage.setItem('access_token', data.session.access_token);
                onClose(); 
            } else {
                // --- ĐĂNG KÝ ---
                if (cleanUsername.length < 3) throw new Error("Tên đăng nhập quá ngắn!");
                if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) throw new Error("Tên đăng nhập không được chứa ký tự đặc biệt!");
                if (formData.password !== formData.confirmPassword) throw new Error("Mật khẩu xác nhận không khớp!");
                if (formData.password.length < 6) throw new Error("Mật khẩu quá ngắn!");

                const { data, error } = await supabase.auth.signUp({
                    email: fakeEmail,
                    password: formData.password,
                    options: {
                        data: {
                            username: cleanUsername,
                            full_name: cleanUsername
                        }
                    }
                });

                if (error) throw error;

                // Kiểm tra session để biết đăng ký thành công hay cần confirm mail
                if (data.session) {
                    toast.success("Đăng ký thành công! Đang đăng nhập...");
                    localStorage.setItem('access_token', data.session.access_token);
                    onClose();
                } else {
                    // Nếu Supabase chưa tắt Confirm Email, nó sẽ rơi vào đây
                    toast.success("Đăng ký thành công! Bạn có thể đăng nhập ngay.");
                    setIsLoginView(true);
                }
            }
        } catch (error) {
            console.error("Auth Error:", error);
            // Xử lý thông báo lỗi thân thiện hơn
            if (error.message.includes("rate limit")) {
                toast.error("Bạn thao tác quá nhanh, vui lòng chờ 1 lát!");
            } else if (error.message.includes("Invalid login")) {
                toast.error("Sai tên đăng nhập hoặc mật khẩu!");
            } else if (error.message.includes("already registered")) {
                toast.error("Tên đăng nhập này đã có người dùng!");
            } else {
                toast.error(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) toast.error(error.message);
    };

    return (
        <div 
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-300" 
            onClick={handleClose}
        >
            <div 
                className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl relative transform transition-all scale-100 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full"
                >
                    <Icons.Times />
                </button>

                <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">
                    {isLoginView ? 'Đăng Nhập' : 'Đăng Ký'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2">Tên đăng nhập</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                <Icons.User />
                            </span>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                required
                                placeholder="Ví dụ: daohuu123"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-2">Mật khẩu</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                <Icons.Lock />
                            </span>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {!isLoginView && (
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <Icons.Lock />
                                </span>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition transform active:scale-95 disabled:opacity-50 shadow-lg"
                    >
                        {loading ? 'Đang xử lý...' : (isLoginView ? 'Đăng Nhập' : 'Đăng Ký')}
                    </button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Hoặc</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleGoogleLogin}
                        className="mt-4 w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg p-2 hover:bg-gray-50 transition text-gray-700 font-medium"
                    >
                        <Icons.Google /> <span>Đăng nhập bằng Google</span>
                    </button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-600">
                    {isLoginView ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <button 
                        onClick={toggleView}
                        className="text-indigo-600 font-bold hover:underline focus:outline-none"
                    >
                        {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;