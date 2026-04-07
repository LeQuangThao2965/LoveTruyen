import api from './axiosConfig';

const searchService = {
// Tách riêng hàm search suggestions 
getSuggestions: async (query) => {
        return await api.get('/books/suggestions', {
            params: { q: query.trim(), limit: 8 }
        });
    }
};

export default searchService;
