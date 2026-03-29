# * Các phần code quan trọng nên được comment tên như sau: "// 1. CHẶN Ở GIAO DIỆN (HTML INPUT)"

## 1. TỔNG HỢP CÁC THƯ VIỆN NÊN CÀI ĐẶT
```javascript
A. Dành cho Frontend (React):

mammoth: Thư viện "thần thánh" giúp đọc file Word (.docx) và chuyển đổi thành mã HTML sạch, loại bỏ hoàn toàn các định dạng rác của Microsoft Word.

react-quill: Trình soạn thảo văn bản (Rich Text Editor) nhẹ, mượt và sinh ra mã HTML cực kỳ chuẩn để lưu vào Database. Dùng cho việc tác giả muốn chỉnh sửa lại nội dung chương.

react-router-dom: Dùng để điều hướng sang một Trang riêng biệt (Separate Page) khi thêm/sửa chương, tuyệt đối không dùng Modal để tránh rủi ro click nhầm mất dữ liệu.

react-toastify: Dùng để hiển thị thông báo (Thành công, Thất bại, Cảnh báo sai định dạng tên file) một cách thân thiện.

axios (Tùy chọn, có thể dùng fetch): Dùng trong thư mục services để gọi API giao tiếp với Backend cho gọn gàng.

B. Dành cho Backend (Node.js):

mongoose: Thư viện bắt buộc để giao tiếp với MongoDB, giúp định nghĩa các Schema (Khuôn mẫu) cho Book và Chapter một cách chặt chẽ.
```

## 2. NHỮNG VIỆC NÊN LÀM (TỐI ƯU UX/UI & KIẾN TRÚC)
```javascript
1. SỬ DỤNG TRANG RIÊNG (SEPARATE PAGE) THAY VÌ MODAL:
- Tạo các route như /host/add-chapter/:bookId và /host/edit-chapter/:chapterId.
- Không gian rộng rãi giúp tích hợp React-Quill dễ dàng, người dùng không lo bị click nhầm ra ngoài làm mất hàng ngàn chữ đang soạn thảo.

2. TỰ ĐỘNG BÓC TÁCH THÔNG TIN TỪ TÊN FILE (AUTO-EXTRACT):
- Yêu cầu tác giả đặt tên file theo chuẩn, ví dụ: "15 - Tên chương.docx".
- Dùng Regex ^(\d+(?:\.\d+)?)\s*-\s*(.*)$ để tách số chương và tên chương tự động điền vào form, giúp tiết kiệm thời gian nhập liệu.

3. KỸ THUẬT CHE LẤP DỮ LIỆU (PROJECTION) LÚC LẤY MỤC LỤC:
- Khi load danh sách chương ở trang Quản lý hoặc trang Đọc truyện, tuyệt đối KHÔNG lấy cột nội dung (content).
- Cú pháp Mongoose: Chapter.find({ book_id: id }).select('chapter_number title createdAt'). Điều này giúp web load nhanh gấp 100 lần.
```


## 3. NHỮNG YÊU CẦU BẮT BUỘC ĐỂ ĐẢM BẢO TÍNH TOÀN VẸN DỮ LIỆU (DATA INTEGRITY)
```javascript
Để hệ thống không bị "rác" dữ liệu hoặc sập ngầm, bạn bắt buộc phải có các cơ chế sau:

A. Ở tầng Database (MongoDB Schema):

Gộp bảng hợp lý: Nội dung chữ (content) phải nằm chung bảng với thông tin chương (chapters). Chốt lại chỉ có 2 bảng là books và chapters.

Khóa ngoại (book_id): Mọi chương truyện lưu vào bảng chapters bắt buộc phải có book_id để biết nó thuộc về bộ truyện nào (Ràng buộc required: true).

Kiểu dữ liệu của Số chương (chapter_number): Bắt buộc phải là kiểu Number (để hỗ trợ sắp xếp và các chương ngoại truyện như 1.5). Tuyệt đối không dùng String hay ID tự sinh của DB.

B. Ở tầng API (Backend Controller):

Thuật toán chống trùng lặp chương (Upsert/Check): Trước khi lưu một chương mới, API phải kiểm tra xem bộ truyện đó đã tồn tại chapter_number này chưa. Nếu có rồi thì báo lỗi hoặc ghi đè, không được để sinh ra hai "Chương 1".

Cập nhật đồng bộ (Transaction-like logic):

Khi THÊM chương: Ngoài việc tạo record trong bảng chapters, phải dùng lệnh $inc để tăng biến total_chapters lên 1, và cập nhật updatedAt ở bảng books để truyện nhảy lên trang chủ.

Khi XÓA chương: Phải dùng lệnh giảm $inc: { total_chapters: -1 } ở bảng books để tổng số chương luôn chính xác.

Xóa rễ (Cascade Delete): Nếu tác giả quyết định Xóa bộ truyện, Backend phải tự động chạy lệnh xóa TẤT CẢ các chương nằm trong bảng chapters có cùng book_id đó. Tránh việc truyện mất rồi nhưng chương vẫn nằm lại làm đầy Database.

C. Ở tầng Frontend (React):

Cơ chế Fallback (Dự phòng): Lỡ tác giả up file sai tên (VD: nhap.docx), Regex bóc tách thất bại thì không được làm sập Web. Phải để lại form trống và dùng toast.info nhắc tác giả sửa lại tên file <số chương> chỉ nhập số & <tên chương> có giới hạn 50 ký tự & tên mẫu như sau: "15-Số phận bi thảm.docx" hoặc .doc

Kiểm tra rỗng (Validation): Trước khi bấm nút "Đăng chương", phải check xem biến content (nội dung lấy từ Quill/Mammoth) có bị rỗng hay không. Đừng bao giờ gửi một chương không có chữ lên Database.
```