const HomePage = () => {
    return (
        <div className="container mx-auto p-4">
            <h2 className="text-xl font-bold mb-4">Truyện Mới Cập Nhật</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Giả lập 1 cái thẻ truyện */}
                <div className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition">
                    <img src="https://via.placeholder.com/150x200" alt="Truyện" className="w-full h-48 object-cover"/>
                    <div className="p-2">
                        <h3 className="font-semibold text-sm truncate">Tiên Nghịch</h3>
                        <p className="text-xs text-gray-500">Chương 1024</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;