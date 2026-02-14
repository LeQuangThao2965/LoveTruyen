import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify'; // Nhớ cài react-toastify nếu chưa

const RegisterPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        // 1. Validate
        if (formData.password !== formData.confirmPassword) {
            return toast.error("Mật khẩu xác nhận không khớp!");
        }
        if (formData.password.length < 6) {
            return toast.error("Mật khẩu phải có ít nhất 6 ký tự");
        }

        setLoading(true);

        // 2. Gọi Supabase
        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            // Không truyền metadata -> SQL Trigger sẽ tự đặt là "Vô diện giả"
        });

        setLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Đăng ký thành công! Hãy kiểm tra email để xác nhận.");
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-indigo-600 mb-6">Đăng Ký Tài Khoản</h2>
                
                <form onSubmit={handleRegister} className="space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="email@example.com"
                            onChange={handleChange}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Mật khẩu</label>
                        <input
                            type="password"
                            name="password"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="********"
                            onChange={handleChange}
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="********"
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-indigo-300"
                    >
                        {loading ? 'Đang xử lý...' : 'Đăng Ký Ngay'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                        Đã có tài khoản?{' '}
                        <Link to="/login" className="text-indigo-600 hover:underline font-semibold">
                            Đăng nhập
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;