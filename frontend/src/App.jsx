import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import HomePage from './pages/Home/HomePage';
import UserProfile from './pages/UserSettings/UserProfile'; 
// Không cần import LoginPage và RegisterPage nữa
import ManageBooks from './pages/HostCT/MyBooks'; //host & admin
import UploadBook from './pages/HostCT/UploadBook'; //host & admin 
//import AdminPanel from './pages/AdminCT/MainSection'; //admin
//might as well add a secret page for moderator
//import my shield
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
      
        <main className="pb-10">
          <Routes>
            <Route path="/" element={<HomePage/>} />

            {/* TRANG CHỈ CẦN ĐĂNG NHẬP (Dành cho mọi Role) */}
            <Route 
                path="/profile" 
                element={
                    <ProtectedRoute>
                        <UserProfile />
                    </ProtectedRoute>
                } 
            />

            {/* TRANG DÀNH CHO HOST & ADMIN */}
            <Route 
                path="host/my-books" 
                element={
                    <ProtectedRoute allowedRoles={['host', 'admin']}>
                        <ManageBooks/>
                    </ProtectedRoute>
                } 
            />

            {/* TRANG DÀNH CHO HOST & ADMIN */}
            <Route 
                path="host/upload" 
                element={
                    <ProtectedRoute allowedRoles={['host', 'admin']}>
                        <UploadBook/>
                    </ProtectedRoute>
                } 
            />

            {/* TRANG TỐI CAO DÀNH RIÊNG CHO ADMIN */}
            {/* <Route 
                path="/admin/*" 
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminPanel />
                    </ProtectedRoute>
                } 
            /> */}
          </Routes>
        </main>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </BrowserRouter>
  );
}
//
export default App;