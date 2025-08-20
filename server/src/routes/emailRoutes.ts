import express from 'express';
import { scheduleEmail, sendScheduledEmail } from '../controllers/emailController';

const router = express.Router();

// 创建定时邮件
router.post('/schedule', scheduleEmail);

// 手动触发发送定时邮件（用于测试）
router.post('/send/:id', sendScheduledEmail);

export default router; 