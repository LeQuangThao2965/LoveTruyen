// backend/server.js
// Backend/server.js (Cập nhật mới nhất)
const express = require('express');
const http = require('http'); // <--- Mới
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/configs/mongodb');
const { initSocket } = require('./src/configs/socket'); // <--- Mới

dotenv.config();

// Import Routes
const storyRoutes = require('./src/routes/storyRoutes');
const chapterRoutes = require('./src/routes/chapterRoutes'); // <--- Mới

const app = express();
const server = http.createServer(app); // <--- Tạo HTTP Server bọc Express

// Init Socket.io
initSocket(server); // <--- Kích hoạt Socket

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/stories', storyRoutes);
app.use('/api/chapters', chapterRoutes); // <--- Mới

const PORT = process.env.PORT || 5000;

// Lưu ý: Dùng server.listen thay vì app.listen
server.listen(PORT, () => {
    console.log(`🚀 Server & Socket running on port ${PORT}`);
});



//app.use('/api/stories', routeTruyen);