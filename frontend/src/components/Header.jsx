import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AuthModal from './AuthModal'; 

// Bộ Icon SVG tinh tế hơn
const Icons = {
    Search: () => (
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    User: () => (
        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    Settings: () => (
        <svg className="w-6 h-6 text-gray-700 hover:animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Profile: () => (
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Logout: () => (
        <svg className="w-4 h-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    )
};

const Header = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    // State cho Dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null); // Để xử lý click ra ngoài thì đóng menu

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        // Event listener để đóng dropdown khi click ra ngoài
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            subscription.unsubscribe();
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('access_token');
        setUser(null);
        setIsDropdownOpen(false);
        navigate('/'); 
    };

    const handleUserClick = () => {
        if (user) {
            // Nếu đã login -> Bật/Tắt dropdown
            setIsDropdownOpen(!isDropdownOpen);
        } else {
            // Nếu chưa login -> Mở popup đăng nhập
            setIsAuthModalOpen(true);
        }
    };

    const getAvatarUrl = (user) => {
        if (!user) return '';
        if (user.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
        const name = user.user_metadata?.full_name || user.email || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    };

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    {/* LOGO */}
                    <Link to="/" className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-80 transition">
                        LoveTruyen
                    </Link>
                    
                    {/* RIGHT GROUP: Search + User + Settings */}
                    <div className="flex items-center gap-3 md:gap-5">
                        
                        {/* 1. THANH TÌM KIẾM (Đã cắt ngắn và bo tròn mềm mại) */}
                        <div className="hidden md:flex items-center bg-gray-100/80 hover:bg-gray-100 rounded-full px-4 py-1.5 transition-all w-48 focus-within:w-64 focus-within:ring-2 focus-within:ring-indigo-100 border border-transparent focus-within:border-indigo-200">
                            <input 
                                type="text" 
                                placeholder="Tìm truyện..." 
                                className="bg-transparent outline-none flex-1 text-sm text-gray-700 placeholder-gray-400"
                            />
                            <div className="cursor-pointer p-1 hover:text-indigo-600 transition">
                                <Icons.Search />
                            </div>
                        </div>

                        {/* 2. NÚT USER (Dropdown Logic) */}
                        <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={handleUserClick}
                                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition focus:outline-none"
                                title={user ? "Tài khoản" : "Đăng nhập"}
                            >
                                {user ? (
                                    <img 
                                        src={getAvatarUrl(user)} 
                                        alt="Avatar" 
                                        className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=U&background=gray&color=fff"; }}
                                    />
                                ) : (
                                    <Icons.User />
                                )}
                            </button>

                            {/* DROPDOWN MENU (Chỉ hiện khi đã login & state mở) */}
                            {user && isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 animate-fade-in-up origin-top-right overflow-hidden">
                                    {/* Info rút gọn */}
                                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Xin chào</p>
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {user.user_metadata?.full_name || user.email}
                                        </p>
                                    </div>

                                    {/* Menu Items */}
                                    <Link 
                                        to="/profile" 
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                    >
                                        <Icons.Profile /> Hồ sơ cá nhân
                                    </Link>
                                    
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition text-left"
                                    >
                                        <Icons.Logout /> Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 3. NÚT SETTINGS (Bánh răng) */}
                        <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-600 transition group">
                            <Icons.Settings />
                        </button>

                    </div>
                </div>
            </header>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
            />
        </>
    );
};

export default Header;