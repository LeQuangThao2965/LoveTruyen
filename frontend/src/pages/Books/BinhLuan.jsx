import { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import api from '../services/axiosConfig';

const MAX_COMMENT_LENGTH = 600;
const COMMENTS_PER_PAGE = 20;

// Hàm format giờ cố định theo múi giờ Việt Nam
const formatCommentTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(date);
};

const MockComments = ({
    title = 'Bình luận',
    placeholder = 'Nhập bình luận...',
    bookId,
    chapterId
}) => {
    const [comments, setComments] = useState([]);
    const [message, setMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    
    const [loadingComments, setLoadingComments] = useState(true);
    const [sending, setSending] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // 1. Lấy thông tin user
    useEffect(() => {
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();
            setCurrentUser(data?.user || null);
            if (data?.user) {
                try {
                    const profileData = await api.get('/users/me/profile');
                    setUserProfile(profileData.profile);
                } catch (error) {
                    console.error('Lỗi lấy profile:', error);
                }
            }
        };
        loadUser();
    }, []);

    // 2. Fetch comments bằng API thay vì LocalStorage
    const fetchComments = useCallback(async (targetPage = 1) => {
        if (!bookId) return;
        setLoadingComments(true);
        try {
            // Chỉ gửi bookId để lấy toàn bộ bình luận của truyện
            const response = await api.get('/comments', {
                params: { bookId, page: targetPage, limit: COMMENTS_PER_PAGE }
            });
            setComments(response?.comments || []);
            setTotalPages(response?.totalPages || 1);
            setPage(response?.currentPage || 1);
        } catch (error) {
            console.error('Lỗi load comment:', error);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    }, [bookId]);

    // Gọi lần đầu
    useEffect(() => {
        fetchComments(1);
    }, [fetchComments]);

    // 3. Logic check Cấm chat
    const isUserMuted = useMemo(() => {
        if (!userProfile?.isMuted) return false;
        if (userProfile.muteUntil && new Date() < new Date(userProfile.muteUntil)) {
            return true;
        }
        return false;
    }, [userProfile]);

    const muteEndTime = useMemo(() => {
        if (!userProfile?.muteUntil) return null;
        return new Date(userProfile.muteUntil).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    }, [userProfile]);

    // 4. Gửi bình luận
    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmed = message.trim();

        if (!trimmed) return;
        if (!currentUser) {
            return toast.warning('Vui lòng đăng nhập để bình luận!');
        }

        setSending(true);
        try {
            await api.post('/comments', {
                content: trimmed.slice(0, MAX_COMMENT_LENGTH),
                bookId,
                chapterId // Gửi chapterId đi để DB ghi nhận bình luận này nằm ở chương nào
            });
            
            toast.success('Đã gửi bình luận thành công!');
            setMessage('');
            fetchComments(1); // Gọi lại API để load bình luận mới nhất về
        } catch (error) {
            console.error('Lỗi gửi bình luận:', error);
            if (error.response?.status === 403 && error.response?.data?.code === 'USER_MUTED') {
                const muteTime = error.response.data.muteUntil 
                    ? new Date(error.response.data.muteUntil).toLocaleString('vi-VN')
                    : 'không xác định';
                toast.error(`Bạn đang bị cấm chat cho đến ${muteTime}`);
            } else {
                toast.error(error.response?.data?.message || 'Lỗi khi gửi bình luận!');
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">{title}</h3>

            {isUserMuted && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-medium text-orange-800">Bạn đang bị cấm chat!</p>
                            <p className="text-sm text-orange-700">Thời gian kết thúc: <strong>{muteEndTime}</strong></p>
                            {userProfile?.muteReason && <p className="text-sm text-orange-600 mt-1">Lý do: {userProfile.muteReason}</p>}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isUserMuted ? 'Bạn đang bị cấm chat...' : placeholder}
                    rows={3}
                    maxLength={MAX_COMMENT_LENGTH}
                    disabled={isUserMuted || sending}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition resize-none shadow-inner ${
                        isUserMuted 
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-gray-50'
                    }`}
                />

                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500 font-medium">
                        {isUserMuted 
                            ? '🔇 Không thể gửi bình luận' 
                            : `${message.length}/${MAX_COMMENT_LENGTH} ký tự`
                        }
                    </p>
                    <button
                        type="submit"
                        disabled={!message.trim() || isUserMuted || sending}
                        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 shadow-md"
                    >
                        {sending ? 'Đang gửi...' : isUserMuted ? '🔇 Đã khóa' : 'Gửi bình luận'}
                    </button>
                </div>
            </form>

            <div className="mt-8 space-y-4">
                {loadingComments ? (
                    <div className="text-center text-sm text-gray-500 py-6 animate-pulse">Đang tải bình luận...</div>
                ) : comments.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 px-3 py-6 text-center text-sm text-gray-500 border border-gray-100">
                        Chưa có bình luận nào. Hãy là người đầu tiên để lại đánh giá!
                    </p>
                ) : (
                    <>
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <article key={comment._id} className="flex gap-4">
                                    <img 
                                        src={comment.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author)}&background=random`} 
                                        alt="avatar" 
                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0 mt-1"
                                    />
                                    <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-4 border border-gray-100">
                                        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-indigo-900">{comment.author}</p>
                                                {/* Hiển thị Tag Chương nếu có chapterId */}
                                                {comment.chapterId && (
                                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                        Chương {comment.chapterId}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-gray-400">{formatCommentTime(comment.createdAt)}</p>
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                            {comment.content}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-gray-100">
                                <button 
                                    onClick={() => fetchComments(page - 1)} disabled={page <= 1}
                                    className="px-3 py-1.5 text-sm font-bold border rounded-md disabled:opacity-50 text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Trước
                                </button>
                                <span className="px-4 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-md">
                                    Trang {page} / {totalPages}
                                </span>
                                <button 
                                    onClick={() => fetchComments(page + 1)} disabled={page >= totalPages}
                                    className="px-3 py-1.5 text-sm font-bold border rounded-md disabled:opacity-50 text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Sau
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default MockComments;