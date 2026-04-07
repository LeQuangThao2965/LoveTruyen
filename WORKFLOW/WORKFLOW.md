# LoveTruyen - Project Workflow Documentation

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Technology Stack](#technology-stack)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Authentication Flow](#authentication-flow)
5. [Core Feature Workflows](#core-feature-workflows)
   - [Book Management](#book-management)
   - [Crawler System](#crawler-system)
   - [Reading Experience](#reading-experience)
6. [API Endpoints](#api-endpoints)
7. [Real-time Features](#real-time-features)
8. [Data Models](#data-models)
9. [Frontend Routes](#frontend-routes)
10. [Cron Jobs & Automation](#cron-jobs--automation)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ HomePage  │  │BookDetail│  │ReadChapter│  │ Admin/Host UI │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───────┬───────┘  │
│       │             │              │                │           │
│       └─────────────┴──────────────┴────────────────┘           │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   Axios + Token   │                        │
│                    │   Interceptor    │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTP/WebSocket
┌──────────────────────────────┼──────────────────────────────────┐
│                              │                                  │
│                    ┌─────────▼─────────┐                        │
│                    │  Backend (Express)│                        │
│                    │     Port: 5000    │                        │
│                    └─────────┬─────────┘                        │
│       ┌──────────────────────┼──────────────────────┐          │
│       │                      │                      │          │
│  ┌────▼─────┐  ┌─────────────▼─────┐  ┌────────────▼────┐     │
│  │  MongoDB │  │   Socket.io      │  │  Cron Jobs      │     │
│  │          │  │   (Real-time)    │  │  (Crawler)      │     │
│  └────┬─────┘  └───────────────────┘  └─────────────────┘     │
│       │                                                         │
└───────┼─────────────────────────────────────────────────────────┘
        │
   ┌────▼───────────────────────┐
   │     Supabase              │
   │  - Auth (JWT)             │
   │  - Profiles (Roles)       │
   │  - Storage (Images)       │
   └───────────────────────────┘
```

---

## Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Server | Node.js + Express | REST API Server |
| Database | MongoDB (Mongoose) | Data storage |
| Authentication | Supabase JWT | Token verification |
| Real-time | Socket.io | Live notifications |
| Web Scraping | Cheerio + Axios | Crawl external sources |
| Scheduler | node-cron | Automated tasks |
| Image Storage | Local filesystem | Book covers |

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 + Vite | UI Framework |
| Routing | React Router DOM | Navigation |
| Authentication | Supabase Auth | User login/register |
| HTTP Client | Axios | API calls |
| Styling | Tailwind CSS | UI styling |
| Notifications | React Toastify | User feedback |

---

## User Roles & Permissions

| Role | Description | Access Level |
|------|-------------|--------------|
| `user` | Regular reader | Home, Book Detail, Read Chapter, Profile |
| `host` | Content creator | All user features + Upload Books, Manage My Books |
| `admin` | System admin | All features + Crawler, User Management, Reports |

### Role Hierarchy
```
admin
  └── host
        └── user
```

---

## Authentication Flow

### Registration Flow
```
User Input
    │
    ▼
┌─────────────────────────┐
│  AuthModal (Register)   │
│  - username            │
│  - password            │
│  - confirmPassword     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│  Generate fake email:                   │
│  username@lovetruyen.local              │
└───────────┬─────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│  Supabase Auth.signUp()                 │
│  - email: fake email                    │
│  - password                             │
│  - metadata: { username }              │
└───────────┬─────────────────────────────┘
            │
    ┌───────┴───────┐
    │               │
 Success         Need Email
    │            Confirmation
    ▼               │
┌──────────┐        │
│ Auto     │        │
│ Login    │        │
└────┬─────┘        │
     │              │
     ▼              ▼
 Store Token  ───────────► Show "Check email"
 in localStorage
```

### Login Flow
```
User Input (username + password)
    │
    ▼
┌─────────────────────────────────┐
│  Convert username to fake email │
│  username@lovetruyen.local      │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Supabase Auth.signInWithPassword│
└───────────────┬─────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
 Success                 Error
    │                       │
    ▼                       ▼
Store Token           Show Error
in localStorage       Message
    │
    ▼
Redirect to Home
```

### Protected Route Flow
```
User navigates to protected route
    │
    ▼
┌─────────────────────────────────┐
│  ProtectedRoute Component       │
│  - Get current user from        │
│    Supabase                     │
└───────────────┬─────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
 User Logged In        Not Logged In
    │                       │
    ▼                       ▼
Check Role in         Redirect to /
Profiles Table        Home Page
    │
┌───┴─────────────────────────────┐
│                                │
Has Required Role           Wrong Role
    │                               │
    ▼                               ▼
Allow Access              Show Error + 
                          Redirect to /
```

---

## Core Feature Workflows

### Book Management

#### Upload Book (Host/Admin)
```
Host clicks "Đăng truyện" button
    │
    ▼
┌───────────────────────────────────┐
│  UploadBook Page                  │
│  - Input: title, author           │
│  - Input: description             │
│  - Upload: cover image            │
└───────────────┬───────────────────┘
                │
                ▼ (Submit)
┌───────────────────────────────────┐
│  API: POST /api/books/upload-cover│
│  - Send Base64 image             │
│  - Save to: frontend/public/      │
│    uploaded_covers/               │
└───────────────┬───────────────────┘
                │
                ▼ (Get cover_url)
┌───────────────────────────────────┐
│  API: POST /api/books             │
│  - title                          │
│  - author                         │
│  - description                   │
│  - cover_url                     │
│  - uploader_id (from token)      │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  MongoDB: Book Collection         │
│  - Create new book document       │
└───────────────────────────────────┘
```

#### Manual Chapter Upload
```
Host opens MyBooks → Select Book
    │
    ▼
┌───────────────────────────────────┐
│  Add Chapter Form                 │
│  - chapter_number                 │
│  - title                          │
│  - content (text area)            │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  API: POST /api/chapters          │
│  - book_id                        │
│  - chapter_number                 │
│  - title                          │
│  - content                        │
└───────────────┬───────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
 New Chapter           Chapter Exists
 (Upsert)                   │
    │                       │
    ▼                       ▼
Update Book         Update Existing
total_chapters      Chapter Content
```

---

### Crawler System

#### Crawl Books from truyenchucv.org

```
Admin accesses /admin/crawler
    │
    ▼
┌───────────────────────────────────┐
│  CrawlBooks Page                 │
│  - View crawled books list       │
│  - Trigger new crawl             │
└───────────────┬───────────────────┘
                │
        ┌───────┴────────┐
        │                │
  Manual Trigger     Auto (Cron)
        │                │
        ▼                ▼
┌───────────────────────────────┐
│  API: GET /api/crawler/run-latest│
│  - limit: number of books      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  scraper.crawlLatestBooksFrom    │
│  TruyenChucCV()                  │
│  - Fetch https://truyenchucv.org │
│  - Parse HTML with Cheerio       │
│  - Extract: title, cover, url    │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  MongoDB: Book Collection        │
│  - Create book with              │
│    crawler_source_url             │
│  - total_chapters: 0 (pending)    │
└───────────────────────────────────┘
```

#### Import Chapters for Book
```
Admin selects book → Click "Import Chapters"
    │
    ▼
┌───────────────────────────────────┐
│  API: POST /api/crawler/          │
│  import-story                     │
│  - url: story detail URL         │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  scraper.scrapeStory()            │
│  1. Fetch story page              │
│  2. Extract metadata              │
│  3. Get chapter list              │
│  4. Concurrent chapter fetching  │
│     (4-8 parallel requests)       │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  For each chapter:               │
│  - Fetch chapter HTML             │
│  - Extract content                │
│  - Save to MongoDB                │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  Update Book:                     │
│  - total_chapters: count          │
│  - status: "Hoàn thành"           │
└───────────────────────────────────┘
```

---

### Reading Experience

#### Browse Books (HomePage)
```
User visits /
    │
    ▼
┌───────────────────────────────────┐
│  HomePage loads                  │
│  - Fetch hot books (weekly)      │
│  - Fetch all books (paginated)    │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  API: GET /api/books/hot-weekly  │
│  API: GET /api/books              │
│  - Returns books with             │
│    latest_chapters (2 each)       │
└───────────────────────────────────┘
```

#### View Book Details
```
User clicks book card → /truyen/:bookId
    │
    ▼
┌───────────────────────────────────┐
│  BookDetail Page                 │
│  - Fetch book info               │
│  - Fetch chapter list            │
└───────────────┬───────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
 GET /api/books/:id    GET /api/chapters/
                            story/:bookId
    │                       │
    ▼                       ▼
Display Book Info    Display Chapter List
```

#### Read Chapter
```
User clicks chapter → /truyen/:bookId/chuong/:chapterNumber
    │
    ▼
┌───────────────────────────────────┐
│  ReadChapter Page                │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  API: GET /api/chapters/         │
│  story/:bookId/chapter/:number   │
└───────────────┬───────────────────┘
                │
                ▼ (Server)
┌───────────────────────────────────┐
│  Increment Book Views:           │
│  - total_views +1                │
│  - weekly_views +1 (if same week)│
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  Return chapter content          │
└───────────────────────────────────┘
```

---

## API Endpoints

### Books API (`/api/books`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all books (paginated) | Public |
| GET | `/hot-weekly` | Get hot books this week | Public |
| GET | `/:id` | Get book details | Public |
| POST | `/` | Create new book | Token |
| POST | `/upload-cover` | Upload cover image | Token |

### Chapters API (`/api/chapters`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/story/:storyId` | Get chapter list | Public |
| GET | `/story/:storyId/chapter/:number` | Read chapter | Public |
| POST | `/` | Add new chapter | Token |

### Stories API (`/api/stories`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all stories | Public |
| GET | `/:id` | Get story details | Public |
| POST | `/` | Create story | Token |

### Crawler API (`/api/crawler`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/POST | `/run-latest` | Crawl latest books | Admin |
| GET | `/books` | Get crawled books list | Admin |
| POST | `/import-story` | Import story + chapters | Admin |
| POST | `/import-chapters` | Import chapters only | Admin |

---

## Data Models

### User (MongoDB)
```javascript
{
  supabaseId: String,      // UUID from Supabase (Primary Key)
  email: String,           // Stored for quick lookup
  library: [{
    storyId: ObjectId,
    addedAt: Date,
    lastChapterRead: String
  }],
  history: [{
    storyId: ObjectId,
    readAt: Date,
    chapterConfig: String
  }]
}
```

### Book (MongoDB)
```javascript
{
  title: String,           // Required
  author: String,          // Required
  description: String,
  genres: [String],
  cover_url: String,
  crawler_source_url: String,  // For crawled books
  uploader_id: String,    // Supabase User ID
  status: String,         // "Đang cập nhật" | "Hoàn thành" | "Tạm hoãn"
  total_chapters: Number,
  total_views: Number,
  weekly_views: Number,
  weekly_views_start: Date
}
```

### Chapter (MongoDB)
```javascript
{
  book_id: ObjectId,      // Reference to Book
  chapter_number: Number,
  title: String,
  content: String        // Full text content
}
```

---

## Frontend Routes

| Path | Component | Access |
|------|-----------|--------|
| `/` | HomePage | Public |
| `/truyen/:bookId` | BookDetail | Public |
| `/truyen/:bookId/chuong/:chapterNumber` | ReadChapter | Public |
| `/profile` | UserProfile | User+ |
| `/host/my-books` | MyBooks | Host+ |
| `/host/*` | MyBooks | Host+ |
| `/admin/crawler` | CrawlBooks | Admin |

---

## Cron Jobs & Automation

### Scheduled Crawler
```javascript
// Backend/server.js
// Runs at 00:00 and 12:00 daily (Vietnam Time)
startCrawlerCron();

// In scraper.js
cron.schedule('0 0 * * *', () => {
  // Midnight crawl
});
cron.schedule('0 12 * * *', () => {
  // Noon crawl
});
```

### Weekly View Reset
```javascript
// chapterController.js
// Automatically tracks weekly views reset on Monday
const weekStart = getWeekStart(); // Monday 00:00
```

---

## Real-time Features (Socket.io)

```javascript
// Backend: src/configs/socket.js
// Connection handling for real-time updates

io.on('connection', (socket) => {
  // User joins room
  socket.on('join', (userId) => {
    socket.join(userId);
  });
  
  // Notification broadcast
  io.to(userId).emit('notification', {
    type: 'new_chapter',
    bookId: '...',
    chapterNumber: 10
  });
});
```

---

## Image Upload Flow

```
User selects cover image
    │
    ▼
┌─────────────────────────────────┐
│  Convert to Base64              │
│  Client-side in browser         │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  API: POST /api/books/upload-cover│
│  Body: {                        │
│    file_name: "cover.jpg",      │
│    file_base64: "data:image/..."│
│  }                              │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Backend:                      │
│  1. Parse Base64               │
│  2. Validate MIME type         │
│  3. Check file size (max 5MB)  │
│  4. Save to: frontend/public/   │
│     uploaded_covers/           │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Return public URL:             │
│  http://localhost:5000/         │
│  uploaded_covers/              │
│  {timestamp}-cover.jpg         │
└─────────────────────────────────┘
```

---

## Development Workflow

### Starting Development Server

```bash
# Terminal 1 - Backend
cd Backend
npm start
# Server runs on http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev
# Vite runs on http://localhost:5173
```

### Environment Variables

**Backend (.env)**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/lovetruyen
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
CRAWLER_LATEST_LIMIT=10
```

**Frontend (.env)**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## Security Notes

1. **Authentication**: All protected routes verify Supabase JWT token
2. **Role Check**: Admin routes check `profiles.role` in Supabase
3. **Input Validation**: All API inputs are sanitized and validated
4. **File Upload**: Size limit (5MB) and MIME type validation
5. **CORS**: Enabled for frontend origin only

---------------------------------------------------------------------------------------------------------------------------------
# WORKFLOW & CHANGELOG - DỰ ÁN LOVETRUYEN
**Cập nhật lần cuối:** 30/03/2026
**Vai trò:** Full Stack Developer (React, Node.js, MongoDB)
**Mục đích file:** Ghi chú lại tiến độ, kiến trúc và các bug đã giải quyết để dễ dàng hand-off (bàn giao) context cho các phiên làm việc tiếp theo hoặc các công cụ AI hỗ trợ code khác.

---

## 1. TỔNG QUAN KIẾN TRÚC (TECH STACK)
- **Frontend:** React (Vite), Tailwind CSS, React Router v6.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (Lưu trữ data hệ thống) + Supabase (Quản lý Authentication & Auth Users).
- **Thư viện quan trọng mới bổ sung:** `mammoth` (chuyên dùng để bóc tách text/html từ file `.docx`).

---

## 2. CÁC TÍNH NĂNG ĐÃ HOÀN THIỆN & CẬP NHẬT GẦN NHẤT

### A. Quản trị Truyện & Chương (Host/Admin)
- **Cơ chế URL Slug chuẩn SEO:** Đã chuyển đổi hệ thống route từ việc dùng `_id` mặc định của MongoDB sang dùng `slug` (tên-truyen-khong-dau). Cập nhật API `getBookById` và API lấy chương để tự động dịch Slug thành `_id` phục vụ truy vấn.
- **Tính năng Đăng/Thêm Chương Hàng Loạt (Batch Upload):**
  - Xóa bỏ việc nhập text thủ công (gỡ thư viện `react-quill`).
  - Dùng `mammoth` bóc tách dữ liệu thẳng từ file Word (`.docx`).
  - Tích hợp Regex tự động nhận diện Số chương và Tên chương từ tên file (Format chuẩn: `Số - Tên chương.docx`).
  - Xử lý upload tuần tự (Sequential Upload) lên Server để tránh nghẽn Database.
- **Tính năng Sửa & Xóa Truyện/Chương:**
  - Tách riêng trang `EditBook.jsx` (Gồm 3 section: Sửa thông tin sách, Quản lý/Xóa chương, Cập nhật file chương mới).
  - Áp dụng cơ chế **Ghi đè file Word** khi cập nhật nội dung chương.
  - **Xóa Truyện (Cascade Delete):** Xây dựng `DeleteBookModal.jsx` với 2 lớp cảnh báo. Tự động xóa toàn bộ chương trực thuộc trước khi xóa Book để chống rác Database.
- **Thống kê Host (`HostStats.jsx`):** Đã sửa lỗi 404 do lệch thứ tự Router. API `getHostStats` sử dụng `Aggregation` của MongoDB để tính toán tổng View, tổng Chương và phân loại truyện theo Status.

### B. Quản lý Người dùng & Phân quyền (Admin)
- **Auto-Sync Supabase & MongoDB:** Viết hàm trợ thủ `getOrCreateMongoUser` trong `adminUserController.js`. Nếu Admin thao tác (Ban, Mute, Đổi Role) lên một user mới chỉ có trong Supabase mà chưa từng đăng nhập vào MongoDB, hệ thống sẽ tự động tạo Profile để chống lỗi 404.
- **Đồng bộ hóa 2 bảng User:** Khi gọi `getOrCreateProfile`, hệ thống tự động tạo dữ liệu đồng thời trên 2 bảng `UserProfile` (lưu role, status) và `User` (lưu thư viện, lịch sử đọc) để đảm bảo toàn vẹn dữ liệu.
- **Tối ưu UI Quản lý:** Đã fix lỗi CSS Flexbox (`items-start`) trong `UserTable.jsx` khiến các thẻ Badge trạng thái bị kéo dãn sai tỷ lệ.

### C. Trải nghiệm người đọc (User/Reader)
- **Hiển thị nội dung (`ReadChapter.jsx`):** Đã khắc phục lỗi hiển thị thẻ HTML thô (Raw HTML) bằng cách sử dụng `dangerouslySetInnerHTML` kết hợp class Tailwind CSS (`[&>p]:indent-8 [&>p]:mb-6`) để render văn bản bóc tách từ Word một cách thụt lề chuẩn, mượt mà.
- **Tối ưu Header & Chống Infinite Loop:** Đã sửa lỗi gọi API `getOrCreateProfile` lặp vô tận chục lần mỗi giây. Nguyên nhân do bỏ Object `[user]` vào Dependency Array của `useEffect`. Đã tối ưu lại thành `[user?.id]` và gộp các lệnh dư thừa.

---

## 3. CÁC API ĐÃ XÂY DỰNG TRONG PHIÊN NÀY
**Book Controller:**
- `GET /api/books/host-stats`: Lấy thống kê của Host (Phải đặt trên route `/:idOrSlug`).
- `PUT /api/books/:id`: Cập nhật thông tin cơ bản của truyện.
- `DELETE /api/books/:id`: Xóa truyện & xóa luôn các chương liên quan.

**Chapter Controller:**
- `PUT /api/chapters/:id`: Cập nhật nội dung/số/tên chương. (Có check trùng số chương).
- `DELETE /api/chapters`: Xóa hàng loạt chương (nhận array ID) và auto update lại biến `total_chapters` trong bảng Book.

**Admin User Controller:**
- `POST /api/users/:id/toggle-ban`: Khóa/Mở khóa User (có lý do, có ghi AuditLog).
- `POST /api/users/:id/mute`: Cấm chat có thời hạn.

---

## 4. GHI CHÚ QUAN TRỌNG CHO AI / DEVELOPER KẾ TIẾP
- Hệ thống Auth hiện tại ưu tiên Supabase làm gốc (Nắm giữ Token/Session). MongoDB đóng vai trò lưu trữ Profile phụ (Role, Coins, Config). Mọi tương tác tìm kiếm User chéo giữa 2 bảng đều dựa vào field `supabaseId`.
- Cấu hình Axios (`axiosConfig.js`) đã có sẵn Interceptor để tự động nhét Bearer Token vào header, đồng thời tự động bắt lỗi 403 (ACCOUNT_BANNED) để văng Toast, xóa localStorage và force Sign Out. Không cần phải tự viết check Banned lắt nhắt ở từng Component Frontend.


# Overview project structure
```
LOVETRUYEN/
├── frontend/                     # GIỮ NGUYÊN CẤU TRÚC HIỆN TẠI, CHỈ SỬA CÁCH DÙNG
│   ├── src/
│   │   ├── assets/...            
│   │   ├── components/...        # Chỉ chứa UI và gọi Service (Không gọi axios trực tiếp)
│   │   ├── pages/...             # Các trang chính (Views)
│   │   ├── services/             # 🌟 TRÁI TIM GIAO TIẾP VỚI BACKEND
│   │   │   ├── axiosConfig.js    # Cấu hình chung, interceptors [cite: 37, 38, 39]
│   │   │   ├── storyService.js   # API cho truyện
│   │   │   ├── userService.js    # API cho user
│   │   │   ├── searchService.js  # API cho tìm kiếm
│   │   │   └── ...
│   │   └── App.jsx
│
└── Backend/
    ├── src/
    │   ├── configs/...           # Chứa file kết nối DB, Supabase
    │   ├── middlewares/...       # Chứa auth, admin checks
    │   ├── models/...            # Định nghĩa Schema MongoDB (Book, User,...)
    │   │
    │   ├── repositories/         # 🌟 TẦNG TRUY VẤN DATABASE (MỚI) 
    │   │   ├── bookRepo.js       # CHỈ chứa code: Book.find(), Book.aggregate() [cite: 18]
    │   │   ├── userRepo.js
    │   │   └── ...
    │   │
    │   ├── services/             # 🌟 TẦNG XỬ LÝ BUSINESS LOGIC (MỚI) 
    │   │   ├── bookService.js    # Tính toán views, kiểm tra logic trước khi lưu
    │   │   ├── userService.js    # Logic cấp quyền, tính toán thời gian ban user
    │   │   └── ...
    │   │
    │   ├── controllers/          # 🌟 TẦNG API LAYER 
    │   │   ├── bookController.js # Chỉ nhận req.body -> gọi Service -> res.json() 
    │   │   ├── userController.js 
    │   │   └── ...
    │   │
    │   ├── routes/               # GIỮ NGUYÊN
    │   │   ├── bookRoutes.js     # Trỏ tới Controller tương ứng
    │   │   ├── userRoutes.js
    │   │   └── ...
    │   │
    │   └── server.js
    └── .env
```