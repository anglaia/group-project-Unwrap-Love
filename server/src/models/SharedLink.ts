import mongoose, { Schema, Document } from 'mongoose';

// 定义分享链接的接口
export interface ISharedLink extends Document {
    customRoute: string;     // 自定义的URL路由
    paperId: string;         // 关联的Paper ID
    createdBy: string;       // 创建者的用户ID
    createdAt: Date;         // 创建时间
    expiresAt?: Date;        // 过期时间（可选）
    isActive: boolean;       // 是否激活
}

// 创建Schema
const SharedLinkSchema: Schema = new Schema(
    {
        customRoute: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: /^[a-zA-Z0-9-_]+$/  // 只允许字母、数字、连字符和下划线
        },
        paperId: {
            type: String,
            required: true,
            trim: true
        },
        createdBy: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            default: null  // 默认不过期
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true  // 自动添加 createdAt 和 updatedAt
    }
);

// 创建索引以加快查询
SharedLinkSchema.index({ customRoute: 1 });
SharedLinkSchema.index({ paperId: 1 });
SharedLinkSchema.index({ createdBy: 1 });

// 导出模型
export default mongoose.model<ISharedLink>('SharedLink', SharedLinkSchema); 