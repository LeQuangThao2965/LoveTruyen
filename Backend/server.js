// Backend/server.js
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/configs/mongodb');
const { initSocket } = require('./src/configs/socket');
const { startCrawlerCron } = require('./src/crawler/scraper');

const storyRoutes = require('./src/routes/storyRoutes');
const chapterRoutes = require('./src/routes/chapterRoutes');
const bookRoutes = require('./src/routes/bookRoutes');
const crawlerRoutes = require('./src/routes/crawlerRoutes');
const userRoutes = require('./src/routes/userRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);

initSocket(server);
connectDB();

app.use(cors());
app.use(express.json({ limit: '12mb' }));

// Serve uploaded covers that are saved into frontend/public/uploaded_covers.
app.use(
    '/uploaded_covers',
    express.static(path.resolve(__dirname, '../frontend/public/uploaded_covers'))
);

app.use('/api/stories', storyRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/users', userRoutes);

// Bat cron crawl metadata (title + cover) theo lich 00:00 va 12:00.
startCrawlerCron();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server & Socket running on port ${PORT}`);
});
