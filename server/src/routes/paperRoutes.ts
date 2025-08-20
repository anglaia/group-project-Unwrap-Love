import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Paper } from '../models/Paper';
import SharedLink from '../models/SharedLink';

const router = express.Router();

// 获取用户的所有paper
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // 查找指定用户的所有paper，按最后修改时间排序
        const papers = await Paper.find({ userId })
            .select('paperId title createdAt lastModified')
            .sort({ lastModified: -1 });

        return res.status(200).json({
            success: true,
            data: papers
        });
    } catch (error) {
        console.error('Failed to get user papers:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get papers'
        });
    }
});

// 获取特定paper
router.get('/:paperId', async (req, res) => {
    try {
        const { paperId } = req.params;

        // 查找指定ID的paper
        const paper = await Paper.findOne({ paperId });

        if (!paper) {
            return res.status(404).json({
                success: false,
                message: 'Paper not found'
            });
        }

        return res.status(200).json(paper);
    } catch (error) {
        console.error('Failed to get paper:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get paper'
        });
    }
});

// 创建新paper
router.post('/', async (req, res) => {
    try {
        const { userId, userName, items, backgroundImage, backgroundColor, showGrid, canvasScrollable, canvasScale, canvasPages, brushColor } = req.body;

        // 必须提供userId
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // 生成唯一ID
        const paperId = uuidv4();

        // 创建新的paper
        const newPaper = new Paper({
            paperId,
            userId,
            userName: userName || 'Anonymous',
            title: 'Untitled Paper',
            items: items || [],
            backgroundImage,
            backgroundColor,
            showGrid: showGrid !== undefined ? showGrid : true,
            canvasScrollable: canvasScrollable || false,
            canvasScale: canvasScale || 3,
            canvasPages: canvasPages || 1,
            brushColor: brushColor || null,
            createdAt: new Date(),
            lastModified: new Date()
        });

        // 保存到数据库
        await newPaper.save();

        return res.status(201).json({
            success: true,
            paperId,
            message: 'Paper created successfully'
        });
    } catch (error) {
        console.error('Failed to create paper:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create paper'
        });
    }
});

// 更新paper
router.put('/:paperId', async (req, res) => {
    try {
        const { paperId } = req.params;
        const {
            userId,
            items,
            backgroundImage,
            backgroundColor,
            showGrid,
            canvasScrollable,
            canvasScale,
            canvasPages,
            brushColor,
            title,
            isHistoryOperation,
            historyAction,
            historyIndex
        } = req.body;

        // 查找指定ID的paper
        const paper = await Paper.findOne({ paperId });

        if (!paper) {
            return res.status(404).json({
                success: false,
                message: 'Paper not found'
            });
        }

        // 确保只有paper的拥有者才能更新
        if (paper.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this paper'
            });
        }

        // 如果是历史操作（撤销/重做），记录日志
        if (isHistoryOperation) {
            console.log(`执行历史操作: ${historyAction}, 索引: ${historyIndex}, 项目数量: ${items?.length || 0}`);
        }

        // 更新paper
        paper.items = items || paper.items;
        paper.backgroundImage = backgroundImage !== undefined ? backgroundImage : paper.backgroundImage;
        paper.backgroundColor = backgroundColor !== undefined ? backgroundColor : paper.backgroundColor;
        paper.showGrid = showGrid !== undefined ? showGrid : paper.showGrid;
        paper.canvasScrollable = canvasScrollable !== undefined ? canvasScrollable : paper.canvasScrollable;
        paper.canvasScale = canvasScale !== undefined ? canvasScale : paper.canvasScale;
        paper.canvasPages = canvasPages !== undefined ? canvasPages : paper.canvasPages;
        paper.brushColor = brushColor !== undefined ? brushColor : paper.brushColor;
        paper.title = title || paper.title;
        paper.lastModified = new Date();

        await paper.save();

        return res.status(200).json({
            success: true,
            message: isHistoryOperation
                ? `Paper updated successfully with ${historyAction} operation`
                : 'Paper updated successfully'
        });
    } catch (error) {
        console.error('Failed to update paper:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update paper'
        });
    }
});

// 删除paper
router.delete('/:paperId', async (req, res) => {
    try {
        const { paperId } = req.params;
        const { userId } = req.body;

        // 查找指定ID的paper
        const paper = await Paper.findOne({ paperId });

        if (!paper) {
            return res.status(404).json({
                success: false,
                message: 'Paper not found'
            });
        }

        // 确保只有paper的拥有者才能删除
        if (userId && paper.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this paper'
            });
        }

        // 删除paper
        await Paper.deleteOne({ paperId });

        return res.status(200).json({
            success: true,
            message: 'Paper deleted successfully'
        });
    } catch (error) {
        console.error('Failed to delete paper:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete paper'
        });
    }
});

// 更新paper - 项目增量更新（添加、修改、删除）
router.patch('/:paperId/items', async (req, res) => {
    try {
        console.log('收到PATCH请求，更新paper项目');
        const { paperId } = req.params;
        const { newItems, deletedItemIds, lastModified, userId } = req.body;

        // 添加详细请求体调试日志
        console.log('请求详情:', {
            paperId,
            userId,
            requestPath: req.path,
            requestMethod: req.method,
            contentType: req.get('Content-Type')
        });

        // 打印请求体，但避免日志过大
        console.log('请求体摘要:', {
            newItemsCount: newItems?.length,
            deletedItemsCount: deletedItemIds?.length,
            hasLastModified: !!lastModified,
            hasUserId: !!userId
        });

        // 如果有newItems，打印每个项目的详细信息
        if (newItems && newItems.length > 0) {
            console.log('请求中的全部项目:');
            newItems.forEach((item: any, index: number) => {
                console.log(`项目[${index}]:`, {
                    id: item.id,
                    type: item.type,
                    position: item.position ? `(${item.position.x}, ${item.position.y})` : 'undefined',
                    zIndex: item.zIndex,
                    rotation: item.rotation,
                    hasData: !!item.data,
                    dataKeys: item.data ? Object.keys(item.data) : []
                });
            });
        }

        // 放宽检查条件，只需要有一个有效的操作
        const hasNewItems = newItems && Array.isArray(newItems) && newItems.length > 0;
        const hasDeletedItems = deletedItemIds && Array.isArray(deletedItemIds) && deletedItemIds.length > 0;

        if (!hasNewItems && !hasDeletedItems) {
            return res.status(400).json({
                success: false,
                message: 'Either new items or deleted item IDs are required and must be arrays'
            });
        }

        // 查找指定ID的paper
        const paper = await Paper.findOne({ paperId });

        if (!paper) {
            return res.status(404).json({
                success: false,
                message: 'Paper not found'
            });
        }

        // 确保只有paper的拥有者才能更新
        if (paper.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this paper'
            });
        }

        // 创建项目ID索引，用于快速查找
        const existingIds = new Map();
        for (let i = 0; i < paper.items.length; i++) {
            if (paper.items[i] && paper.items[i].id) {
                existingIds.set(paper.items[i].id, i);
            }
        }

        const itemsToAdd = [];

        // 处理新项目
        if (hasNewItems) {
            console.log('处理新项目...');

            for (const newItem of newItems) {
                try {
                    // 基本验证
                    if (!newItem) {
                        console.warn('跳过空项目');
                        continue;
                    }

                    if (!newItem.id) {
                        console.warn('跳过无ID项目');
                        continue;
                    }

                    console.log(`处理项目: ${newItem.id}, 类型: ${newItem.type || '未知'}`);

                    const existingIndex = existingIds.get(newItem.id);
                    const itemExists = existingIndex !== undefined;

                    if (itemExists) {
                        // 更新现有项目
                        console.log(`更新现有项目索引 ${existingIndex}, ID: ${newItem.id}`);

                        const currentItem = paper.items[existingIndex];

                        // 保存更新前的原始值用于对比
                        const originalValues = {
                            position: currentItem.position ? { ...currentItem.position } : { x: 0, y: 0 },
                            zIndex: currentItem.zIndex,
                            rotation: currentItem.rotation
                        };

                        // 更新位置 (如果有效)
                        if (newItem.position) {
                            // 确保 position 对象存在
                            if (!currentItem.position) {
                                currentItem.position = { x: 0, y: 0 };
                            }

                            // 检查是否来自直接位置更新 (可能是拖拽结束后的单一更新)
                            const isDirectPositionUpdate = newItems.length === 1 && !deletedItemIds?.length;
                            if (isDirectPositionUpdate) {
                                console.log(`检测到单一项目位置更新请求，可能是拖拽操作`);
                            }

                            // 更详细的位置更新日志
                            console.log(`更新项目 ${newItem.id} 位置:`, {
                                原位置: `(${currentItem.position.x}, ${currentItem.position.y})`,
                                新位置: `(${newItem.position.x}, ${newItem.position.y})`,
                                x类型: typeof newItem.position.x,
                                y类型: typeof newItem.position.y,
                                x有效: typeof newItem.position.x === 'number' && !isNaN(newItem.position.x),
                                y有效: typeof newItem.position.y === 'number' && !isNaN(newItem.position.y),
                                直接更新: isDirectPositionUpdate
                            });

                            // 对位置对象进行深复制，避免引用问题 - 拖拽操作强制更新位置
                            currentItem.position = {
                                x: typeof newItem.position.x === 'number' && !isNaN(newItem.position.x) ?
                                    newItem.position.x : currentItem.position.x || 0,
                                y: typeof newItem.position.y === 'number' && !isNaN(newItem.position.y) ?
                                    newItem.position.y : currentItem.position.y || 0
                            };

                            // 验证更新后的位置
                            console.log(`位置更新完成, 项目 ${newItem.id} 的当前位置:`, currentItem.position);
                        }

                        // 更新 zIndex (如果有效)
                        if (typeof newItem.zIndex === 'number') {
                            currentItem.zIndex = newItem.zIndex;
                        }

                        // 更新 rotation (如果有效)
                        if (typeof newItem.rotation === 'number') {
                            currentItem.rotation = newItem.rotation;
                        }

                        // 更新数据字段 (如果有效)
                        if (newItem.data) {
                            currentItem.data = {
                                ...(currentItem.data || {}),
                                ...newItem.data
                            };
                        }
                    } else {
                        // 添加新项目到列表
                        console.log(`添加新项目: ${newItem.id}, 类型: ${newItem.type || '未知'}`);

                        // 确保新项目结构合理
                        const validatedItem = {
                            id: newItem.id,
                            type: newItem.type || 'unknown',
                            position: {
                                x: typeof newItem.position?.x === 'number' ? newItem.position.x : 0,
                                y: typeof newItem.position?.y === 'number' ? newItem.position.y : 0
                            },
                            zIndex: typeof newItem.zIndex === 'number' ? newItem.zIndex : 0,
                            rotation: typeof newItem.rotation === 'number' ? newItem.rotation : 0,
                            data: newItem.data || {}
                        };

                        itemsToAdd.push(validatedItem);
                    }
                } catch (itemError) {
                    console.error(`处理项目错误 (ID: ${newItem?.id}):`, itemError);
                }
            }
        }

        // 处理删除项目
        if (hasDeletedItems) {
            console.log(`准备删除 ${deletedItemIds.length} 个项目`);
            const beforeCount = paper.items.length;

            // 使用过滤来移除要删除的项目
            paper.items = paper.items.filter(item => {
                return item && item.id && !deletedItemIds.includes(item.id);
            });

            const afterCount = paper.items.length;
            console.log(`已删除 ${beforeCount - afterCount} 个项目`);
        }

        // 添加新项目
        if (itemsToAdd.length > 0) {
            console.log(`添加 ${itemsToAdd.length} 个新项目`);
            paper.items = paper.items.concat(itemsToAdd);
        }

        // 更新最后修改时间
        if (lastModified) {
            try {
                paper.lastModified = new Date(lastModified);
            } catch (e) {
                paper.lastModified = new Date();
            }
        } else {
            paper.lastModified = new Date();
        }

        // 保存前进行数据完整性检查
        const validItems = paper.items.filter(item => item && item.id);
        if (validItems.length !== paper.items.length) {
            console.warn(`修复了 ${paper.items.length - validItems.length} 个无效项目`);
            paper.items = validItems;
        }

        console.log(`准备保存 paper，共 ${paper.items.length} 个项目`);

        // 打印部分项目示例以便调试 (避免日志过大)
        if (paper.items.length > 0) {
            const sampleItems = paper.items.slice(0, Math.min(3, paper.items.length));
            console.log('保存前的项目示例:');
            sampleItems.forEach((item, index) => {
                console.log(`项目[${index}] ID:${item.id}, 类型:${item.type}, 位置:(${item.position?.x},${item.position?.y}), 旋转:${item.rotation}`);
            });
        }

        const saveResult = await paper.save();

        // 确认保存成功后验证几个项目的位置数据
        try {
            if (saveResult && saveResult.items && saveResult.items.length > 0) {
                const verifyItems = saveResult.items.slice(0, Math.min(3, saveResult.items.length));
                console.log('验证保存后的项目位置:');
                verifyItems.forEach((item, index) => {
                    if (item && item.position) {
                        console.log(`保存后的项目[${index}] ID:${item.id}, 位置:(${item.position.x},${item.position.y})`);
                    }
                });
            }
        } catch (verifyError) {
            console.error('验证保存结果时出错:', verifyError);
        }

        console.log('保存成功');

        // 如果是单一项目位置更新，返回更新后的项目供客户端确认
        const isSingleItemUpdate = newItems && newItems.length === 1 && !deletedItemIds?.length;
        let updatedItem = null;

        if (isSingleItemUpdate && newItems[0] && newItems[0].id) {
            const updatedItemId = newItems[0].id;
            // 在保存后的数据中查找该项目
            updatedItem = paper.items.find(item => item.id === updatedItemId);

            if (updatedItem) {
                console.log(`返回已更新项目 ${updatedItemId} 的最终位置:`, updatedItem.position);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Paper items updated successfully',
            itemCount: paper.items.length,
            updatedItems: isSingleItemUpdate && updatedItem ? [updatedItem] : undefined
        });
    } catch (error) {
        console.error('更新paper项目失败，详细错误:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update paper items'
        });
    }
});

// 更新paper - 仅更新设置（增量更新）- 支持背景和颜色变化
router.patch('/:paperId/settings', async (req, res) => {
    try {
        const { paperId } = req.params;
        const {
            backgroundImage,
            backgroundColor,
            showGrid,
            canvasScrollable,
            canvasScale,
            canvasPages,
            brushColor,
            lastModified,
            userId,
            applyFromHistoryIndex // 用于撤销/重做操作的历史索引
        } = req.body;

        // 查找指定ID的paper
        const paper = await Paper.findOne({ paperId });

        if (!paper) {
            return res.status(404).json({
                success: false,
                message: 'Paper not found'
            });
        }

        // 确保只有paper的拥有者才能更新
        if (paper.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this paper'
            });
        }

        console.log('设置更新请求:', {
            backgroundImageChanged: backgroundImage !== undefined,
            backgroundColorChanged: backgroundColor !== undefined,
            showGridChanged: showGrid !== undefined,
            canvasScrollableChanged: canvasScrollable !== undefined,
            canvasScaleChanged: canvasScale !== undefined,
            canvasPagesChanged: canvasPages !== undefined,
            brushColorChanged: brushColor !== undefined,
            historyIndexApplied: applyFromHistoryIndex
        });

        // 更新设置字段
        if (backgroundImage !== undefined) paper.backgroundImage = backgroundImage;
        if (backgroundColor !== undefined) paper.backgroundColor = backgroundColor;
        if (showGrid !== undefined) paper.showGrid = showGrid;
        if (canvasScrollable !== undefined) paper.canvasScrollable = canvasScrollable;
        if (canvasScale !== undefined) paper.canvasScale = canvasScale;
        if (canvasPages !== undefined) paper.canvasPages = canvasPages;
        if (brushColor !== undefined) paper.brushColor = brushColor;

        // 更新最后修改时间
        if (lastModified) {
            paper.lastModified = new Date(lastModified);
        } else {
            paper.lastModified = new Date();
        }

        await paper.save();

        return res.status(200).json({
            success: true,
            message: 'Paper settings updated successfully'
        });
    } catch (error) {
        console.error('Failed to update paper settings:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update paper settings'
        });
    }
});

// 分享paper - 创建自定义分享链接
router.post('/:paperId/share', async (req, res) => {
    try {
        const { paperId } = req.params;
        const { sharePath } = req.body;

        // 查找指定ID的paper
        const paper = await Paper.findOne({ paperId });

        if (!paper) {
            return res.status(404).json({
                success: false,
                message: 'Paper not found'
            });
        }

        // 检查是否已存在该paper的分享链接
        const existingLink = await SharedLink.findOne({ paperId });

        if (existingLink) {
            // 如果已存在并且要更新路径
            if (sharePath && existingLink.customRoute !== sharePath) {
                // 检查新路径是否已被使用
                const pathExists = await SharedLink.findOne({ customRoute: sharePath });
                if (pathExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'Custom route already in use'
                    });
                }

                // 更新路径
                existingLink.customRoute = sharePath;
                await existingLink.save();

                return res.status(200).json({
                    success: true,
                    message: 'Share link updated',
                    sharePath: existingLink.customRoute
                });
            }

            // 返回现有链接
            return res.status(200).json({
                success: true,
                message: 'Share link already exists',
                sharePath: existingLink.customRoute
            });
        }

        // 创建新的分享链接
        const newSharedLink = new SharedLink({
            customRoute: sharePath,
            paperId,
            createdBy: paper.userId,
            isActive: true
        });

        await newSharedLink.save();

        return res.status(201).json({
            success: true,
            message: 'Share link created',
            sharePath: newSharedLink.customRoute
        });
    } catch (error) {
        console.error('Failed to share paper:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to share paper'
        });
    }
});

export default router; 