import { Request, Response } from 'express';
import { Share } from '../models/Share';
import { v4 as uuidv4 } from 'uuid';

export const createShare = async (req: Request, res: Response) => {
    try {
        const { items, customPath, userName, backgroundImage, backgroundColor, showGrid, canvasScrollable, canvasScale } = req.body;
        console.log('Creating share with items:', JSON.stringify(items, null, 2));

        if (!items || !Array.isArray(items) || items.length === 0) {
            console.error('Invalid items data:', items);
            return res.status(400).json({ message: 'Invalid project data' });
        }

        // Validate custom path
        if (customPath) {
            if (!/^[a-zA-Z0-9-_]+$/.test(customPath) || customPath.length < 3) {
                return res.status(400).json({ message: 'Custom link can only contain letters, numbers, underscores and hyphens, and must be at least 3 characters long' });
            }

            // Check if custom path already exists
            const existingShare = await Share.findOne({ shareId: customPath });
            if (existingShare) {
                return res.status(400).json({ message: 'This custom link is already in use' });
            }
        }

        const shareId = customPath || uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires after 7 days

        const share = new Share({
            shareId,
            userName: userName || 'Anonymous',
            // 保存背景图片URL
            backgroundImage: backgroundImage || null,
            // 保存背景颜色
            backgroundColor: backgroundColor || null,
            // 保存网格显示设置
            showGrid: showGrid !== undefined ? showGrid : true,
            // 保存画布可滚动设置
            canvasScrollable: canvasScrollable !== undefined ? canvasScrollable : false,
            // 保存画布缩放比例
            canvasScale: canvasScale !== undefined ? canvasScale : 3,
            items: items.map(item => {
                // 创建新的处理后的item
                const processedItem = { ...item };

                // 处理特定类型的数据
                if (item.type === 'note') {
                    processedItem.data = {
                        ...item.data,
                        color: item.data.color || 'yellow',
                        content: item.data.content || '',
                        // 确保保存便签大小
                        noteSize: item.data.noteSize || { width: 'w-56', height: 'h-56' }
                    };
                } else if (item.type === 'photo') {
                    // 处理照片类型，确保保存缩放比例
                    processedItem.data = {
                        ...item.data,
                        scale: item.data.scale || 1.0
                    };
                } else if (item.type === 'audio') {
                    // 处理音频类型，确保保存波形颜色
                    processedItem.data = {
                        ...item.data,
                        waveColor: item.data.waveColor || '#ec4899'
                    };
                } else if (item.type === 'gif') {
                    // 特殊处理GIF类型
                    processedItem.data = {
                        ...item.data,
                        isGif: true,
                        originalGifUrl: item.data.originalGifUrl || item.data.imageUrl,
                        sizeFactor: item.data.sizeFactor || 1,
                        isSticker: item.data.isSticker
                    };
                } else {
                    // 其他类型保持不变
                    processedItem.data = { ...item.data };
                }

                return processedItem;
            }),
            expiresAt,
        });

        console.log('Saving share to database:', {
            shareId,
            userName: userName || 'Anonymous',
            backgroundImage: backgroundImage || null,
            backgroundColor: backgroundColor || null,
            showGrid: showGrid !== undefined ? showGrid : true,
            itemCount: items.length,
            items: items.map(item => ({
                type: item.type,
                data: item.data
            })),
            expiresAt
        });

        await share.save();
        console.log('Share saved successfully:', shareId);
        res.status(201).json({ shareId });
    } catch (error: any) {
        console.error('Failed to create share:', error);
        res.status(500).json({ message: 'Failed to create share', error: error.message });
    }
};

export const getShare = async (req: Request, res: Response) => {
    try {
        const { shareId } = req.params;
        console.log('Fetching share:', shareId);

        const share = await Share.findOne({ shareId });
        console.log('Share found:', share ? 'yes' : 'no');

        if (!share) {
            console.log('Share not found:', shareId);
            return res.status(404).json({ message: 'Share does not exist' });
        }

        if (new Date() > share.expiresAt) {
            console.log('Share expired:', shareId);
            await Share.deleteOne({ shareId });
            return res.status(404).json({ message: 'Share has expired' });
        }

        console.log('Returning share data:', {
            shareId,
            userName: share.userName,
            backgroundImage: share.backgroundImage,
            backgroundColor: share.backgroundColor,
            showGrid: share.showGrid,
            itemCount: share.items.length,
            items: share.items.map(item => ({
                type: item.type,
                data: item.data
            }))
        });

        res.json({
            share: {
                items: share.items,
                userName: share.userName || 'Anonymous',
                backgroundImage: share.backgroundImage,
                backgroundColor: share.backgroundColor,
                showGrid: share.showGrid,
                canvasScrollable: share.canvasScrollable,
                canvasScale: share.canvasScale
            }
        });
    } catch (error: any) {
        console.error('Failed to retrieve share:', error);
        res.status(500).json({ message: 'Failed to retrieve share', error: error.message });
    }
}; 