import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/axiosConfig';

// Components
import UserFilters from './components/UserFilters';
import UserTable from './components/UserTable';
import { PaginationFooter } from './components/UserPagination';
import BanUserModal from './components/modals/BanUserModal';
import ChangeRoleModal from './components/modals/ChangeRoleModal';
import MuteUserModal from './components/modals/MuteUserModal';
import UserDetailsModal from './components/modals/UserDetailsModal';
import ConfirmModal from './components/modals/ConfirmModal';

//service
import userService from '../../services/adminUserService';
import adminUserService from '../../services/adminUserService';

// Constants
const PAGE_SIZE = 10;
const DEBOUNCE_DELAY = 300;

const UsersManage = () => {
    // States
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0
    });
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        status: ''
    });
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [modals, setModals] = useState({
        ban: false,
        role: false,
        details: false,
        mute: false,
        confirmUnban: false,
        confirmUnmute: false
    });

    // Form states
    const [banReason, setBanReason] = useState('');
    const [muteReason, setMuteReason] = useState('');
    const [muteDuration, setMuteDuration] = useState(''); // Thời gian cấm chat (phút)
    const [newRole, setNewRole] = useState('');

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Fetch users
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit
            });

            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filters.role) params.append('role', filters.role);
            if (filters.status) params.append('status', filters.status);

            const data = await adminUserService.getUsers(params);

            setUsers(data.users || []);

            setPagination(prev => ({
                ...prev,
                total: data.pagination.total,
                totalPages: data.pagination.totalPages
            }));
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách user');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, debouncedSearch, filters.role, filters.status]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.search);
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(timer);
    }, [filters.search]);

    // Fetch users when filters change
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Reset page when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [debouncedSearch, filters.role, filters.status]);

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    // Open modals
    const openModal = (modalName, user = null) => {
        setSelectedUser(user);
        if (user) {
            setNewRole(user.role || 'user');
        }
        setModals(prev => ({ ...prev, [modalName]: true }));
    };

    // Close modals
    const closeModal = (modalName) => {
        setModals(prev => ({ ...prev, [modalName]: false }));
        if (modalName === 'ban') setBanReason('');
        if (modalName === 'mute') {
            setMuteReason('');
            setMuteDuration('');
        }
    };

    // Get user details
    const getUserDetails = async (userId) => {
        setDetailsLoading(true);
        try {
            const data = await adminUserService.getUserDetails(userId);
            setUserDetails(data);
        } catch (error) {
            console.error('Error fetching user details:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi tải chi tiết user');
        } finally {
            setDetailsLoading(false);
        }
    };

    // Handle view details
    const handleViewDetails = async (user) => {
        setSelectedUser(user);
        setModals(prev => ({ ...prev, details: true }));
        await getUserDetails(user.supabaseId);
    };

    // Toggle Ban/Unban user - Sử dụng API toggle-ban mới
    const handleToggleBan = async (user) => {
        const isBanned = user.status === 'banned';
        const action = isBanned ? 'mở khóa' : 'khóa';
        
        // Nếu là ban, cần nhập lý do
        if (!isBanned) {
            openModal('ban', user);
            return;
        }
        
        // Nếu là unban, confirm trước
        if (!window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản "${user.username}" không?`)) {
            return;
        }
        
        setProcessing(true);
        try {
            const response = await api.post(`/users/${user.supabaseId}/toggle-ban`, {
                reason: isBanned ? null : banReason
            });
            
            toast.success(response.action === 'banned' 
                ? `Đã khóa tài khoản ${user.username}` 
                : `Đã mở khóa tài khoản ${user.username}`
            );
            
            fetchUsers();
        } catch (error) {
            console.error('[handleToggleBan] Error:', error);
            toast.error(error.response?.data?.message || `Lỗi khi ${action} tài khoản`);
        } finally {
            setProcessing(false);
        }
    };

    // Toggle Ban với lý do (gọi từ BanUserModal)
    const handleToggleBanWithReason = async () => {
        if (!banReason.trim()) {
            toast.warning('Vui lòng nhập lý do khóa tài khoản');
            return;
        }

        setProcessing(true);
        try {
            const response = await adminUserService.toggleBanUser(
                selectedUser.supabaseId, banReason
            );
            
            toast.success(`Đã khóa tài khoản ${selectedUser.username}`);
            closeModal('ban');
            setBanReason('');
            fetchUsers();
        } catch (error) {
            console.error('[handleToggleBanWithReason] Error:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi khóa tài khoản');
        } finally {
            setProcessing(false);
        }
    };

    // Change role
    const handleChangeRole = async () => {
        if (!newRole || newRole === selectedUser?.role) {
            toast.warning('Vui lòng chọn role khác');
            return;
        }

        setProcessing(true);
        try {
            await adminUserService.changeUserRole(selectedUser.supabaseId, newRole);
            toast.success('Đã cập nhật quyền user thành công');
            closeModal('role');
            fetchUsers();
        } catch (error) {
            console.error('Error changing role:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật quyền');
        } finally {
            setProcessing(false);
        }
    };

    // Mute user với Thời hạn
    const handleMuteUser = async () => {
        if (!muteReason.trim()) {
            toast.warning('Vui lòng nhập lý do cấm chat');
            return;
        }
        
        if (!muteDuration) {
            toast.warning('Vui lòng chọn Thời gian cấm chat');
            return;
        }

        setProcessing(true);
        try {
            await adminUserService.muteUser(
                selectedUser.supabaseId, 
                muteReason, 
                muteDuration
            );
            toast.success(`Đã cấm chat ${selectedUser.username} trong ${muteDuration} phút`);
            closeModal('mute');
            fetchUsers();
        } catch (error) {
            console.error('Error muting user:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi cấm chat');
        } finally {
            setProcessing(false);
        }
    };

    // Unmute user
    const handleUnmuteUser = async () => {
        setProcessing(true);
        try {
            await adminUserService.unmuteUser(selectedUser.supabaseId);
            toast.success('Đã bỏ cấm chat thành công');
            closeModal('confirmUnmute');
            fetchUsers();
        } catch (error) {
            console.error('Error unmuting user:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi bỏ cấm chat');
        } finally {
            setProcessing(false);
        }
    };

    // Table action handlers
    const handleBan = (user) => openModal('ban', user);
    const handleUnban = (user) => openModal('confirmUnban', user);
    const handleChangeRoleClick = (user) => openModal('role', user);
    const handleMute = (user) => openModal('mute', user);
    const handleUnmute = (user) => openModal('confirmUnmute', user);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
                <p className="text-gray-600 mt-1">Quản lý và điều hòa các tài khoản người dùng</p>
            </div>

            {/* Filters */}
            <UserFilters
                filters={filters}
                onFilterChange={handleFilterChange}
            />

            {/* Table */}
            <UserTable
                users={users}
                loading={loading}
                onViewDetails={handleViewDetails}
                onBan={handleBan}
                onUnban={handleUnban}
                onToggleBan={handleToggleBan}
                onChangeRole={handleChangeRoleClick}
                onMute={handleMute}
                onUnmute={handleUnmute}
            />

            {/* Pagination */}
            {!loading && users.length > 0 && (
                <PaginationFooter
                    pagination={pagination}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Modals */}
            <BanUserModal
                isOpen={modals.ban}
                user={selectedUser}
                onClose={() => closeModal('ban')}
                onConfirm={handleToggleBanWithReason}
                banReason={banReason}
                onBanReasonChange={setBanReason}
                processing={processing}
            />

            <ChangeRoleModal
                isOpen={modals.role}
                user={selectedUser}
                currentRole={newRole}
                onClose={() => closeModal('role')}
                onConfirm={handleChangeRole}
                onRoleChange={setNewRole}
                processing={processing}
            />

            <MuteUserModal
                isOpen={modals.mute}
                user={selectedUser}
                onClose={() => closeModal('mute')}
                onConfirm={handleMuteUser}
                muteReason={muteReason}
                onMuteReasonChange={setMuteReason}
                muteDuration={muteDuration}
                onMuteDurationChange={setMuteDuration}
                processing={processing}
            />

            <UserDetailsModal
                isOpen={modals.details}
                user={selectedUser}
                userDetails={userDetails}
                detailsLoading={detailsLoading}
                onClose={() => closeModal('details')}
            />

            <ConfirmModal
                isOpen={modals.confirmUnban}
                onClose={() => closeModal('confirmUnban')}
                onConfirm={() => selectedUser && handleToggleBan(selectedUser)}
                title="Mở khóa tài khoản"
                message={`Bạn có chắc chắn muốn mở khóa tài khoản của "${selectedUser?.username}" không?`}
                confirmText="Mở khóa"
                confirmVariant="success"
                loading={processing}
            />

            <ConfirmModal
                isOpen={modals.confirmUnmute}
                onClose={() => closeModal('confirmUnmute')}
                onConfirm={handleUnmuteUser}
                title="Bỏ cấm chat"
                message={`Bạn có chắc chắn muốn bỏ cấm chat của "${selectedUser?.username}" không?`}
                confirmText="Bỏ cấm"
                confirmVariant="success"
                loading={processing}
            />
        </div>
    );
};

export default UsersManage;
