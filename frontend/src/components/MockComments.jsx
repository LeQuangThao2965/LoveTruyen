import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

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
    placeholder = 'Nhap binh luan...'
}) => {
    const [comments, setComments] = useState([]);
    const [message, setMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            const { data } = await supabase.auth.getUser();
            setCurrentUser(data?.user || null);
        };

        loadUser();
    }, []);

    useEffect(() => {
        try {
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
            console.error('Loi load comment local:', error);
            setComments([]);
        }
    }, [storageKey]);

    const sortedComments = useMemo(
        () =>
            [...comments].sort(
                (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
            ),
        [comments]
    );

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmed = message.trim();

        if (!trimmed) return;

        const newComment = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            author: getDefaultAuthor(currentUser),
            content: trimmed.slice(0, MAX_COMMENT_LENGTH),
            createdAt: new Date().toISOString()
        };

        const nextComments = [newComment, ...comments];
        setComments(nextComments);
        setMessage('');

        try {
            localStorage.setItem(storageKey, JSON.stringify(nextComments));
        } catch (error) {
            console.error('Loi save comment local:', error);
        }
    };

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>

            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={placeholder}
                    rows={4}
                    maxLength={MAX_COMMENT_LENGTH}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                        Demo frontend tam thoi. Da luu tren trinh duyet hien tai.
                    </p>
                    <button
                        type="submit"
                        disabled={!message.trim()}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Gui binh luan
                    </button>
                </div>
            </form>

            <div className="mt-4 space-y-3">
                {sortedComments.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
                        Chua co binh luan nao.
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
