import api from './axiosConfig';

const adminUserService = {
    // Lấy danh sách user (có phân trang, tìm kiếm)
    getUsers: async (params) => {
        return await api.get(`/users?${params.toString()}`);
    },

    // Lấy chi tiết 1 user
    getUserDetails: async (userId) => {
        return await api.get(`/users/${userId}/details`);
    },

    // Khóa / Mở khóa tài khoản (Dùng hàm toggle mới của bạn)
    toggleBanUser: async (userId, reason) => {
        return await api.post(`/users/${userId}/toggle-ban`, { reason });
    },

    // Đổi quyền (Role)
    changeUserRole: async (userId, role) => {
        return await api.patch(`/users/${userId}/role`, { role });
    },

    // Cấm chat (Mute)
    muteUser: async (userId, reason, duration) => {
        return await api.post(`/users/${userId}/mute`, { reason, duration });
    },

    // Bỏ cấm chat (Unmute)
    unmuteUser: async (userId) => {
        return await api.post(`/users/${userId}/unmute`);
    }
};

export default adminUserService;