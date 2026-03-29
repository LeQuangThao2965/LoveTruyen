import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/axiosConfig';
import * as mammoth from 'mammoth'; // Dùng mammoth thay cho react-quill
import { FaArrowLeft, FaTrash, FaEdit, FaSave, FaExclamationTriangle, FaFileUpload } from 'react-icons/fa';

const BASE_GENRES = ['Fantasy', 'Hiện đại', 'Sci-fi', 'Romance', 'Cổ Trang', 'Kiếm Hiệp', 'Tu Tiên'];
const STATUS_OPTIONS = ['Đang cập nhật', 'Hoàn thành', 'Tạm hoãn'];

const EditBook = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();

    // 1. STATE QUẢN LÝ DỮ LIỆU
    const [loading, setLoading] = useState(true);
    const [savingBook, setSavingBook] = useState(false);
    
    // State Section 1: Thông tin sách
    const [bookData, setBookData] = useState({
        title: '', author: '', description: '', cover_url: '', status: 'Đang cập nhật', genres: []
    });

    // State Section 2: Quản lý chương
    const [chapters, setChapters] = useState([]);
    const [selectedChapters, setSelectedChapters] = useState([]); 
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // State Section 3: Sửa nội dung chương (Đã tối ưu cho File Upload)
    const [editingChapter, setEditingChapter] = useState(null); 
    const [savingChapter, setSavingChapter] = useState(false);
    const [extractingEdit, setExtractingEdit] = useState(false);

    // 2. FETCH DỮ LIỆU BAN ĐẦU
    useEffect(() => {
        const fetchBookAndChapters = async () => {
            setLoading(true);
            try {
                const bookRes = await api.get(`/books/${bookId}`);
                if (bookRes?.book) {
                    setBookData({
                        title: bookRes.book.title || '',
                        author: bookRes.book.author || '',
                        description: bookRes.book.description || '',
                        cover_url: bookRes.book.cover_url || '',
                        status: bookRes.book.status || 'Đang cập nhật',
                        genres: bookRes.book.genres || []
                    });
                }

                const chaptersRes = await api.get(`/chapters/story/${bookId}?limit=1000`);
                if (chaptersRes?.data) {
                    setChapters(chaptersRes.data);
                }
            } catch (error) {
                toast.error("Không thể tải dữ liệu truyện!");
                navigate('/host/my-books');
            } finally {
                setLoading(false);
            }
        };
        fetchBookAndChapters();
    }, [bookId, navigate]);

    // 3. LOGIC SECTION 1: CẬP NHẬT TRUYỆN
    const handleGenreToggle = (genre) => {
        setBookData(prev => ({
            ...prev,
            genres: prev.genres.includes(genre) 
                ? prev.genres.filter(g => g !== genre) 
                : [...prev.genres, genre]
        }));
    };

    const handleUpdateBook = async () => {
        if (!bookData.title.trim() || !bookData.author.trim()) {
            return toast.error("Tên truyện và Tác giả không được để trống!");
        }
        setSavingBook(true);
        try {
            await api.put(`/books/${bookId}`, bookData);
            toast.success("Cập nhật thông tin truyện thành công!");
        } catch (error) {
            toast.error("Lỗi khi cập nhật truyện!");
        } finally {
            setSavingBook(false);
        }
    };

    // 4. LOGIC SECTION 2: CHỌN & XÓA CHƯƠNG
    const handleSelectChapter = (chapterId) => {
        setSelectedChapters(prev => 
            prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]
        );
    };

    const handleSelectAllChapters = () => {
        if (selectedChapters.length === chapters.length) {
            setSelectedChapters([]); 
        } else {
            setSelectedChapters(chapters.map(ch => ch._id)); 
        }
    };

    const confirmDeleteChapters = async () => {
        setDeleting(true);
        try {
            await api.delete('/chapters', { data: { chapterIds: selectedChapters } });
            setChapters(prev => prev.filter(ch => !selectedChapters.includes(ch._id)));
            
            // Tính toàn vẹn: Đóng form sửa nếu chương đang sửa bị xóa
            if (editingChapter && selectedChapters.includes(editingChapter._id)) {
                setEditingChapter(null);
            }
            
            setSelectedChapters([]);
            setShowDeleteModal(false);
            toast.success(`Đã xóa thành công ${selectedChapters.length} chương!`);
        } catch (error) {
            toast.error("Lỗi khi xóa chương!");
        } finally {
            setDeleting(false);
        }
    };

    // 5. LOGIC SECTION 3: XỬ LÝ UPLOAD FILE ĐỂ SỬA CHƯƠNG
    const handleStartEditChapter = (chapter) => {
        setEditingChapter({
            _id: chapter._id,
            chapter_number: chapter.chapter_number,
            original_number: chapter.chapter_number, // Lưu lại số cũ để hiển thị tiêu đề
            title: chapter.title,
            content: chapter.content,
            fileName: null
        });
        setTimeout(() => {
            document.getElementById('edit-chapter-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleEditFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.docx')) {
            toast.error('Chỉ hỗ trợ file Word định dạng .docx!');
            return;
        }

        setExtractingEdit(true);

        try {
            // A. Bóc tách Tên file (Regex như phần AddChapter)
            const nameWithoutExt = file.name.replace(/\.docx$/i, '');
            const regex = /^(\d+(?:\.\d+)?)\s*-\s*(.*)$/;
            const match = nameWithoutExt.match(regex);

            let newNumber = editingChapter.chapter_number;
            let newTitle = editingChapter.title;

            if (match) {
                newNumber = match[1].trim();
                newTitle = match[2].trim();
            } else {
                toast.warning('Tên file không đúng chuẩn "Số - Tên". Hệ thống chỉ cập nhật nội dung, giữ nguyên số và tên chương cũ.');
            }

            // B. Bóc tách Nội dung bằng Mammoth
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const newContent = result.value;

            if (!newContent || newContent.trim() === '') {
                toast.error('Lỗi: File Word bị rỗng hoặc không đọc được.');
                setExtractingEdit(false);
                return;
            }

            // Cập nhật State với dữ liệu mới
            setEditingChapter(prev => ({
                ...prev,
                chapter_number: newNumber,
                title: newTitle,
                content: newContent,
                fileName: file.name
            }));
            
            toast.success('Bóc tách thành công! Sẵn sàng cập nhật.');
        } catch (error) {
            console.error(error);
            toast.error('Lỗi hệ thống khi đọc file Word.');
        } finally {
            setExtractingEdit(false);
            e.target.value = null; // Reset input file để có thể chọn lại cùng 1 file nếu cần
        }
    };

    const handleUpdateChapter = async () => {
        if (!editingChapter.content || editingChapter.content.trim() === '') {
            return toast.error("Nội dung chương đang trống, vui lòng tải file lên!");
        }
        setSavingChapter(true);
        try {
            await api.put(`/chapters/${editingChapter._id}`, {
                chapter_number: Number(editingChapter.chapter_number),
                title: editingChapter.title,
                content: editingChapter.content
            });

            setChapters(prev => prev.map(ch => 
                ch._id === editingChapter._id ? { ...ch, ...editingChapter } : ch
            ));
            
            toast.success(`Cập nhật Chương ${editingChapter.chapter_number} thành công!`);
            setEditingChapter(null); 
        } catch (error) {
            toast.error(error?.response?.data?.message || "Lỗi khi cập nhật chương!");
        } finally {
            setSavingChapter(false);
        }
    };

    if (loading) return <div className="min-h-screen flex justify-center items-center text-indigo-600 font-bold">Đang tải dữ liệu...</div>;

    return (
        <div className="container mx-auto p-4 max-w-6xl space-y-8 animate-fade-in-up pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-4">
                <button onClick={() => navigate('/host/my-books')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition">
                    <FaArrowLeft className="text-gray-600" />
                </button>
                <h1 className="text-3xl font-extrabold text-gray-800">Chỉnh Sửa Truyện</h1>
            </div>

            {/* SECTION 1: THÔNG TIN TRUYỆN */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-xl font-bold text-indigo-700">1. Thông tin cơ bản</h2>
                    <button 
                        onClick={handleUpdateBook} disabled={savingBook}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                    >
                        <FaSave /> {savingBook ? 'Đang lưu...' : 'Lưu Thông Tin'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tên Truyện</label>
                        <input type="text" value={bookData.title} onChange={e => setBookData({...bookData, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tác Giả</label>
                        <input type="text" value={bookData.author} onChange={e => setBookData({...bookData, author: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Link Ảnh Bìa (URL)</label>
                        <input type="text" value={bookData.cover_url} onChange={e => setBookData({...bookData, cover_url: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Trạng Thái</label>
                        <select value={bookData.status} onChange={e => setBookData({...bookData, status: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                            {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Thể Loại</label>
                        <div className="flex flex-wrap gap-2">
                            {BASE_GENRES.map(genre => (
                                <button 
                                    key={genre} onClick={() => handleGenreToggle(genre)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${bookData.genres.includes(genre) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {genre}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Giới Thiệu (Mô tả)</label>
                        <textarea rows="4" value={bookData.description} onChange={e => setBookData({...bookData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
                    </div>
                </div>
            </section>

            {/* SECTION 2: QUẢN LÝ CHƯƠNG */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-xl font-bold text-indigo-700">2. Quản lý danh sách chương</h2>
                    <button 
                        onClick={() => setShowDeleteModal(true)} 
                        disabled={selectedChapters.length === 0}
                        className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaTrash /> Xóa ({selectedChapters.length})
                    </button>
                </div>

                <div className="overflow-x-auto max-h-[400px] border border-gray-200 rounded-lg">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="bg-gray-100 text-gray-600 text-sm uppercase sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="px-4 py-3 text-center w-12">
                                    <input type="checkbox" checked={chapters.length > 0 && selectedChapters.length === chapters.length} onChange={handleSelectAllChapters} className="w-4 h-4 rounded text-indigo-600" />
                                </th>
                                <th className="px-4 py-3 font-bold w-24">Chương</th>
                                <th className="px-4 py-3 font-bold">Tên Chương</th>
                                <th className="px-4 py-3 font-bold text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {chapters.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-6 text-gray-500">Chưa có chương nào.</td></tr>
                            ) : (
                                chapters.map(chapter => (
                                    <tr key={chapter._id} className={`hover:bg-indigo-50 transition ${editingChapter?._id === chapter._id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                                        <td className="px-4 py-3 text-center">
                                            <input type="checkbox" checked={selectedChapters.includes(chapter._id)} onChange={() => handleSelectChapter(chapter._id)} className="w-4 h-4 rounded text-indigo-600" />
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-800">Ch. {chapter.chapter_number}</td>
                                        <td className="px-4 py-3 text-gray-700">{chapter.title || '--'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleStartEditChapter(chapter)} className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 ml-auto bg-blue-50 px-3 py-1.5 rounded-md transition">
                                                <FaEdit /> Sửa
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* SECTION 3: KHUNG SỬA BẰNG UPLOAD FILE (ẨN MẶC ĐỊNH) */}
            {editingChapter && (
                <section id="edit-chapter-section" className="bg-white p-6 rounded-2xl shadow-lg border-2 border-indigo-200 relative animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6 border-b pb-3">
                        <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                            <FaEdit /> 3. Cập nhật Chương {editingChapter.original_number}
                        </h2>
                        <div className="flex gap-3">
                            <button onClick={() => setEditingChapter(null)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg transition">Hủy bỏ</button>
                            <button 
                                onClick={handleUpdateChapter} disabled={savingChapter || extractingEdit || !editingChapter.fileName}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition shadow-md disabled:opacity-50"
                            >
                                <FaSave /> {savingChapter ? 'Đang lưu...' : 'Cập nhật chương'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4">
                            <strong>Lưu ý:</strong> Hãy tải file Word (.docx) mới lên để ghi đè nội dung. Nếu tên file đúng chuẩn <code className="bg-blue-100 px-1 rounded text-blue-900 font-bold">Số - Tên.docx</code>, hệ thống sẽ tự động cập nhật luôn cả số và tên chương mới cho bạn.
                        </div>

                        {/* KHU VỰC KÉO THẢ FILE */}
                        <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center bg-indigo-50/30 hover:bg-indigo-50/80 transition relative">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".docx"
                                onChange={handleEditFileChange}
                                disabled={extractingEdit || savingChapter}
                            />
                            <div className="flex flex-col items-center pointer-events-none">
                                <FaFileUpload className="text-4xl text-indigo-400 mb-3" />
                                <p className="font-bold text-indigo-700 text-lg">Click hoặc Kéo thả file Word cập nhật vào đây</p>
                            </div>
                        </div>

                        {/* HIỂN THỊ TRẠNG THÁI BÓC TÁCH */}
                        {extractingEdit && <div className="text-indigo-600 font-bold animate-pulse text-center mt-4">Đang bóc tách dữ liệu từ file...</div>}
                        
                        {/* BẢNG PREVIEW THÔNG TIN SẼ GHI ĐÈ */}
                        {editingChapter.fileName && !extractingEdit && (
                            <div className="bg-green-50 p-5 rounded-xl border border-green-200 mt-4 animate-fade-in">
                                <p className="text-sm text-green-700 font-bold mb-3 border-b border-green-200 pb-2">
                                    ✅ Đã đọc thành công file: <span className="text-green-900">{editingChapter.fileName}</span>
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-xs text-gray-500 uppercase font-bold">Sẽ đổi số chương thành</span>
                                        <span className="font-bold text-gray-800 text-lg">{editingChapter.chapter_number}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-500 uppercase font-bold">Sẽ đổi tên chương thành</span>
                                        <span className="font-bold text-gray-800 text-lg">{editingChapter.title || '--'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* MODAL XÁC NHẬN XÓA CHƯƠNG */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center">
                        <FaExclamationTriangle className="text-red-500 text-5xl mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Cảnh báo xóa dữ liệu</h3>
                        <p className="text-gray-600 mb-6">
                            Bạn có chắc chắn muốn xóa vĩnh viễn <span className="font-bold text-red-600">{selectedChapters.length}</span> chương đã chọn? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button onClick={confirmDeleteChapters} disabled={deleting} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition">
                                {deleting ? 'Đang xóa...' : 'Yes, Xóa ngay'}
                            </button>
                            <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition">
                                No, Hủy bỏ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditBook;