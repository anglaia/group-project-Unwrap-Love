import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import http from 'http';
import { Server } from 'socket.io';
import { processScheduledEmails } from './controllers/emailController';

// 使用require导入socket模块
const { setupSocketHandlers } = require('./socket');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 创建HTTP服务器
const server = http.createServer(app);

// Socket.io CORS配置
const socketCorsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://unwraplove.app', 'https://www.unwraplove.app', 'https://unwrap.love', 'https://www.unwrap.love', /\.unwraplove\.app$/]
    : "*", // 开发环境允许所有源
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
};

// 创建WebSocket服务器
const io = new Server(server, {
  cors: socketCorsOptions
});

// 设置Socket.io事件处理
setupSocketHandlers(io);

// 启动定时任务，每分钟检查一次是否有需要发送的定时邮件
const EMAIL_CHECK_INTERVAL = 60 * 1000; // 1分钟
setInterval(async () => {
  try {
    console.log('Checking for scheduled emails to send...');
    const result = await processScheduledEmails();
    if (result.processed > 0) {
      console.log(`Processed ${result.processed} scheduled emails`);
    }
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
  }
}, EMAIL_CHECK_INTERVAL);

// 启动HTTP服务器而不是Express应用
server.listen(PORT, () => {
  console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`WebSocket server is running`);
  console.log(`Scheduled email processor running every ${EMAIL_CHECK_INTERVAL / 1000} seconds`);
}); 