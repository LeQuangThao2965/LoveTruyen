import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    FaBookOpen,
    FaEye,
    FaFire,
    FaLayerGroup,
    FaTrophy,
    FaChartBar,
    FaArrowLeft
} from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import api from '../../services/axiosConfig';

const PLACEHOLDER_COVER = 'https://placehold.co/48x64/e5e7eb/6b7280?text=?';

const formatNumber = (num = 0) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString('vi-VN');
};

const STATUS_CONFIG = {
    'Đang cập nhật': { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
    'Hoàn thành': { color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    'Tạm hoãn': { color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
};

const StatCard = ({ icon: Icon, label, value, sub, gradient, iconBg }) => (
    <div className={`relative overflow-hidden rounded-2xl p-6 shadow-md border border-white/20 ${gradient}`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-semibold text-white/80 uppercase tracking-wider">{label}</p>
                <p className="mt-2 text-4xl font-extrabold text-white">{value}</p>
                {sub && <p className="mt-1 text-xs text-white/70">{sub}</p>}
            </div>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} shadow-lg`}>
                <Icon className="text-white text-2xl" />
            </div>
        </div>
        {/* decorative circle */}
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
    </div>
);

const HostStats = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [userId, setUserId] = useState(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        // Lay role lan dau
        const initUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            const role = profile?.role || 'user';
            setUserRole(role);
            // Admin mac dinh xem tat ca
            if (role === 'admin') setShowAll(true);
        };
        initUser();
    }, []);

    useEffect(() => {
        if (!userId) return; // Doi co userId moi fetch
        const fetchStats = async () => {
            setLoading(true);
            try {
                const params = showAll ? { all: true } : { uploader_id: userId };
                const data = await api.get('/books/host-stats', { params });
                setStats(data);
            } catch (error) {
                console.error('Lỗi tải thống kê:', error);
                toast.error('Không thể tải thống kê. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [userId, showAll]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                    <p className="font-medium">Đang tải thống kê...</p>
                </div>
            </div>
        );
    }

    const totalStatusCount = stats ? Object.values(stats.booksByStatus).reduce((a, b) => a + b, 0) : 0;

    return (
        <div className="container mx-auto max-w-6xl px-4 py-8 animate-fade-in-up">
            {/* Header */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow">
                            <FaChartBar className="text-white text-lg" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-800">
                            Thống Kê Tổng Quan
                        </h1>
                    </div>
                    <p className="ml-[52px] text-gray-500 text-sm">
                        Tổng hợp hoạt động truyện của bạn trên hệ thống
                    </p>
                </div>
                <Link
                    to="/host/my-books"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600"
                >
                    <FaArrowLeft size={13} />
                    Quản lý truyện
                </Link>
            </div>

            {/* Stat Cards */}
            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={FaBookOpen}
                    label="Tổng Truyện"
                    value={formatNumber(stats?.totalBooks ?? 0)}
                    sub="Tất cả truyện đã đăng"
                    gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
                    iconBg="bg-indigo-400/40"
                />
                <StatCard
                    icon={FaEye}
                    label="Tổng Lượt Xem"
                    value={formatNumber(stats?.totalViews ?? 0)}
                    sub="Tích lũy toàn thời gian"
                    gradient="bg-gradient-to-br from-violet-500 to-violet-700"
                    iconBg="bg-violet-400/40"
                />
                <StatCard
                    icon={FaFire}
                    label="Lượt Xem Tuần Này"
                    value={formatNumber(stats?.weeklyViews ?? 0)}
                    sub="Tính từ thứ Hai đến nay"
                    gradient="bg-gradient-to-br from-rose-500 to-rose-700"
                    iconBg="bg-rose-400/40"
                />
                <StatCard
                    icon={FaLayerGroup}
                    label="Tổng Số Chương"
                    value={formatNumber(stats?.totalChapters ?? 0)}
                    sub="Trên tất cả các truyện"
                    gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
                    iconBg="bg-emerald-400/40"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Status Breakdown */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-800">
                        <FaBookOpen className="text-indigo-500" />
                        Phân Loại Trạng Thái
                    </h2>

                    {!stats || totalStatusCount === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-6">Chưa có dữ liệu</p>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(stats.booksByStatus).map(([status, count]) => {
                                const cfg = STATUS_CONFIG[status] ?? {
                                    color: 'bg-gray-100 text-gray-600 border-gray-200',
                                    dot: 'bg-gray-400'
                                };
                                const pct = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;
                                return (
                                    <div key={status}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                                                <span className="text-sm font-semibold text-gray-700">{status}</span>
                                            </div>
                                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.color}`}>
                                                {count} truyện
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${cfg.dot}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <p className="mt-1 text-right text-xs text-gray-400">{pct}%</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Top 5 Books */}
                <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-800">
                        <FaTrophy className="text-amber-500" />
                        Top 5 Truyện Nhiều Lượt Xem
                    </h2>

                    {!stats?.topBooks?.length ? (
                        <p className="text-center text-sm text-gray-400 py-6">Chưa có truyện nào</p>
                    ) : (
                        <div className="space-y-3">
                            {stats.topBooks.map((book, index) => (
                                <Link
                                    key={book._id}
                                    to={`/truyen/${book._id}`}
                                    className="flex items-center gap-4 rounded-xl border border-gray-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50 group"
                                >
                                    {/* Rank */}
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${index === 0 ? 'bg-amber-400 text-white' :
                                            index === 1 ? 'bg-gray-300 text-gray-700' :
                                                index === 2 ? 'bg-orange-300 text-white' :
                                                    'bg-gray-100 text-gray-500'
                                        }`}>
                                        {index + 1}
                                    </div>

                                    {/* Cover */}
                                    <img
                                        src={book.cover_url?.trim() || PLACEHOLDER_COVER}
                                        alt={book.title}
                                        className="h-12 w-9 shrink-0 rounded object-cover border border-gray-200"
                                        loading="lazy"
                                        onError={(e) => { e.currentTarget.src = PLACEHOLDER_COVER; }}
                                    />

                                    {/* Info */}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-bold text-gray-800 group-hover:text-indigo-600 transition text-sm">
                                            {book.title}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <FaEye className="text-violet-400" />
                                                {formatNumber(book.total_views ?? 0)} lượt xem
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FaLayerGroup className="text-indigo-400" />
                                                {book.total_chapters ?? 0} chương
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold hidden sm:inline ${(STATUS_CONFIG[book.status] ?? STATUS_CONFIG['Đang cập nhật']).color
                                        }`}>
                                        {book.status || 'Đang cập nhật'}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HostStats;
