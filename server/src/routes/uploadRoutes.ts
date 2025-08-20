import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const router = express.Router();

// Ensure directories exist
const imageUploadDir = path.join(__dirname, '../../public/upload/userImage');
const audioUploadDir = path.join(__dirname, '../../public/upload/audio');

// Create directories if they don't exist
[imageUploadDir, audioUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Configure image storage
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imageUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Configure audio storage
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, audioUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// 增加文件大小限制
const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadAudio = multer({
    storage: audioStorage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// CORS 中间件
const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 获取原始请求的来源
    const origin = req.headers.origin;

    // 在生产环境中检查允许的域
    if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = [
            'https://unwraplove.app',
            'https://www.unwraplove.app',
            'https://unwrap.love',
            'https://www.unwrap.love'
        ];

        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
    } else {
        // 开发环境允许所有源
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
};

// Upload image
router.post('/image', corsMiddleware, uploadImage.single('image'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const fileUrl = `/upload/userImage/${req.file.filename}`;
        console.log(`Image uploaded successfully: ${fileUrl}`);
        res.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
});

// Upload audio
router.post('/audio', corsMiddleware, uploadAudio.single('audio'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const fileUrl = `/upload/audio/${req.file.filename}`;
        console.log(`Audio uploaded successfully: ${fileUrl}`);
        res.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error('Error uploading audio:', error);
        res.status(500).json({ success: false, message: 'Failed to upload audio' });
    }
});

export default router; 