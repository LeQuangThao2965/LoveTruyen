import api from './axiosConfig';

export const storyService = {
    // 1. Lấy danh sách truyện mới (Trang chủ)
    getLatestStories: async (page = 1, limit = 10) => {
        // Gọi: GET http://localhost:5000/api/stories?page=1
        // Vì đã config axios rồi nên chỉ cần gõ ngắn gọn:
        return await api.get(`/stories?page=${page}&limit=${limit}`);
    },

    // 2. Lấy chi tiết 1 truyện
    getStoryDetail: async (id) => {
        return await api.get(`/stories/${id}`);
    },

    // 3. Đăng truyện mới (Cần Token - Axios tự lo rồi)
    createStory: async (storyData) => {
        return await api.post('/stories', storyData);
    },
    
    // 4. Lấy danh sách chương của 1 truyện
    getChapters: async (storyId) => {
        return await api.get(`/chapters/story/${storyId}`);
    },

    // ✅ THÊM HÀM MỚI: Lấy file Audio của chương truyện
    getChapterAudio: async (chapterId) => {
        return await api.get(`/tts/chapter/${chapterId}`);
    },

    // Lấy chi tiết sách/truyện theo ID hoặc Slug
    getBookById: async (bookId) => {
        return await api.get(`/books/${bookId}`);
    },

    // Lấy danh sách chương có phân trang
    getAllChapters: async (bookId, page, limit) => {
        return await api.get(`/chapters/story/${bookId}`, {
            params: { page, limit }
        });
    },

    // Lấy chi tiết 1 chương cụ thể
    getChapterDetailByNumber: async (bookId, chapterNumber) => {
        return await api.get(`/chapters/story/${bookId}/chapter/${chapterNumber}`);
    }
};