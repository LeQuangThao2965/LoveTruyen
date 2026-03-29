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

// Các option Thời gian cấm chat (tính bằng phút)
const MUTE_DURATION_OPTIONS = [
    { value: 15, label: '15 phút' },
    { value: 60, label: '1 giờ' },
    { value: 360, label: '6 giờ' },
    { value: 1440, label: '1 ngày' },
    { value: 10080, label: '7 ngày' }
];

const MuteUserModal = ({ 
    isOpen, 
    user, 
    onClose, 
    onConfirm, 
    muteReason, 
    onMuteReasonChange,
    muteDuration,
    onMuteDurationChange,
    processing 
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cấm chat"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <UserAvatar src={user?.avatar_url} alt={user?.username} size="md" />
                    <div>
                        <div className="font-medium text-gray-900">{user?.username}</div>
                        <div className="text-sm text-gray-500">{user?.email}</div>
                    </div>
                </div>
                
                {/* Chọn Thời gian */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian cấm <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={muteDuration}
                        onChange={(e) => onMuteDurationChange(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    >
                        <option value="">-- Chọn Thời gian --</option>
                        {MUTE_DURATION_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                
                {/* Lý do */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lý do cấm chat <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={muteReason}
                        onChange={(e) => onMuteReasonChange(e.target.value)}
                        placeholder="Nhập lý do cấm chat..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
                    />
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
                        disabled={processing || !muteReason?.trim() || !muteDuration}
                        className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Đang xử lý...' : 'Cấm chat'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default MuteUserModal;
