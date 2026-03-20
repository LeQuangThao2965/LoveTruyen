import { FaUser, FaUserEdit, FaBan, FaUnlock, FaCommentSlash, FaComment, FaEye } from 'react-icons/fa';

const ROLE_COLORS = {
    admin: 'bg-red-100 text-red-800 border-red-200',
    moderator: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    user: 'bg-blue-100 text-blue-800 border-blue-200'
};

const STATUS_COLORS = {
    active: 'bg-green-100 text-green-800 border-green-200',
    banned: 'bg-red-100 text-red-800 border-red-200'
};

// User Avatar Component
const UserAvatar = ({ src, alt, size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-16 h-16 text-lg'
    };

    if (!src) {
        return (
            <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium`}>
                <FaUser />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200`}
            onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
            }}
        />
    );
};

// Loading Spinner
const LoadingSpinner = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className="flex items-center justify-center">
            <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
        </div>
    );
};

// Empty State
const EmptyState = ({ message = 'Không có dữ liệu' }) => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <FaUser className="text-4xl mb-3 opacity-50" />
        <p>{message}</p>
    </div>
);

const UserTable = ({ users, loading, onViewDetails, onBan, onUnban, onToggleBan, onChangeRole, onMute, onUnmute }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ngày tạo
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hành động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12">
                                    <LoadingSpinner />
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5}>
                                    <EmptyState message="Không tìm thấy user nào" />
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.supabaseId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar src={user.avatar_url} alt={user.username} size="sm" />
                                            <div>
                                                <div className="font-medium text-gray-900">{user.username}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>
                                            {user.role === 'admin' ? 'Admin' : user.role === 'moderator' ? 'Moderator' : 'User'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[user.status] || STATUS_COLORS.active}`}>
                                                {user.status === 'banned' ? 'Bị khóa' : 'Hoạt động'}
                                            </span>
                                            {/* Hiển thị trạng thái cấm chat */}
                                            {user.isMuted && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                                    🔇 Cấm chat
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {/* Change Role */}
                                            <button
                                                onClick={() => onChangeRole(user)}
                                                className="p-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                                                title="Đổi role"
                                            >
                                                <FaUserEdit className="text-sm" />
                                            </button>

                                            {/* Toggle Ban/Unban */}
                                            {user.status === 'banned' ? (
                                                <button
                                                    onClick={() => onToggleBan ? onToggleBan(user) : onUnban(user)}
                                                    className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                                    title="Mở khóa"
                                                >
                                                    <FaUnlock className="text-sm" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onToggleBan ? onToggleBan(user) : onBan(user)}
                                                    className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                                    title="Khóa tài khoản"
                                                >
                                                    <FaBan className="text-sm" />
                                                </button>
                                            )}

                                            {/* Mute/Unmute */}
                                            {user.isMuted ? (
                                                <button
                                                    onClick={() => onUnmute(user)}
                                                    className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                                    title="Bỏ cấm chat"
                                                >
                                                    <FaComment className="text-sm" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onMute(user)}
                                                    className="p-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                                                    title="Cấm chat"
                                                >
                                                    <FaCommentSlash className="text-sm" />
                                                </button>
                                            )}

                                            {/* View Details */}
                                            <button
                                                onClick={() => onViewDetails(user)}
                                                className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <FaEye className="text-sm" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserTable;
