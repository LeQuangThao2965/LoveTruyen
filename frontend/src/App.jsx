import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import HomePage from './pages/Home/HomePage';
import UserProfile from './pages/UserSettings/UserProfile'; 
// Không cần import LoginPage và RegisterPage nữa

function App() {
  return (
    <BrowserRouter>
      <Header />
      
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<UserProfile />} />
          
        </Routes>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}
//
export default App;