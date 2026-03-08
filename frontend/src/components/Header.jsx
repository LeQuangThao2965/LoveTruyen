import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AuthModal from './AuthModal'; 

// Bộ Icon SVG tinh tế hơn (Đã xóa Settings, thêm Icon Admin & Host)
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
    Profile: () => (
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Logout: () => (
        <svg className="w-4 h-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    ),
    // --- ICON THÊM MỚI ---
    Alert: () => (
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    Users: () => (
        <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    ),
    Report: () => (
        <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    Crawl: () => (
        <svg className="w-4 h-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h5v5H4V4zm11 0h5v5h-5V4zM4 15h5v5H4v-5zm7-4h2m0 0h2m-2 0V9m0 2v2m2 2h5v5h-5v-5z" />
        </svg>
    ),
    HostBadge: () => (
        <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    ),
    Upload: () => (
        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
    ),
    Dashboard: () => (
        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    BookList: () => (
        <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    )
};

const Header = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('user'); // State riêng biệt cho Role
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    // State cho Dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
    
    const dropdownRef = useRef(null); 
    const adminDropdownRef = useRef(null);

    // Xử lý Auth riêng
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target)) {
                setIsAdminDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            subscription.unsubscribe();
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Xử lý Lấy Role (Tách biệt hoàn toàn để tránh crash App)
    useEffect(() => {
        const fetchRole = async () => {
            if (user?.id) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    if (!error && data) {
                        setUserRole(data.role);
                    }
                } catch (err) {
                    console.error(err);
                }
            } else {
                setUserRole('user');
            }
        };
        fetchRole();
    }, [user?.id]); // Chỉ chạy khi ID user thay đổi

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('access_token');
        setUser(null);
        setUserRole('user');
        setIsDropdownOpen(false);
        setIsAdminDropdownOpen(false);
        navigate('/'); 
    };

    const handleUserClick = () => {
        if (user) {
            setIsDropdownOpen(!isDropdownOpen);
            setIsAdminDropdownOpen(false); // Ẩn menu admin nếu đang mở
        } else {
            setIsAuthModalOpen(true);
        }
    };

    const getAvatarUrl = (user) => {
        if (!user) return '';
        if (user.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
        const name = user.user_metadata?.full_name || user.email || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'host':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'moderator':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    {/* LOGO */}
                    <Link to="/" className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-80 transition">
                        LoveTruyen
                    </Link>
                    
                    {/* RIGHT GROUP */}
                    <div className="flex items-center gap-3 md:gap-5">
                        
                        {/* 1. THANH TÌM KIẾM */}
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

                        {/* 2. MENU QUẢN TRỊ VIÊN (Chỉ hiện nếu là admin) */}
                        {userRole === 'admin' && (
                            <div className="relative" ref={adminDropdownRef}>
                                <button 
                                    onClick={() => {
                                        setIsAdminDropdownOpen(!isAdminDropdownOpen);
                                        setIsDropdownOpen(false);
                                    }}
                                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-red-50 transition focus:outline-none"
                                >
                                    <Icons.Alert />
                                </button>

                                {isAdminDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 animate-fade-in-up origin-top-right overflow-hidden">
                                        <Link to="/admin/users" onClick={() => setIsAdminDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition">
                                            <Icons.Users /> Quản lý user
                                        </Link>
                                        <Link to="/admin/reports" onClick={() => setIsAdminDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition">
                                            <Icons.Report /> Xem báo cáo
                                        </Link>
                                        <Link to="/admin/crawler" onClick={() => setIsAdminDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition">
                                            <Icons.Crawl /> Crawl truyện
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. NÚT USER (Avatar Dropdown) */}
                        <div className="relative" ref={dropdownRef}>
                            <div className="flex items-center gap-2">
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

                                {user && (
                                    <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getRoleBadgeColor(userRole)}`}>
                                        {userRole}
                                    </span>
                                )}
                            </div>

                            {/* DROPDOWN MENU */}
                            {user && isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-1 animate-fade-in-up origin-top-right overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Xin chào</p>
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {user.user_metadata?.full_name || user.email}
                                        </p>
                                    </div>

                                    {/* Link mặc định ai cũng có */}
                                    <Link to="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition">
                                        <Icons.Profile /> Hồ sơ cá nhân
                                    </Link>

                                    {/* Render theo Role */}
                                    {userRole === 'user' && (
                                        <Link to="/register-host" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 transition">
                                            <Icons.HostBadge /> Đăng ký Host
                                        </Link>
                                    )}

                                    {(userRole === 'host' || userRole === 'admin') && (
                                        <>
                                            <Link to="host/dashboard" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition">
                                                <Icons.Dashboard /> Dashboard
                                            </Link>
                                            <Link to="host/my-books?openUpload=1" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition">
                                                <Icons.Upload /> Đăng truyện
                                            </Link>
                                            <Link to="host/my-books" onClick={() => setIsDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition">
                                                <Icons.BookList /> Quản lý truyện đã đăng
                                            </Link>
                                        </>
                                    )}
                                    
                                    <div className="border-t border-gray-100 mt-1"></div>
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition text-left"
                                    >
                                        <Icons.Logout /> Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </>
    );
};

export default Header;
