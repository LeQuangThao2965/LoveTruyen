import { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import api from '../../services/axiosConfig';
import * as mammoth from 'mammoth';
import { FaTimes, FaCheckCircle, FaExclamationCircle, FaSpinner, FaFileUpload } from 'react-icons/fa';

const AddChapter = ({ bookId, onClose, onSuccess }) => {
  // State quản lý danh sách các file đang được xử lý
  const [chapterList, setChapterList] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // 1. HÀM XỬ LÝ KHI NGƯỜI DÙNG CHỌN FILE (HỖ TRỢ NHIỀU FILE)
  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    // Lọc ra các file chuẩn .docx
    const docxFiles = selectedFiles.filter(file => file.name.toLowerCase().endsWith('.docx'));
    const nonDocxFiles = selectedFiles.filter(file => !file.name.toLowerCase().endsWith('.docx'));
    
    if (nonDocxFiles.length > 0) {
      toast.warning(`Đã bỏ qua ${nonDocxFiles.length} file không phải định dạng .docx!`);
    }

    if (docxFiles.length === 0) return;

    // Tạo danh sách chờ xử lý
    const newChapters = docxFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file: file,
      filename: file.name,
      chapterNumber: null,
      chapterTitle: '',
      content: '',
      status: 'processing', // pending, processing, ready, error, success
      message: 'Đang bóc tách dữ liệu...'
    }));

    // Cập nhật giao diện ngay lập tức để user thấy file đã vào hàng đợi
    setChapterList(prev => [...prev, ...newChapters]);

    // Bắt đầu bóc tách từng file
    for (const item of newChapters) {
      await extractFileContent(item);
    }
  };

  // 2. HÀM BÓC TÁCH DỮ LIỆU TỪ TÊN FILE VÀ MAMMOTH
  const extractFileContent = async (chapterItem) => {
    try {
      // Bóc tách tên file
      const nameWithoutExt = chapterItem.filename.replace(/\.docx$/i, '');
      const regex = /^(\d+(?:\.\d+)?)\s*-\s*(.*)$/;
      const match = nameWithoutExt.match(regex);

      if (!match) {
        updateChapterStatus(chapterItem.id, 'error', 'Sai cú pháp tên file. Hãy dùng: "Số - Tên.docx"');
        return;
      }

      const chapterNumber = match[1].trim();
      const chapterTitle = match[2].trim();

      // Bóc tách nội dung bằng Mammoth (Dùng convertToHtml để giữ lại thẻ đoạn văn <p>)
      const arrayBuffer = await chapterItem.file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const content = result.value;

      if (!content || content.trim() === '') {
        updateChapterStatus(chapterItem.id, 'error', 'File Word bị rỗng hoặc không đọc được nội dung.');
        return;
      }

      // Nếu mọi thứ hoàn hảo, cập nhật trạng thái thành 'ready'
      setChapterList(prev => prev.map(ch => 
        ch.id === chapterItem.id 
        ? { ...ch, chapterNumber, chapterTitle, content, status: 'ready', message: 'Hợp lệ. Sẵn sàng đăng!' } 
        : ch
      ));

    } catch (error) {
      console.error('Lỗi giải mã file:', error);
      updateChapterStatus(chapterItem.id, 'error', 'Lỗi hệ thống khi đọc file Word.');
    }
  };

  // Hàm helper cập nhật trạng thái list
  const updateChapterStatus = (id, status, message) => {
    setChapterList(prev => prev.map(ch => 
      ch.id === id ? { ...ch, status, message } : ch
    ));
  };

  // Hàm xóa 1 file khỏi danh sách nếu user không muốn up nữa
  const removeChapter = (id) => {
    setChapterList(prev => prev.filter(ch => ch.id !== id));
  };

  // 3. HÀM GỬI LÊN SERVER (UPLOAD TUẦN TỰ TRÁNH SẬP SERVER)
  const handleSubmitAll = async () => {
    // Chỉ lấy những file hợp lệ
    const validChapters = chapterList.filter(ch => ch.status === 'ready');
    
    if (validChapters.length === 0) {
      return toast.error('Không có chương nào hợp lệ để đăng!');
    }

    // Kiểm tra bảo mật
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('Vui lòng đăng nhập!');

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validChapters.length });

    let successCount = 0;

    // Upload TUẦN TỰ từng chương để đảm bảo tính toàn vẹn (không bị đụng độ DB)
    for (let i = 0; i < validChapters.length; i++) {
      const chapter = validChapters[i];
      updateChapterStatus(chapter.id, 'processing', 'Đang tải lên server...');

      try {
        const response = await api.post('/chapters', {
          book_id: bookId,
          chapter_number: parseFloat(chapter.chapterNumber),
          title: chapter.chapterTitle,
          content: chapter.content
        });

        if (response && response.success) {
          updateChapterStatus(chapter.id, 'success', 'Thành công!');
          successCount++;
        } else {
          updateChapterStatus(chapter.id, 'error', response?.message || 'Lỗi từ máy chủ');
        }
      } catch (error) {
        updateChapterStatus(chapter.id, 'error', error?.response?.data?.message || 'Trùng số chương hoặc lỗi mạng');
      }

      setUploadProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsUploading(false);
    toast.success(`Đã hoàn tất! Thành công: ${successCount}/${validChapters.length} chương.`);
    
    if (successCount > 0 && onSuccess) {
      onSuccess(); // Load lại danh sách ở ngoài MyBooks
    }
  };

  // Thống kê nhanh
  const readyCount = chapterList.filter(ch => ch.status === 'ready').length;
  const errorCount = chapterList.filter(ch => ch.status === 'error').length;
  const successCount = chapterList.filter(ch => ch.status === 'success').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/80">
          <div>
            <h2 className="text-xl font-extrabold text-gray-800">Thêm Chương Hàng Loạt</h2>
            <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ tự động bóc tách số chương và tên chương từ tên file.</p>
          </div>
          <button onClick={onClose} disabled={isUploading} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition disabled:opacity-50">
            <FaTimes size={20} />
          </button>
        </div>
        
        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* KHU VỰC KÉO THẢ / CHỌN FILE */}
          <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center bg-indigo-50/30 hover:bg-indigo-50/80 transition relative">
            <input
              type="file"
              id="batchFiles"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              multiple
              accept=".docx"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="flex flex-col items-center pointer-events-none">
              <FaFileUpload className="text-4xl text-indigo-400 mb-3" />
              <p className="font-bold text-indigo-700 text-lg">Click hoặc Kéo thả nhiều file Word vào đây</p>
              <p className="text-sm text-gray-500 mt-1">Định dạng tên file bắt buộc: <span className="font-bold text-indigo-600">"Số - Tên chương.docx"</span> (VD: 1 - Khởi nguyên.docx)</p>
            </div>
          </div>

          {/* DANH SÁCH FILE ĐÃ CHỌN */}
          {chapterList.length > 0 && (
            <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <span className="font-bold text-gray-700 text-sm">Danh sách chuẩn bị đăng ({chapterList.length})</span>
                <div className="flex gap-3 text-xs font-semibold">
                  <span className="text-green-600">Sẵn sàng: {readyCount}</span>
                  <span className="text-red-500">Lỗi: {errorCount}</span>
                </div>
              </div>
              <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {chapterList.map((ch) => (
                  <li key={ch.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3 w-3/4">
                      {/* ICON TRẠNG THÁI */}
                      <div className="mt-1 shrink-0">
                        {ch.status === 'processing' && <FaSpinner className="text-blue-500 animate-spin" />}
                        {ch.status === 'ready' && <FaCheckCircle className="text-green-500" />}
                        {ch.status === 'success' && <FaCheckCircle className="text-emerald-600" />}
                        {ch.status === 'error' && <FaExclamationCircle className="text-red-500" />}
                      </div>
                      
                      {/* THÔNG TIN */}
                      <div className="truncate w-full">
                        <p className="font-semibold text-gray-800 text-sm truncate">{ch.filename}</p>
                        <p className={`text-xs mt-0.5 truncate ${ch.status === 'error' ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          {ch.message}
                        </p>
                      </div>
                    </div>

                    {/* NÚT XÓA TỪNG FILE */}
                    {(ch.status !== 'success' && ch.status !== 'processing') && !isUploading && (
                      <button onClick={() => removeChapter(ch.id)} className="text-xs text-gray-400 hover:text-red-500 px-2">
                        Bỏ qua
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* FOOTER - NÚT XÁC NHẬN */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <div className="text-sm font-semibold text-gray-600">
            {isUploading && <span className="text-indigo-600 animate-pulse">Đang tải lên {uploadProgress.current} / {uploadProgress.total}...</span>}
            {successCount > 0 && !isUploading && <span className="text-emerald-600">Đã đăng thành công {successCount} chương!</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              onClick={handleSubmitAll}
              disabled={isUploading || readyCount === 0}
              className="px-6 py-2.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-md"
            >
              {isUploading ? <><FaSpinner className="animate-spin" /> Đang xử lý...</> : `Tải lên ${readyCount} chương hợp lệ`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AddChapter;