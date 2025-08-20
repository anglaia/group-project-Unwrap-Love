import mongoose from 'mongoose';

const moodboardHistorySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    roomId: {
        type: String,
        required: true,
        index: true
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
    items: {
        type: [{
            id: String,
            type: {
                type: String,
                enum: ['photo', 'note', 'spotify', 'doodle', 'audio', 'media', 'gif']
            },
            position: {
                x: Number,
                y: Number
            },
            zIndex: Number,
            rotation: Number,
            data: {
                imageUrl: String,
                dateTaken: String,
                color: {
                    type: String,
                    default: 'yellow'
                },
                content: {
                    type: String,
                    default: ''
                },
                audioUrl: String,
                spotifyUrl: String,
                svgData: String,
                isGif: Boolean,
                originalGifUrl: String,
                sizeFactor: Number,
                isSticker: Boolean,
                waveColor: String,
                noteSize: {
                    width: String,
                    height: String
                },
                scale: Number,
                isBase64Audio: Boolean,
                originalBlobUrl: String
            }
        }],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 复合索引，根据房间ID和日期查询
moodboardHistorySchema.index({ roomId: 1, date: 1 }, { unique: true });

// 日志记录
moodboardHistorySchema.pre('save', function (next) {
    console.log('保存历史Moodboard:', {
        date: this.date,
        roomId: this.roomId,
        itemCount: this.items.length
    });
    next();
});

export const MoodboardHistory = mongoose.model('MoodboardHistory', moodboardHistorySchema); 