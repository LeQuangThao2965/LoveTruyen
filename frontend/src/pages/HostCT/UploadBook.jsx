import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaBook, FaUserEdit, FaImage, FaAlignLeft, FaUpload } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import api from '../../services/axiosConfig';

const MAX_IMAGE_SIZE_MB = 5;

const defaultForm = {
    title: '',
    author: '',
    description: ''
};

const UploadBook = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [userId, setUserId] = useState(null);
    const [formData, setFormData] = useState(defaultForm);
    const [coverFile, setCoverFile] = useState(null);

    // Preview ảnh từ file local để user kiểm tra trước khi đăng.
    const previewUrl = useMemo(() => {
        if (!coverFile) return '';
        return URL.createObjectURL(coverFile);
    }, [coverFile]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };

        fetchUser();
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectCover = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type?.startsWith('image/')) {
            toast.error('Vui lòng chọn đúng file ảnh.');
            e.target.value = '';
            return;
        }

        const maxSize = MAX_IMAGE_SIZE_MB * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`Ảnh bìa vượt quá ${MAX_IMAGE_SIZE_MB}MB.`);
            e.target.value = '';
            return;
        }

        setCoverFile(file);
    };

    const resetForm = () => {
        setFormData(defaultForm);
        setCoverFile(null);
    };

    const handleClose = () => {
        if (loading || uploadingCover) return;
        resetForm();
        onClose?.();
    };

    const uploadCoverToStorage = async () => {
        if (!coverFile || !userId) {
            throw new Error('Thiếu ảnh bìa hoặc thông tin tài khoản.');
        }

        setUploadingCover(true);
        try {
            const extension = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
            const baseName = coverFile.name.replace(/\.[^/.]+$/, '');
            const safeFileName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${userId}/${Date.now()}-${safeFileName}.${extension}`;

            const bucketCandidates = ['covers', 'images'];
            let lastError = null;

            // Thử upload lần lượt vào bucket covers -> images.
            for (const bucket of bucketCandidates) {
                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, coverFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    lastError = uploadError;
                    continue;
                }

                const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
                const publicUrl = data?.publicUrl;

                if (publicUrl) {
                    return publicUrl;
                }

                lastError = new Error('Không lấy được public URL ảnh bìa.');
            }

            throw lastError || new Error('Upload ảnh bìa thất bại.');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!userId) {
            toast.error('Không tìm thấy thông tin tài khoản.');
            return;
        }

        if (!coverFile) {
            toast.error('Vui lòng chọn ảnh bìa trước khi đăng truyện.');
            return;
        }

        setLoading(true);
        try {
            // 1) Upload ảnh bìa lên Supabase Storage.
            const coverUrl = await uploadCoverToStorage();

            // 2) Gửi thông tin truyện + cover_url lên backend MongoDB.
            const payload = {
                ...formData,
                cover_url: coverUrl,
                uploader_id: userId
            };

            await api.post('/books', payload);
            toast.success('Đăng truyện thành công!');

            resetForm();
            onSuccess?.();
            onClose?.();
        } catch (error) {
            const message =
                error?.response?.data?.error
                || error?.message
                || 'Đăng truyện thất bại, vui lòng thử lại.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const isBusy = loading || uploadingCover;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={handleClose}>
            <div
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-8 shadow-lg animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-8 flex items-start justify-between border-b pb-4">
                    <div>
                        <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-extrabold text-transparent">
                            Đăng Truyện Mới
                        </h2>
                        <p className="mt-2 text-gray-500">Điền thông tin cơ bản và chọn ảnh bìa để tạo truyện.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
                        disabled={isBusy}
                    >
                        Đóng
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                <FaBook className="text-indigo-500" /> Tên truyện
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                placeholder="VD: Phàm Nhân Tu Tiên"
                                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                <FaUserEdit className="text-purple-500" /> Tác giả
                            </label>
                            <input
                                type="text"
                                name="author"
                                value={formData.author}
                                onChange={handleChange}
                                required
                                placeholder="VD: Vong Ngữ"
                                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                            <FaImage className="text-green-500" /> Ảnh bìa từ máy tính
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleSelectCover}
                            className="w-full cursor-pointer rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-700"
                            required
                        />

                        {coverFile && (
                            <p className="mt-2 text-xs text-gray-500">Đã chọn: {coverFile.name}</p>
                        )}

                        {previewUrl && (
                            <div className="mt-3 h-44 w-32 overflow-hidden rounded-lg border bg-gray-100">
                                <img src={previewUrl} alt="Preview cover" className="h-full w-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                            <FaAlignLeft className="text-orange-500" /> Giới thiệu nội dung (Mô tả)
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows="5"
                            placeholder="Tóm tắt nội dung bộ truyện..."
                            className="w-full resize-y rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="pt-4 text-right">
                        <button
                            type="submit"
                            disabled={isBusy}
                            className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                        >
                            <FaUpload />
                            {uploadingCover
                                ? 'Đang upload ảnh bìa...'
                                : loading
                                    ? 'Đang xử lý...'
                                    : 'Tạo Truyện Ngay'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadBook;
