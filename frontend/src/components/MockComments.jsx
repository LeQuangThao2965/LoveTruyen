import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import api from '../services/axiosConfig';

const MAX_COMMENT_LENGTH = 600;

const formatCommentTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const getDefaultAuthor = (user) => {
    if (!user) return 'Khach';

    return (
        user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email?.split('@')?.[0]
        || 'Thanh vien'
    );
};

const MockComments = ({
    storageKey = 'mock_comments_default',
    title = 'Binh luan',
    placeholder = 'Nhap binh luan...',
    bookId,
    chapterId
}) => {
    const [comments, setComments] = useState([]);
    const [message, setMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Lấy thông tin user và profile
    useEffect(() => {
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();
            setCurrentUser(data?.user || null);
            
            // Lấy profile từ MongoDB để kiểm tra trạng thái mute
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

    // Load comments từ API (hoặc localStorage tạm thở nếu chưa có API)
    useEffect(() => {
        const loadComments = async () => {
            try {
                // TODO: Thay thế bằng API GET /api/comments?bookId=... khi có
                const raw = localStorage.getItem(storageKey);
                if (!raw) {
                    setComments([]);
                    return;
                }

                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) {
                    setComments([]);
                    return;
                }

                setComments(parsed);
            } catch (error) {
                console.error('Lỗi load comment:', error);
                setComments([]);
            }
        };

        loadComments();
    }, [storageKey]);

    // Kiểm tra user có đang bị mute không
    const isUserMuted = useMemo(() => {
        if (!userProfile) return false;
        if (!userProfile.isMuted) return false;
        
        // Kiểm tra thở gian mute
        if (userProfile.muteUntil) {
            const muteUntil = new Date(userProfile.muteUntil);
            const now = new Date();
            return now < muteUntil;
        }
        
        return false;
    }, [userProfile]);

    // Format thở gian hết mute
    const muteEndTime = useMemo(() => {
        if (!userProfile?.muteUntil) return null;
        return new Date(userProfile.muteUntil).toLocaleString('vi-VN');
    }, [userProfile]);

    const sortedComments = useMemo(
        () =>
            [...comments].sort(
                (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
            ),
        [comments]
    );

    // 🚀 Gửi comment qua API thay vì localStorage
    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmed = message.trim();

        if (!trimmed) return;
        if (!currentUser) {
            toast.warning('Vui lòng đăng nhập để bình luận!');
            return;
        }

        setLoading(true);
        
        try {
            // Gọi API POST /api/comments
            const response = await api.post('/comments', {
                content: trimmed.slice(0, MAX_COMMENT_LENGTH),
                bookId,
                chapterId
            });

            // Thêm comment mới vào danh sách
            const newComment = {
                id: response.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                author: getDefaultAuthor(currentUser),
                content: trimmed.slice(0, MAX_COMMENT_LENGTH),
                createdAt: new Date().toISOString()
            };

            const nextComments = [newComment, ...comments];
            setComments(nextComments);
            setMessage('');
            
            toast.success('Đã gửi bình luận thành công!');

        } catch (error) {
            console.error('Lỗi gửi bình luận:', error);
            
            // 🚫 Xử lý lỗi 403 - User bị mute
            if (error.response?.status === 403) {
                const errorData = error.response.data;
                
                if (errorData?.code === 'USER_MUTED') {
                    const muteTime = errorData.muteUntil 
                        ? new Date(errorData.muteUntil).toLocaleString('vi-VN')
                        : 'không xác định';
                    
                    toast.error(`Bạn đang bị cấm chat cho đến ${muteTime}`);
                } else {
                    toast.error(errorData?.message || 'Bạn không có quyền thực hiện hành động này!');
                }
            } else {
                toast.error(error.response?.data?.message || 'Lỗi khi gửi bình luận. Vui lòng thử lại!');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>

            {/* 🚫 Thông báo nếu user bị mute */}
            {isUserMuted && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-medium text-orange-800">Bạn đang bị cấm chat!</p>
                            <p className="text-sm text-orange-700">
                                Thở gian kết thúc: <strong>{muteEndTime}</strong>
                            </p>
                            {userProfile?.muteReason && (
                                <p className="text-sm text-orange-600 mt-1">
                                    Lý do: {userProfile.muteReason}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={isUserMuted ? 'Bạn đang bị cấm chat...' : placeholder}
                    rows={4}
                    maxLength={MAX_COMMENT_LENGTH}
                    disabled={isUserMuted || loading}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition resize-none ${
                        isUserMuted 
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                    }`}
                />

                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                        {isUserMuted 
                            ? '🔇 Không thể gửi bình luận do đang bị cấm chat' 
                            : `${message.length}/${MAX_COMMENT_LENGTH} ký tự`
                        }
                    </p>
                    <button
                        type="submit"
                        disabled={!message.trim() || isUserMuted || loading}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-400"
                    >
                        {loading ? 'Đang gửi...' : isUserMuted ? '🔇 Đã khóa' : 'Gửi bình luận'}
                    </button>
                </div>
            </form>

            <div className="mt-4 space-y-3">
                {sortedComments.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
                        Chưa có bình luận nào.
                    </p>
                ) : (
                    sortedComments.map((comment) => (
                        <article key={comment.id} className="rounded-xl border border-gray-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-gray-800">{comment.author}</p>
                                <p className="text-xs text-gray-500">{formatCommentTime(comment.createdAt)}</p>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                {comment.content}
                            </p>
                        </article>
                    ))
                )}
            </div>
        </section>
    );
};

export default MockComments;
