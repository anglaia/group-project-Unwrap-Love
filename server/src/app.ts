import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import shareRoutes from './routes/shareRoutes';
import uploadRoutes from './routes/uploadRoutes';
import aiImageRoutes from './routes/aiImageRoutes';
import imageRoutes from './routes/imageRoutes';
import audioRoutes from './routes/audioRoutes';
import paperRoutes from './routes/paperRoutes';
import sharedLinkRoutes from './routes/sharedLinkRoutes';
import emailRoutes from './routes/emailRoutes';
// Load environment variables
dotenv.config();

// Create Express application
const app: Express = express();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
}

// 扩展 CORS 配置，允许更多的域名
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://unwraplove.app',
            'https://www.unwraplove.app',
            'https://unwrap.love',
            'https://www.unwrap.love',
            /\.unwraplove\.app$/,
            /\.unwrap\.love$/
        ] // 生产环境允许的域名
        : '*', // 开发环境允许所有源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 预检请求缓存一天
    preflightContinue: false
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet({
    frameguard: false,
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 安全头设置
app.use((req, res, next) => {
    const cspSources = process.env.NODE_ENV === 'production'
        ? "'self' https://unwraplove.app https://*.unwraplove.app https://unwrap.love https://*.unwrap.love"
        : "'self' http://localhost:3000";

    res.setHeader("Content-Security-Policy", `default-src 'self'; frame-ancestors ${cspSources}`);

    // 设置CORS头，确保跨域请求正常工作
    if (process.env.NODE_ENV === 'production') {
        const origin = req.headers.origin;
        // 检查请求源是否在允许列表中
        if (origin && (
            origin === 'https://unwraplove.app' ||
            origin === 'https://www.unwraplove.app' ||
            origin === 'https://unwrap.love' ||
            origin === 'https://www.unwrap.love' ||
            /https:\/\/.*\.unwraplove\.app$/.test(origin) ||
            /https:\/\/.*\.unwrap\.love$/.test(origin)
        )) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Access-Control-Max-Age', '86400'); // 预检请求缓存一天
        }
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    next();
});
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // 增加 JSON 请求体大小限制
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // 增加 URL 编码请求体大小限制

// 静态文件服务
// app.use('/upload', express.static(path.join(__dirname, '../upload')));
app.use('/upload', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');//allow the picture be used by other place
    next();
}, express.static(path.join(__dirname, '../public/upload')));

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/unwraplove';
console.log(`Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // 隐藏敏感信息

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

// Check MongoDB connection status
app.get('/api/db-status', (req, res) => {
    res.json({
        connected: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState,
        stateDescription: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    });
});

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Unwrap Love API',
        status: 'healthy',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// File upload routes
app.use('/api/upload', uploadRoutes);

// Share routes
app.use('/api/share', shareRoutes);

//ai api
app.use('/api/ai', aiImageRoutes);

// Grok image generation routes
app.use('/api/images', imageRoutes);

// Audio routes
app.use('/api/audio', audioRoutes);

// Paper routes
app.use('/api/papers', paperRoutes);

// 共享链接路由
app.use('/api/shared-links', sharedLinkRoutes);

// 邮件路由
app.use('/api/emails', emailRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});


export default app; 