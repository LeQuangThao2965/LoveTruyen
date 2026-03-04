import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasRole, setHasRole] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // 1. Kiểm tra xem có ai đang đăng nhập không
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user) {
                    setIsAuthenticated(false);
                    setIsChecking(false);
                    return;
                }

                setIsAuthenticated(true);

                // 2. Nếu route này chỉ cần đăng nhập (không yêu cầu role cụ thể)
                if (!allowedRoles || allowedRoles.length === 0) {       
                    setHasRole(true);
                    setIsChecking(false);
                    return;
                }

                // 3. Nếu route có yêu cầu role (ví dụ: host, admin) -> Bắt đầu kiểm tra
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                    if (error) throw error;

                // Kiểm tra role của user có nằm trong danh sách cho phép không
                if (allowedRoles.includes(data.role)) {
                    setHasRole(true);
                } else {
                    setHasRole(false);
                    toast.error("Bạn không có quyền truy cập trang này!");
                }
            } catch (error) {
                console.error("Lỗi kiểm tra quyền bảo mật:", error);
                setHasRole(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkAuth();
    }, [allowedRoles]);

    // Trạng thái 1: Đang kiểm tra -> Hiển thị màn hình chờ (Spinner)
    if (isChecking) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    // Trạng thái 2: Chưa đăng nhập -> Đá văng về trang chủ
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Trạng thái 3: Đã đăng nhập nhưng sai Role -> Đá văng về trang chủ
    if (!hasRole) {
        return <Navigate to="/" replace />;
    }

    // Trạng thái 4: Đủ điều kiện -> Mở cửa cho vào trang
    return children;
};

export default ProtectedRoute;