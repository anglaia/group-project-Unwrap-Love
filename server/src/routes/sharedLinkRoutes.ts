import express from 'express';
import {
    createSharedLink,
    getSharedLinkByRoute,
    getUserSharedLinks,
    deleteSharedLink
} from '../controllers/sharedLinkController';

const router = express.Router();

// 创建新的共享链接
router.post('/', createSharedLink);

// 通过自定义路由获取共享链接
router.get('/by-route/:customRoute', getSharedLinkByRoute);

// 获取用户创建的所有共享链接
router.get('/user/:userId', getUserSharedLinks);

// 删除共享链接
router.delete('/:customRoute', deleteSharedLink);

export default router; 