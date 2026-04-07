import axios from 'axios';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';

let isBannedAlertShown = false;

// 1. Tạo instance (bản sao) của axios với cấu hình mặc định
const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Địa chỉ Backend Node.js
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Cấu hình Interceptor (Tự động chèn Token vào mỗi Request)
// Trước khi gửi request đi, đoạn code này sẽ chạy:
api.interceptors.request.use(async (config) => {
    // Lấy session hiện tại từ Supabase
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
        // Nếu đã đăng nhập, kẹp token vào header: Authorization: Bearer <token>
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// 3. Cấu hình Response (Tự động xử lý lỗi gọn gàng)
api.interceptors.response.use((response) => {
    // Nếu server trả về data ngon lành, chỉ lấy phần .data thôi
    return response.data; 
}, 
async (error) => {
    const errorData = error.response?.data;
    const status = error.response?.status;
    
    // 🚫 Xử lý khi tài khoản bị ban
    if (status === 403 && errorData?.code === 'ACCOUNT_BANNED') {
        if (!isBannedAlertShown){
            isBannedAlertShown = true; //tránh lặp thông báo

            console.error('🚫 Tài khoản đã bị khóa:', errorData);
            const reason = errorData?.reason || 'Vi phạm quy định';
            const banTime = errorData?.banTime ? new Date(
                errorData.banTime).toLocaleString('vi-VN') : 'Vĩnh viễn';
            // Hiện thông báo Toast với định dạng rõ ràng
            const message = `Tài khoản bị khóa! \nLý do: ${reason} \nThời gian: ${banTime} \nVui lòng đăng nhập lại sau.`;
            
            toast.error(message, {
                autoClose: 10000,
                pauseOnHover: true,
                closeOnClick: false,
            });
            
            // 1. Xóa token trước (quan trọng để không thể quay lại)
            localStorage.removeItem('access_token');
            
            // 2. Đăng xuất khỏi Supabase
            await supabase.auth.signOut();
            
            // 3. Delay 10 giây rồi mới redirect để user đọc thông báo
            setTimeout(() => {
                window.location.href = '/';
            }, 10000);
        }
        return Promise.reject(error);
    }
    
    // 🚫 Xử lý khi token hết hạn hoặc không hợp lệ
    if (status === 401 && errorData?.code === 'TOKEN_INVALID') {
        console.error('🔒 Phiên đăng nhập hết hạn');
        await supabase.auth.signOut();
        window.location.href = '/?session_expired=true';
        return Promise.reject(error);
    }
    
    // Nếu lỗi khác, log ra console
    console.error("API Error:", errorData || error.message);
    return Promise.reject(error);
});

export default api;
