import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { body, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const router = express.Router();

// 确保目录存在
const ensureDirExists = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// 创建上传目录
ensureDirExists(path.join(__dirname, '../../public/upload/grokImage'));

// 初始化 X.AI API 客户端
const openai = new OpenAI({
    apiKey: process.env.XAI_API_KEY || 'dummy-key',
    baseURL: "https://api.x.ai/v1",
});

// Generate image using X.AI API
router.post(
    '/generate-image',
    [
        body('prompt').notEmpty().withMessage('Prompt is required'),
    ],
    async (req: Request, res: Response) => {
        // 验证请求
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { prompt } = req.body;
            const id = uuidv4();
            const outputPath = path.join(__dirname, `../../public/upload/grokImage/${id}.webp`);

            if (!process.env.XAI_API_KEY) {
                return res.status(500).json({
                    message: 'XAI_API_KEY is not configured on the server',
                });
            }

            console.log(`生成图像的提示词: "${prompt}"`);

            // 使用 X.AI 生成图像
            try {
                const response = await openai.images.generate({
                    model: "grok-2-image",
                    prompt: prompt,
                });

                // 获取生成的图像URL
                const imageUrl = response.data?.[0]?.url;

                // 检查URL是否存在
                if (!imageUrl) {
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to generate image: No URL returned'
                    });
                }

                // 下载图像
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const imageBuffer = Buffer.from(imageResponse.data as ArrayBuffer);

                // 保存图像到本地
                await sharp(imageBuffer).toFormat('webp').toFile(outputPath);

                // 响应成功和图像路径
                return res.status(200).json({
                    success: true,
                    id,
                    imageUrl: `/upload/grokImage/${id}.webp`
                });
            } catch (error: any) {
                console.error('XAI API error:', error.message);
                return res.status(500).json({
                    success: false,
                    message: error.message || 'Failed to generate image with XAI'
                });
            }
        } catch (error: any) {
            console.error('Image generation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error generating image'
            });
        }
    }
);

export default router; 