import { FaUser } from 'react-icons/fa';
import { Modal } from './ConfirmModal';

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

const getRoleLabel = (role) => {
    switch (role) {
        case 'admin': return 'Admin';
        case 'moderator': return 'Moderator';
        default: return 'User';
    }
};

const ChangeRoleModal = ({ isOpen, user, currentRole, onClose, onConfirm, onRoleChange, processing }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Đổi quyền user"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <UserAvatar src={user?.avatar_url} alt={user?.username} size="md" />
                    <div>
                        <div className="font-medium text-gray-900">{user?.username}</div>
                        <div className="text-sm text-gray-500">Role hiện tại: {getRoleLabel(user?.role)}</div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chọn quyền mới
                    </label>
                    <select
                        value={currentRole}
                        onChange={(e) => onRoleChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white transition-colors"
                    >
                        {/* 🚫 Chỉ cho phép chuyển đổi giữa User và Moderator */}
                        {/* Admin không thể tự phong hoặc phong ngưởi khác thành Admin */}
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                    </select>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        ℹ️ Lưu ý: Chỉ có thể chuyển đổi giữa User và Moderator. 
                        Không thể phong quyền Admin qua giao diện này.
                    </p>
                </div>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={processing || currentRole === user?.role}
                        className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Đang xử lý...' : 'Cập nhật'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ChangeRoleModal;
