import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 确保目录存在
const ensureDirExists = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// 创建音频上传目录
const audioUploadDir = path.join(__dirname, '../../public/upload/audio');
ensureDirExists(audioUploadDir);

// 上传base64音频文件
router.post('/upload', async (req: Request, res: Response) => {
    try {
        const { base64Audio } = req.body;
        
        // 验证请求
        if (!base64Audio || typeof base64Audio !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Invalid audio data'
            });
        }
        
        // 检查是否是有效的base64数据
        if (!base64Audio.startsWith('data:audio/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid audio format'
            });
        }
        
        // 生成唯一ID
        const id = uuidv4();
        const fileExt = base64Audio.substring(
            base64Audio.indexOf('/') + 1, 
            base64Audio.indexOf(';base64')
        );
        const fileName = `${id}.${fileExt}`;
        const filePath = path.join(audioUploadDir, fileName);
        
        // 从base64提取实际的二进制数据
        const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 保存到文件
        fs.writeFileSync(filePath, buffer);
        
        // 返回文件URL
        return res.status(200).json({
            success: true,
            id,
            audioUrl: `/upload/audio/${fileName}`
        });
    } catch (error: any) {
        console.error('Audio upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error saving audio file'
        });
    }
});

// 获取音频文件列表
router.get('/list', (req: Request, res: Response) => {
    try {
        const files = fs.readdirSync(audioUploadDir);
        const audioFiles = files.map(file => {
            const id = file.split('.')[0];
            return {
                id,
                audioUrl: `/upload/audio/${file}`
            };
        });
        
        return res.status(200).json({
            success: true,
            data: audioFiles
        });
    } catch (error) {
        console.error('Error listing audio files:', error);
        return res.status(500).json({
            success: false,
            message: 'Error listing audio files'
        });
    }
});

export default router; 