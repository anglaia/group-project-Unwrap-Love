import { Request, Response } from 'express';
import SharedLink, { ISharedLink } from '../models/SharedLink';

// 创建新的共享链接
export const createSharedLink = async (req: Request, res: Response) => {
    try {
        const { customRoute, paperId, createdBy, expiresAt } = req.body;

        // 验证必要参数
        if (!customRoute || !paperId || !createdBy) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：customRoute, paperId, createdBy'
            });
        }

        // 验证自定义路由格式
        const routeRegex = /^[a-zA-Z0-9-_]+$/;
        if (!routeRegex.test(customRoute)) {
            return res.status(400).json({
                success: false,
                message: '自定义路由只能包含字母、数字、连字符和下划线'
            });
        }

        // 检查路由是否已存在
        const existingLink = await SharedLink.findOne({ customRoute });
        if (existingLink) {
            return res.status(409).json({
                success: false,
                message: '该自定义路由已被使用，请尝试其他名称'
            });
        }

        // 创建新的共享链接
        const sharedLink = new SharedLink({
            customRoute,
            paperId,
            createdBy,
            expiresAt: expiresAt || null
        });

        // 保存到数据库
        await sharedLink.save();

        return res.status(201).json({
            success: true,
            message: '共享链接创建成功',
            data: {
                customRoute: sharedLink.customRoute,
                paperId: sharedLink.paperId,
                createdAt: sharedLink.createdAt,
                expiresAt: sharedLink.expiresAt
            }
        });
    } catch (error) {
        console.error('创建共享链接失败:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误，创建共享链接失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};

// 通过自定义路由获取共享链接
export const getSharedLinkByRoute = async (req: Request, res: Response) => {
    try {
        const { customRoute } = req.params;

        // 验证参数
        if (!customRoute) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：customRoute'
            });
        }

        // 查找链接
        const sharedLink = await SharedLink.findOne({
            customRoute,
            isActive: true
        });

        // 如果找不到或已过期
        if (!sharedLink) {
            return res.status(404).json({
                success: false,
                message: '找不到该共享链接，可能已过期或被删除'
            });
        }

        // 检查是否过期
        if (sharedLink.expiresAt && new Date() > sharedLink.expiresAt) {
            // 如果已过期，设置为非活动状态并保存
            sharedLink.isActive = false;
            await sharedLink.save();

            return res.status(404).json({
                success: false,
                message: '共享链接已过期'
            });
        }

        // 返回共享链接信息
        return res.status(200).json({
            success: true,
            paperId: sharedLink.paperId,
            createdAt: sharedLink.createdAt,
            expiresAt: sharedLink.expiresAt
        });
    } catch (error) {
        console.error('获取共享链接失败:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误，获取共享链接失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};

// 获取用户创建的所有共享链接
export const getUserSharedLinks = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // 验证参数
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：userId'
            });
        }

        // 查找用户的所有共享链接
        const sharedLinks = await SharedLink.find({
            createdBy: userId,
            isActive: true
        }).sort({ createdAt: -1 }); // 按创建时间降序排列

        return res.status(200).json({
            success: true,
            count: sharedLinks.length,
            data: sharedLinks.map(link => ({
                customRoute: link.customRoute,
                paperId: link.paperId,
                createdAt: link.createdAt,
                expiresAt: link.expiresAt
            }))
        });
    } catch (error) {
        console.error('获取用户共享链接失败:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误，获取用户共享链接失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
};

// 删除共享链接
export const deleteSharedLink = async (req: Request, res: Response) => {
    try {
        const { customRoute } = req.params;
        const { userId } = req.body;

        // 验证参数
        if (!customRoute || !userId) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数：customRoute 或 userId'
            });
        }

        // 查找链接并验证所有权
        const sharedLink = await SharedLink.findOne({ customRoute });

        if (!sharedLink) {
            return res.status(404).json({
                success: false,
                message: '共享链接不存在'
            });
        }

        // 验证是否是链接创建者
        if (sharedLink.createdBy !== userId) {
            return res.status(403).json({
                success: false,
                message: '权限不足，只有创建者可以删除链接'
            });
        }

        // 软删除 - 设置为非活动状态
        sharedLink.isActive = false;
        await sharedLink.save();

        return res.status(200).json({
            success: true,
            message: '共享链接已成功删除'
        });
    } catch (error) {
        console.error('删除共享链接失败:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误，删除共享链接失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
}; 