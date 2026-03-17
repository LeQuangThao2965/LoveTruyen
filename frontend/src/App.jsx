import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import CrawlBooks from './pages/AdminCT/CrawlBooks';
import HomePage from './pages/Home/HomePage';
import ManageBooks from './pages/HostCT/MyBooks';
import BookDetail from './pages/Books/BookDetail';
import ReadChapter from './pages/Books/ReadChapter';
import UserProfile from './pages/UserSettings/UserProfile';
import SearchPage from './pages/Search/SearchPage';

const shouldHideMainHeader = (pathname = '') =>
  /^\/truyen\/[^/]+\/chuong\/\d+$/.test(pathname);

const AppLayout = () => {
  const location = useLocation();
  const hideHeader = shouldHideMainHeader(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideHeader && <Header />}

      <main className={hideHeader ? '' : 'pb-10'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/truyen/:bookId" element={<BookDetail />} />
          <Route path="/truyen/:bookId/chuong/:chapterNumber" element={<ReadChapter />} />
          <Route path="/search" element={<SearchPage />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['user', 'host', 'admin']}>
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
            path="/host/*"
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
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
