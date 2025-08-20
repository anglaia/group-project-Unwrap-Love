import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
    paperId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        default: 'Anonymous'
    },
    title: {
        type: String,
        default: 'Untitled Paper'
    },
    backgroundImage: {
        type: String,
        default: null
    },
    backgroundColor: {
        type: String,
        default: null
    },
    showGrid: {
        type: Boolean,
        default: true
    },
    canvasScrollable: {
        type: Boolean,
        default: false
    },
    canvasScale: {
        type: Number,
        default: 3
    },
    canvasPages: {
        type: Number,
        default: 1
    },
    brushColor: {
        type: String,
        default: null
    },
    items: {
        type: [{
            id: {
                type: String,
                required: false
            },
            type: {
                type: String,
                enum: ['photo', 'note', 'spotify', 'doodle', 'audio', 'media', 'gif', 'sticker', 'text', 'image'],
                required: false
            },
            position: {
                x: {
                    type: Number,
                    required: false
                },
                y: {
                    type: Number,
                    required: false
                }
            },
            zIndex: {
                type: Number,
                required: false
            },
            rotation: {
                type: Number,
                default: 0
            },
            data: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            }
        }],
        default: [],
        _id: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastModified: {
        type: Date,
        default: Date.now
    }
}, {
    strict: false
});

// Add indexes
paperSchema.index({ paperId: 1 });
paperSchema.index({ userId: 1 });
paperSchema.index({ createdAt: 1 });

// Add logging
paperSchema.pre('save', function (next) {
    try {
        console.log('Saving paper:', {
            paperId: this.paperId,
            userId: this.userId,
            itemCount: this.items?.length || 0,
            lastModified: this.lastModified
        });

        if (this.items && Array.isArray(this.items)) {
            let warningCount = 0;
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                if (!item) {
                    console.warn(`警告: 第 ${i} 项目为空`);
                    warningCount++;
                    continue;
                }

                if (!item.id) {
                    console.warn(`警告: 第 ${i} 项目缺少ID`);
                    warningCount++;
                }

                if (!item.type) {
                    console.warn(`警告: 项目 ${item.id || '未知'} 缺少类型`);
                    warningCount++;
                }

                if (!item.position || typeof item.position.x !== 'number' || typeof item.position.y !== 'number') {
                    console.warn(`警告: 项目 ${item.id || '未知'} 位置数据无效`, item.position);
                    // 尝试修复位置数据
                    if (item.position) {
                        item.position = {
                            x: typeof item.position.x === 'number' ? item.position.x : 0,
                            y: typeof item.position.y === 'number' ? item.position.y : 0
                        };
                        console.log(`修复了项目 ${item.id} 的位置: (${item.position.x}, ${item.position.y})`);
                    } else {
                        item.position = { x: 0, y: 0 };
                        console.log(`为项目 ${item.id} 创建了默认位置 (0, 0)`);
                    }
                    warningCount++;
                }

                if (typeof item.zIndex !== 'number') {
                    console.warn(`警告: 项目 ${item.id || '未知'} zIndex数据无效`, item.zIndex);
                    // 修复 zIndex
                    item.zIndex = typeof item.zIndex === 'number' ? item.zIndex : 10;
                    warningCount++;
                }
            }

            if (warningCount > 0) {
                console.warn(`共发现 ${warningCount} 个数据警告，但仍将继续保存`);
            }
        }

        next();
    } catch (error) {
        console.error('Paper pre-save validation error:', error);
        next();
    }
});

// 添加错误处理中间件
paperSchema.post('save', function (error: mongoose.CallbackError, doc: any, next: Function) {
    if (error) {
        console.error('保存Paper时出错:', {
            error: error.message,
            paperId: doc.paperId,
            errorName: error.name
        });

        // 处理特定错误
        if (error.name === 'ValidationError') {
            console.error('验证错误详情:', error);
        }

        // 检查是否有 MongoDB 特定的错误代码
        if ('code' in error) {
            console.error('MongoDB错误代码:', (error as any).code);
        }
    }
    next(error);
});

export const Paper = mongoose.model('Paper', paperSchema); 