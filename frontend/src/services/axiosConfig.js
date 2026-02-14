import axios from 'axios';
import { supabase } from '../supabaseClient';

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
}, (error) => {
    // Nếu lỗi, log ra console hoặc hiển thị thông báo
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
});

export default api;