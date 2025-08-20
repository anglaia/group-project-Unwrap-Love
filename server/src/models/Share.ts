import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
    shareId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        validate: {
            validator: function (v: string) {
                return /^[a-zA-Z0-9-_]+$/.test(v) && v.length >= 3;
            },
            message: 'Share ID can only contain letters, numbers, underscores and hyphens, and must be at least 3 characters long'
        }
    },
    userName: {
        type: String,
        default: 'Anonymous'
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
                aiImages: {
                    type: [{
                        url: String,
                        style: String,
                        createdAt: {
                            type: Date,
                            default: Date.now
                        }
                    }],
                    default: []
                }
            }
        }],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    }
});

// Add indexes
shareSchema.index({ shareId: 1 });
shareSchema.index({ createdAt: 1 });
shareSchema.index({ expiresAt: 1 });

// Add logging
shareSchema.pre('save', function (next) {
    console.log('Saving share:', {
        shareId: this.shareId,
        itemCount: this.items.length,
        items: this.items.map(item => ({
            type: item.type,
            data: item.data
        })),
        createdAt: this.createdAt,
        expiresAt: this.expiresAt
    });
    next();
});

export const Share = mongoose.model('Share', shareSchema); 