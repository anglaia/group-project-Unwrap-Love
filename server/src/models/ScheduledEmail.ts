import mongoose, { Document, Schema } from 'mongoose';

// 定义ScheduledEmail接口
export interface IScheduledEmail extends Document {
    shareUrl: string;
    recipientEmail: string;
    senderName: string;
    scheduledTime: Date;
    status: 'pending' | 'sent' | 'failed';
    sentAt?: Date;
    failCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

// 定义ScheduledEmail模型的Schema
const ScheduledEmailSchema = new Schema<IScheduledEmail>(
    {
        shareUrl: { type: String, required: true },
        recipientEmail: { type: String, required: true },
        senderName: { type: String, default: 'Your Friend' },
        scheduledTime: { type: Date, required: true },
        status: {
            type: String,
            enum: ['pending', 'sent', 'failed'],
            default: 'pending'
        },
        sentAt: { type: Date },
        failCount: { type: Number, default: 0 }
    },
    { timestamps: true }
);

// 创建索引以提高查询性能
ScheduledEmailSchema.index({ status: 1, scheduledTime: 1 });

// 导出ScheduledEmail模型
export const ScheduledEmail = mongoose.model<IScheduledEmail>('ScheduledEmail', ScheduledEmailSchema); 