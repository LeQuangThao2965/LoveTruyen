import { Link } from 'react-router-dom';
import { FaSearch, FaUser } from 'react-icons/fa'; // Icon kính lúp và user

const Header = () => {
    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="text-2xl font-bold text-indigo-600">
                    LoveTruyen
                </Link>

                {/* Search Bar */}
                <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-1 w-1/3">
                    <input 
                        type="text" 
                        placeholder="Tìm truyện..." 
                        className="bg-transparent outline-none flex-1 text-sm"
                    />
                    <FaSearch className="text-gray-500 cursor-pointer" />
                </div>

                {/* Menu User */}
                <div className="flex items-center gap-4">
                    <Link to="/login" className="text-gray-600 hover:text-indigo-600 font-medium">
                        Đăng nhập
                    </Link>
                    <Link to="/register" className="bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition">
                        Đăng ký
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;