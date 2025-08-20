import express from 'express';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import AiImageModel from '../models/AiImageModel'
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
// 创建文件夹如果不存在
const ensureDirExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirExists('public/upload/aiImage');

// 初始化 X.AI API 客户端
const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || 'dummy-key',
  baseURL: "https://api.x.ai/v1",
});

// 修改为基于纯文本的AI图像生成
router.post('/aiImage', express.json(), async (req, res) => {
  console.log('AI text-to-image generation called');

  try {
    const id = uuidv4();
    const outputPath = `public/upload/aiImage/${id}.webp`;

    // 从请求体中获取提示词
    const prompt = req.body.prompt?.trim();
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    console.log(`生成图像的提示词: "${prompt}"`);

    // 使用 X.AI 生成图像
    const response = await openai.images.generate({
      model: "grok-2-image",
      prompt: prompt,
    });

    // 获取生成的图像URL
    const imageUrl = response.data?.[0]?.url;

    // 检查URL是否存在
    if (!imageUrl) {
      return res.status(500).json({ success: false, message: 'Failed to generate image: No URL returned' });
    }

    // 下载图像
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data as ArrayBuffer);

    // 保存图像到本地
    await sharp(imageBuffer).toFormat('webp').toFile(outputPath);

    // 响应成功和图像路径
    res.json({
      success: true,
      id,
      imageUrl: `/upload/aiImage/${path.basename(outputPath)}`
    });
  } catch (err) {
    console.error('❌ AI generator error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate AI image' });
  }
});

// 新增：取得 AI 圖片（GET）
router.get('/aiImage/:filename', async (req, res) => {
  const filename = req.params.filename;

  const imagePath = path.join(__dirname, '../../public/upload/aiImage', filename);

  // 檢查檔案是否存在
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ success: false, message: '圖片不存在' });
  }

  // 回傳圖片檔案
  res.sendFile(imagePath);
});

//for cancel the apply image
router.delete('/aiImage/:filename', async (req, res) => {
  const filename = req.params.filename;

  const imagePath = path.join(__dirname, '../../public/upload/aiImage', filename);

  try {
    // 檢查圖片是否存在
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ success: false, message: '圖片不存在' });
    }

    // 刪除圖片
    fs.unlinkSync(imagePath);

    res.json({ success: true, message: '圖片已成功刪除' });
  } catch (err) {
    console.error('❌ 刪除圖片時出錯：', err);
    res.status(500).json({ success: false, message: '刪除失敗' });
  }
});

//handle apply ai image
router.post('/aiImage/save', async (req, res) => {
  console.log("📥 收到儲存請求", req.body)
  const { id, imageUrl, position, zIndex, rotation, dateTaken } = req.body;

  try {
    const result = await AiImageModel.create({
      id,
      imageUrl,
      position,
      zIndex,
      rotation,
      dateTaken,
      createdAt: new Date(),
    });

    console.log("✅ MongoDB successful:", result);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(' fail to save the ai image:', error);
    res.status(500).json({ success: false, message: 'fail to save the ai image:' });
  }
});

//update the position after dragging
router.patch('/aiImage/update-position', async (req, res) => {
  const { id, position, zIndex } = req.body;
  try {
    await AiImageModel.findOneAndUpdate({ id }, { position, zIndex });
    res.json({ success: true });
  } catch (error) {
    console.error('fail to update position :', error);
    res.status(500).json({ success: false });
  }
});

// load all the Ai images
router.get('/aiImages', async (req, res) => {
  try {
    const images = await AiImageModel.find({});
    res.json({ success: true, data: images });
  } catch (error) {
    console.error('❌ 無法載入圖片：', error);
    res.status(500).json({ success: false, message: '載入失敗' });
  }
});

//for delete the ai image from mongoDB
router.delete('/aiImage/by-id/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // try to find the image
    const imageDoc = await AiImageModel.findOne({ id });

    if (!imageDoc) {
      return res.status(404).json({ success: false, message: 'fail to find the image' });
    }

    const filename = path.basename(imageDoc.imageUrl); // extra the filename from imageUrl 
    const imagePath = path.join(__dirname, '../../public/upload/aiImage', filename);

    // deleted the image from file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // remove the data from mongoDB
    await AiImageModel.deleteOne({ id });

    res.json({ success: true, message: 'deleted from MomgoDB sucessfully' });
  } catch (err) {
    console.error('❌ fail to delete from mongoDB：', err);
    res.status(500).json({ success: false, message: 'error during deleting from MongoDB' });
  }
});

export default router;
