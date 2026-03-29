import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaExclamationTriangle, FaTimes, FaTrash } from 'react-icons/fa';
import api from '../../services/axiosConfig';

const DeleteBookModal = ({ isOpen, onClose, onSuccess, book }) => {
    // step 1: Hỏi lần 1 | step 2: Hỏi lần 2 (Cảnh báo gắt hơn)
    const [step, setStep] = useState(1);
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset lại step 1 mỗi khi mở modal mới
    useEffect(() => {
        if (isOpen) {
            setStep(1);
        }
    }, [isOpen]);

    if (!isOpen || !book) return null;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await api.delete(`/books/${book._id}`);
            if (response) {
                toast.success(`Đã xóa vĩnh viễn truyện "${book.title}"!`);
                onSuccess(); // Cập nhật lại danh sách truyện
                onClose();   // Đóng modal
            }
        } catch (error) {
            console.error(error);
            toast.error(error?.response?.data?.error || 'Lỗi khi xóa truyện!');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden text-center p-6">
                
                {/* Nút tắt */}
                <button
                    onClick={onClose}
                    disabled={isDeleting}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                >
                    <FaTimes size={20} />
                </button>

                {/* STEP 1: XÁC NHẬN LẦN 1 */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <FaExclamationTriangle className="text-amber-500 text-6xl mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa truyện</h3>
                        <p className="text-gray-600 mb-6">
                            Bạn chắc chắn muốn xóa truyện <br/>
                            <span className="font-bold text-indigo-700">"{book.title}"</span>?
                        </p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={onClose} 
                                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition"
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                onClick={() => setStep(2)} 
                                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition"
                            >
                                Tiếp tục
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: CẢNH BÁO TỐI HẬU */}
                {step === 2 && (
                    <div className="animate-fade-in-up">
                        <FaTrash className="text-red-600 text-6xl mx-auto mb-4 animate-pulse" />
                        <h3 className="text-xl font-bold text-red-600 mb-2">CẢNH BÁO DỮ LIỆU</h3>
                        <p className="text-gray-700 mb-6 text-sm leading-relaxed">
                            Sau khi xóa, bạn sẽ <strong className="text-red-600">không thể khôi phục</strong>. Chỉ có thể tạo mới từ đầu.<br/><br/>
                            Bạn thật sự muốn xóa truyện này & <strong className="text-red-600">toàn bộ {book.total_chapters || 0} chương</strong> của nó?
                        </p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={onClose} 
                                disabled={isDeleting}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition disabled:opacity-50"
                            >
                                Quay lại
                            </button>
                            <button 
                                onClick={handleDelete} 
                                disabled={isDeleting}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? 'Đang xóa...' : 'Vâng, Xóa Vĩnh Viễn!'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteBookModal;