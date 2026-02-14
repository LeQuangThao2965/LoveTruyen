import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import { FaGoogle } from 'react-icons/fa'; // Nhớ cài react-icons

const LoginPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });

        setLoading(false);

        if (error) {
            toast.error("Email hoặc mật khẩu không đúng!");
        } else {
            toast.success("Đăng nhập thành công!");
            // Lưu token vào localStorage để dùng sau này gọi API Backend
            localStorage.setItem('access_token', data.session.access_token);
            navigate('/');
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/` // Quay về trang chủ sau khi login xong
            }
        });
        if (error) toast.error(error.message);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-indigo-600 mb-6">Chào mừng trở lại!</h2>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Mật khẩu</label>
                        <input
                            type="password"
                            name="password"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={handleChange}
                        />
                    </div>

                    <div className="text-right">
                        <a href="#" className="text-sm text-indigo-500 hover:underline">Quên mật khẩu?</a>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-300"
                    >
                        {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
                    </button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleGoogleLogin}
                        className="mt-4 w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg p-2 hover:bg-gray-50 transition"
                    >
                        <FaGoogle className="text-red-500" />
                        <span className="text-gray-700 font-medium">Google</span>
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                        Chưa có tài khoản?{' '}
                        <Link to="/register" className="text-indigo-600 hover:underline font-semibold">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;