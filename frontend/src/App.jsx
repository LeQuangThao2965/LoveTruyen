import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import HomePage from './pages/Home/HomePage';
import UserProfile from './pages/UserSettings/UserProfile';
import ManageBooks from './pages/HostCT/MyBooks';
import CrawlBooks from './pages/AdminCT/CrawlBooks';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="pb-10">
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/host/my-books"
              element={
                <ProtectedRoute allowedRoles={['host', 'admin']}>
                  <ManageBooks />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/crawler"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CrawlBooks />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </BrowserRouter>
  );
}

export default App;
