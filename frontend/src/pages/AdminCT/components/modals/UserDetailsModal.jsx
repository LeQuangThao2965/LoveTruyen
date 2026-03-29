import { FaUser } from 'react-icons/fa';
import { Modal } from './ConfirmModal';

const ROLE_COLORS = {
    admin: 'bg-red-100 text-red-800 border-red-200',
    host: 'bg-yellow-100 text-yellow-800 border-yellow-200',
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

const getRoleLabel = (role) => {
    switch (role) {
        case 'admin': return 'Admin';
        case 'host': return 'Host';
        default: return 'User';
    }
};

const getStatusLabel = (status) => {
    return status === 'banned' ? 'Bị khóa' : 'Hoạt động';
};

const UserDetailsModal = ({ isOpen, user, userDetails, detailsLoading, onClose }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Chi tiết user"
            size="lg"
        >
            {detailsLoading ? (
                <div className="py-12">
                    <LoadingSpinner />
                </div>
            ) : userDetails ? (
                <div className="space-y-6">
                    {/* User Info */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <UserAvatar src={user?.avatar_url} alt={user?.username} size="lg" />
                        <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">{userDetails.profile?.username}</h4>
                            <p className="text-gray-600">{userDetails.profile?.email}</p>
                            <div className="flex gap-2 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[userDetails.profile?.role] || ROLE_COLORS.user}`}>
                                    {getRoleLabel(userDetails.profile?.role)}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[userDetails.profile?.status] || STATUS_COLORS.active}`}>
                                    {getStatusLabel(userDetails.profile?.status)}
                                </span>
                                {userDetails.profile?.isMuted && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium border bg-orange-100 text-orange-800 border-orange-200">
                                        Đang bị cấm chat
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 
                    [COMMENTED] Stats - Ẩn tạm thởi, sẽ mở lại khi có chức năng Xu và Bình luận đầy đủ
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">{userDetails.stats?.coins || 0}</div>
                            <div className="text-sm text-gray-600">Số xu</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">{userDetails.stats?.booksRead || 0}</div>
                            <div className="text-sm text-gray-600">Truyện đã đọc</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">{userDetails.stats?.commentCount || 0}</div>
                            <div className="text-sm text-gray-600">Bình luận</div>
                        </div>
                    </div>
                    */}

                    {/* Additional Info */}
                    <div className="space-y-3 mt-4">
                        <h5 className="font-medium text-gray-900">Thông tin bổ sung</h5>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500">Ngày tạo:</span>
                                <span className="ml-2 font-medium text-gray-900">{formatDate(userDetails.profile?.createdAt)}</span>
                            </div>
                            {userDetails.profile?.bannedAt && (
                                <div className="p-3 bg-red-50 rounded-lg">
                                    <span className="text-red-600">Ngày khóa:</span>
                                    <span className="ml-2 font-medium text-red-900">{formatDate(userDetails.profile?.bannedAt)}</span>
                                </div>
                            )}
                            {userDetails.profile?.banReason && (
                                <div className="p-3 bg-red-50 rounded-lg col-span-2">
                                    <span className="text-red-600">Lý do khóa:</span>
                                    <span className="ml-2 font-medium text-red-900">{userDetails.profile?.banReason}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            ) : (
                <div className="py-8 text-center text-gray-500">
                    Không thể tải thông tin chi tiết
                </div>
            )}
        </Modal>
    );
};

export default UserDetailsModal;
