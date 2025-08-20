import { Request, Response } from 'express';
import axios from 'axios';
import { ScheduledEmail } from '../models/ScheduledEmail';

// 定时发送邮件的控制器
export const scheduleEmail = async (req: Request, res: Response) => {
    try {
        const { shareUrl, recipientEmail, senderName, scheduledTime } = req.body;

        // 验证必填字段
        if (!shareUrl || !recipientEmail) {
            return res.status(400).json({ message: 'Missing required fields: shareUrl and recipientEmail' });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // 验证定时时间
        if (!scheduledTime) {
            return res.status(400).json({ message: 'Missing scheduledTime' });
        }

        const scheduledDate = new Date(scheduledTime);
        if (isNaN(scheduledDate.getTime())) {
            return res.status(400).json({ message: 'Invalid scheduledTime format' });
        }

        // 如果定时时间已经过去，返回错误
        if (scheduledDate <= new Date()) {
            return res.status(400).json({ message: 'Scheduled time must be in the future' });
        }

        // 创建定时邮件记录
        const scheduledEmail = new ScheduledEmail({
            shareUrl,
            recipientEmail,
            senderName: senderName || 'Your Friend',
            scheduledTime: scheduledDate,
            status: 'pending'
        });

        await scheduledEmail.save();

        res.status(201).json({
            message: 'Email scheduled successfully',
            scheduledAt: scheduledDate,
            id: scheduledEmail._id
        });
    } catch (error: any) {
        console.error('Failed to schedule email:', error);
        res.status(500).json({ message: 'Failed to schedule email', error: error.message });
    }
};

// 手动触发发送定时邮件（用于测试）
export const sendScheduledEmail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const scheduledEmail = await ScheduledEmail.findById(id);
        if (!scheduledEmail) {
            return res.status(404).json({ message: 'Scheduled email not found' });
        }

        // 调用前端的API发送邮件
        const response = await axios.post(`${process.env.FRONTEND_URL}/api/send-email`, {
            shareUrl: scheduledEmail.shareUrl,
            recipientEmail: scheduledEmail.recipientEmail,
            senderName: scheduledEmail.senderName
        });

        // 更新邮件状态
        scheduledEmail.status = 'sent';
        scheduledEmail.sentAt = new Date();
        await scheduledEmail.save();

        res.json({ message: 'Email sent successfully', response: response.data });
    } catch (error: any) {
        console.error('Failed to send scheduled email:', error);
        res.status(500).json({ message: 'Failed to send scheduled email', error: error.message });
    }
};

// 处理所有待发送的定时邮件
export const processScheduledEmails = async () => {
    try {
        const now = new Date();

        // 查找所有已到发送时间但尚未发送的邮件
        const pendingEmails = await ScheduledEmail.find({
            scheduledTime: { $lte: now },
            status: 'pending'
        });

        console.log(`Found ${pendingEmails.length} pending emails to send`);

        // 逐个发送邮件
        for (const email of pendingEmails) {
            try {
                // 调用前端的API发送邮件
                await axios.post(`${process.env.FRONTEND_URL}/api/send-email`, {
                    shareUrl: email.shareUrl,
                    recipientEmail: email.recipientEmail,
                    senderName: email.senderName
                });

                // 更新邮件状态
                email.status = 'sent';
                email.sentAt = new Date();
                await email.save();

                console.log(`Successfully sent scheduled email to ${email.recipientEmail}`);
            } catch (error) {
                console.error(`Failed to send scheduled email to ${email.recipientEmail}:`, error);

                // 更新失败次数
                email.failCount = (email.failCount || 0) + 1;

                // 如果失败次数超过5次，标记为失败
                if (email.failCount >= 5) {
                    email.status = 'failed';
                }

                await email.save();
            }
        }

        return { processed: pendingEmails.length };
    } catch (error) {
        console.error('Error processing scheduled emails:', error);
        throw error;
    }
}; 