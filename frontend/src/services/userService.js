import api from './axiosConfig';
import { supabase } from '../supabaseClient';

const userService = {
    // Tách riêng hàm lấy profile
    getProfile: async () => {
        // Đã có interceptor lo phần token và bắt lỗi
        return await api.get('/users/me/profile');
    },
    
    getSupabaseProfile: async (userId) => {
        const { data: spProfile, error } = await supabase
                    .from('profiles')
                    .select('display_name, avatar_url, username')
                    .eq('id', userId)
                    .single();
        
        if (error) {
            console.error("Lỗi lấy thông tin Supabase:", error);
            return null; // Lỗi thì trả về null cho an toàn
        }
        return spProfile;
    }

};

export default userService;