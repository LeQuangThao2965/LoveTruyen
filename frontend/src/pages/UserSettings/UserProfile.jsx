import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import { FaSave, FaUserCircle, FaKey } from 'react-icons/fa'; // Đã bỏ FaCamera theo yêu cầu

const UserProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [userAuth, setUserAuth] = useState(null);

    // State chứa thông tin profile (Thêm role)
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        display_name: '',
        avatar_url: '',
        bio: '',
        role: 'user' // Mặc định là user
    });

    // State đổi mật khẩu
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

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setProfile({
                    username: data.username || '',
                    email: data.email?.includes('@lovetruyen.local') ? '' : data.email,
                    display_name: data.display_name || '',
                    avatar_url: data.avatar_url || '',
                    bio: data.bio || '',
                    role: data.role || 'user' // Bóc tách role từ DB
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

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    display_name: profile.display_name,
                    avatar_url: profile.avatar_url,
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

    // Logic tô màu Badge phân quyền
    const getRoleBadgeColor = (role) => {
        switch(role) {
            case 'admin': return 'bg-red-100 text-red-700 border-red-200';
            case 'host': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'moderator': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) return <div className="text-center p-10">Đang tải hồ sơ...</div>;

    return (
        <div className="container mx-auto p-4 max-w-5xl">
            <h1 className="text-3xl font-bold text-indigo-700 mb-6 border-b pb-4">Quản Lý Hồ Sơ</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* CỘT TRÁI */}
                <div className="col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border text-center sticky top-24">
                        <div className="relative inline-block mb-4 group">
                            <img 
                                src={profile.avatar_url || "https://via.placeholder.com/150"} 
                                alt="Avatar" 
                                className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 mx-auto shadow-md"
                            />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{profile.display_name || "Vô danh"}</h2>
                        <p className="text-indigo-600 font-medium text-sm mb-2">
                            {profile.username ? `@${profile.username}` : "Google Account"}
                        </p>
                        
                        {/* BADGE THỂ HIỆN CHỨC VỤ */}
                        <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getRoleBadgeColor(profile.role)}`}>
                            {profile.role}
                        </span>

                        <p className="text-gray-500 text-sm mt-3 italic">
                            "{profile.bio || "Người dùng này chưa viết gì về mình..."}"
                        </p>
                    </div>
                </div>

                {/* CỘT PHẢI */}
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
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Link Ảnh đại diện</label>
                                <input type="text" name="avatar_url" value={profile.avatar_url} onChange={handleProfileChange} placeholder="https://imgur.com/..." className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" />
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
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passData.currentPassword}
                                        onChange={handlePassChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    />
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
