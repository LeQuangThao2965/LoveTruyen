import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Gọi trực tiếp client
import { FaSearch, FaUser, FaSignOutAlt } from 'react-icons/fa';

const Header = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        // 1. Kiểm tra xem có ai đang đăng nhập không
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
        };

        checkUser();

        // 2. Lắng nghe sự kiện Login/Logout (Realtime)
        // Nếu user đăng nhập/đăng xuất ở tab khác, tab này cũng tự cập nhật theo
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('access_token'); // Dọn dẹp token cũ nếu có
        setUser(null);
        navigate('/login');
    };

    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold text-indigo-600">LoveTruyen</Link>
                
                {/* ... (Phần Search giữ nguyên) ... */}

                <div className="flex items-center gap-4">
                    {user ? (
                        // Nếu ĐÃ đăng nhập
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium hidden md:block">
                                {user.user_metadata?.full_name || user.email}
                            </span>
                            <img 
                                src={user.user_metadata?.avatar_url || "https://via.placeholder.com/40"} 
                                alt="Avatar" 
                                className="w-8 h-8 rounded-full border"
                            />
                            <button 
                                onClick={handleLogout}
                                className="text-gray-500 hover:text-red-500" 
                                title="Đăng xuất"
                            >
                                <FaSignOutAlt />
                            </button>
                        </div>
                    ) : (
                        // Nếu CHƯA đăng nhập
                        <>
                            <Link to="/login" className="text-gray-600 hover:text-indigo-600 font-medium">
                                Đăng nhập
                            </Link>
                            <Link to="/register" className="bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition">
                                Đăng ký
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;