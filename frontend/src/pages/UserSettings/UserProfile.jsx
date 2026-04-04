import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import { FaSave, FaUserCircle, FaKey, FaCamera } from 'react-icons/fa';
// ĐÃ THÊM DÒNG IMPORT API DƯỚI ĐÂY ĐỂ FIX LỖI:
import api from '../../services/axiosConfig';

const UserProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [userAuth, setUserAuth] = useState(null);

    const [profile, setProfile] = useState({
        username: '',
        email: '',
        display_name: '',
        avatar_url: '',
        bio: '',
        role: ''
    });

    const [passData, setPassData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                return;
            }
            setUserAuth(user);

            // 1. Lấy dữ liệu hiển thị từ Supabase (Avatar, Display Name, Bio)
            const { data: spData, error: spError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (spError) throw spError;

            // 2. Lấy phân quyền (Role) chuẩn xác từ MongoDB
            let actualRole = 'user';
            try {
                const response = await api.get('/users/me/profile');
                const mongoProfile = response?.profile || response?.data?.profile;
                if (mongoProfile && mongoProfile.role) {
                    actualRole = mongoProfile.role;
                }
            } catch (mongoError) {
                console.error('Không thể lấy role từ MongoDB:', mongoError);
            }

            // 3. Gộp dữ liệu và cập nhật State
            if (spData) {
                setProfile({
                    username: spData.username || '',
                    email: spData.email?.includes('@lovetruyen.local') ? '' : spData.email,
                    display_name: spData.display_name || '',
                    avatar_url: spData.avatar_url || '',
                    bio: spData.bio || '',
                    role: actualRole // Đã thay thế role ảo bằng role thật từ MongoDB
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi tải thông tin người dùng");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handlePassChange = (e) => {
        setPassData({ ...passData, [e.target.name]: e.target.value });
    };

    const handleAvatarUpload = async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                return toast.error("Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 2MB!");
            }

            setUploadingAvatar(true);

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64String = reader.result;

                try {
                    const response = await api.post('/users/upload-avatar', {
                        file_name: file.name,
                        file_base64: base64String
                    });

                    const newAvatarUrl = response?.avatar_url || response?.data?.avatar_url;
                    if (!newAvatarUrl) throw new Error("Không nhận được link ảnh từ server");

                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({
                            avatar_url: newAvatarUrl,
                            updated_at: new Date()
                        })
                        .eq('id', userAuth.id);

                    if (updateError) throw updateError;

                    setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
                    toast.success("Cập nhật ảnh đại diện thành công!");

                } catch (err) {
                    console.error("Lỗi cập nhật ảnh:", err);
                    toast.error(err.response?.data?.error || err.message || "Lỗi tải ảnh lên!");
                } finally {
                    setUploadingAvatar(false);
                    event.target.value = '';
                }
            };

            reader.onerror = () => {
                toast.error("Lỗi khi đọc file ảnh từ thiết bị!");
                setUploadingAvatar(false);
            };

        } catch (error) {
            console.error("Lỗi xử lý file:", error);
            toast.error("Đã xảy ra lỗi khi chọn ảnh!");
            setUploadingAvatar(false);
            event.target.value = '';
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    display_name: profile.display_name,
                    bio: profile.bio,
                    updated_at: new Date()
                })
                .eq('id', userAuth.id);

            if (error) throw error;
            toast.success("Cập nhật hồ sơ thành công!");
        } catch (error) {
            toast.error("Lỗi cập nhật: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!passData.currentPassword) return toast.error("Vui lòng nhập mật khẩu cũ");
        if (passData.newPassword.length < 6) return toast.error("Mật khẩu mới phải từ 6 ký tự trở lên");
        if (passData.newPassword !== passData.confirmNewPassword) return toast.error("Xác nhận mật khẩu không khớp");
        if (!userAuth?.email) return toast.error("Không thể xác thực mật khẩu cũ cho tài khoản này");

        setChangingPassword(true);
        try {
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: userAuth.email,
                password: passData.currentPassword
            });

            if (verifyError) {
                toast.error("Mật khẩu cũ không đúng");
                return;
            }

            const { error } = await supabase.auth.updateUser({ password: passData.newPassword });
            if (error) throw error;
            toast.success("Đổi mật khẩu thành công!");
            setPassData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        } catch (error) {
            toast.error("Lỗi đổi mật khẩu: " + error.message);
        } finally {
            setChangingPassword(false);
        }
    };

    const isGoogleUser =
        userAuth?.app_metadata?.provider === 'google'
        || userAuth?.app_metadata?.providers?.includes('google')
        || userAuth?.identities?.some((identity) => identity?.provider === 'google');

    const getRoleBadgeColor = (role) => {
        switch(role) {
            case 'admin': return 'bg-red-100 text-red-700 border-red-200';
            case 'host': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////Bên dưới là phần html/////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    if (loading) return <div className="text-center p-10">Đang tải hồ sơ...</div>;

    return (
        <div className="container mx-auto p-4 max-w-5xl">
            <h1 className="text-3xl font-bold text-indigo-700 mb-6 border-b pb-4">Quản Lý Hồ Sơ</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border text-center sticky top-24">
                        <div className="mb-5">
                            <div className="relative inline-block">
                                <img 
                                    src={profile.avatar_url || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZTVlN2ViIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjIwIiBmaWxsPSIjNmI3MjgwIi8+CjxwYXRoIGQ9Ik00NSAxMjVIMTA1VjEzMUMxMDUgMTQwLjggOTcuOCAxNDggODggMTQ4SDYyQzUyLjIgMTQ4IDQ1IDE0MC44IDQ1IDEzMVYxMjVaIiBmaWxsPSIjNmI3MjgwIi8+Cjx0ZXh0IHg9Ijc1IiB5PSIxMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QXZhdGFyPC90ZXh0Pgo8L3N2Zz4="} 
                                    alt="Avatar" 
                                    className={`w-32 h-32 rounded-full object-cover border-4 border-indigo-100 mx-auto shadow-md transition-opacity ${uploadingAvatar ? 'opacity-40' : ''}`}
                                />
                                {uploadingAvatar && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg transition border border-indigo-200 shadow-sm w-full">
                                    <FaCamera size={16} />
                                    <span>Đổi ảnh đại diện</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                        disabled={uploadingAvatar}
                                    />
                                </label>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-gray-800">{profile.display_name || "Vô danh"}</h2>
                        <p className="text-indigo-600 font-medium text-sm mb-2">
                            {profile.username ? `@${profile.username}` : "Google Account"}
                        </p>
                        
                        <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getRoleBadgeColor(profile.role)}`}>
                            {profile.role}
                        </span>

                        <p className="text-gray-500 text-sm mt-3 italic">
                            "{profile.bio || "Người dùng này chưa viết gì về mình..."}"
                        </p>
                    </div>
                </div>

                <div className="col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border">
                        <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                            <FaUserCircle className="text-indigo-500" /> Thông tin chung
                        </h3>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên đăng nhập</label>
                                    <input type="text" value={profile.username} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed font-mono text-sm" placeholder="Không có username" />
                                    <p className="text-[10px] text-gray-400 mt-1">Tên đăng nhập không thể thay đổi</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email liên kết</label>
                                    <input type="text" value={profile.email || "Đăng nhập bằng Username"} disabled className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed text-sm" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên hiển thị (Display Name)</label>
                                <input type="text" name="display_name" value={profile.display_name} onChange={handleProfileChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Giới thiệu (Bio)</label>
                                <textarea name="bio" value={profile.bio} onChange={handleProfileChange} rows="3" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"></textarea>
                            </div>
                            <div className="text-right pt-2">
                                <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 ml-auto shadow-md active:scale-95">
                                    <FaSave /> {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {!isGoogleUser && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                                <FaKey className="text-orange-500" /> Đổi Mật Khẩu
                            </h3>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nhập mật khẩu cũ</label>
                                    <input type="password" name="currentPassword" value={passData.currentPassword} onChange={handlePassChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
                                        <input type="password" name="newPassword" value={passData.newPassword} onChange={handlePassChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                                        <input type="password" name="confirmNewPassword" value={passData.confirmNewPassword} onChange={handlePassChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                                    </div>
                                </div>
                                <div className="text-right pt-2">
                                    <button type="submit" disabled={changingPassword} className="bg-gray-800 text-white px-6 py-2.5 rounded-lg hover:bg-gray-900 transition shadow-md active:scale-95 disabled:opacity-60">
                                        {changingPassword ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;