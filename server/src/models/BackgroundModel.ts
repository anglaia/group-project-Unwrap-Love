import mongoose from 'mongoose'

// 背景图片模型
const BackgroundSchema = new mongoose.Schema({
    // 唯一标识符
    id: {
        type: String,
        required: true,
        unique: true
    },

    // 背景图片URL
    imageUrl: {
        type: String,
        required: true
    },

    // 图片原始名称
    originalName: {
        type: String
    },

    // 创建日期
    createdAt: {
        type: Date,
        default: Date.now
    },

    // 最后使用日期
    lastUsed: {
        type: Date,
        default: Date.now
    },

    // 是否为默认背景
    isDefault: {
        type: Boolean,
        default: false
    }
})

const BackgroundModel = mongoose.model('Background', BackgroundSchema)

export default BackgroundModel 