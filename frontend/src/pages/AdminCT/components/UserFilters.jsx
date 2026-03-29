import { FaSearch, FaFilter } from 'react-icons/fa';

const ROLE_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'user', label: 'User' },
    { value: 'host', label: 'Host' },
    { value: 'admin', label: 'Admin' }
];

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'banned', label: 'Bị khóa' }
];

const UserFilters = ({ filters, onFilterChange }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm username, email..."
                            value={filters.search}
                            onChange={(e) => onFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Role Filter */}
                <div className="w-40">
                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filters.role}
                            onChange={(e) => onFilterChange('role', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white transition-colors"
                        >
                            {ROLE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Status Filter */}
                <div className="w-40">
                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={filters.status}
                            onChange={(e) => onFilterChange('status', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none bg-white transition-colors"
                        >
                            {STATUS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserFilters;
