let io;

const initSocket = (server) => {
    const { Server } = require("socket.io");
    io = new Server(server, {
        cors: {
            origin: "*", // Cho phép Frontend gọi vào
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`⚡ Client connected: ${socket.id}`);

        // User join vào room của 1 truyện (để chat/nhận comment truyện đó)
        socket.on("join_story_room", (storyId) => {
            socket.join(storyId);
            console.log(`User joined story: ${storyId}`);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected");
        });
    });

    return io;
};

// Hàm này để các Controller khác gọi để bắn thông báo
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIO };