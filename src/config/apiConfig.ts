// API Configuration for different environments

// 检测当前环境
const isClient = typeof window !== 'undefined';
const hostname = isClient ? window.location.hostname : '';

// 检查当前环境和主机名，确定正确的API URL
const getEnvironmentBaseUrl = () => {
    // 如果设置了环境变量，优先使用
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // 生产环境
    if (process.env.NODE_ENV === 'production') {
        if (hostname === 'unwrap.love' || hostname === 'www.unwrap.love' ||
            hostname === 'unwraplove.app' || hostname === 'www.unwraplove.app') {
            return 'https://unwraplove-production.up.railway.app';
        }
        return 'https://unwraplove-production.up.railway.app';
    }

    // 开发环境 - 确保使用正确的端口
    // 检测客户端当前访问的URL，如果是3001端口，则服务器可能是5001
    if (isClient && window.location.port === '3001') {
        return 'http://localhost:5001';
    }

    // 默认开发环境端口
    return 'http://localhost:5001';
};

// 默认API基础URL
export const API_BASE_URL = isClient ? getEnvironmentBaseUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001');

// Helper function to get full API URL with proper error handling
export const getApiUrl = (path: string): string => {
    try {
        console.log('Constructing API URL for path:', path);
        // Make sure path starts with a slash if not already
        const formattedPath = path.startsWith('/') ? path : `/${path}`;
        const fullUrl = `${API_BASE_URL}${formattedPath}`;
        console.log('Full API URL:', fullUrl);
        return fullUrl;
    } catch (error) {
        console.error('Error generating API URL:', error);
        // 返回一个默认的备用URL
        return `http://localhost:5001${path.startsWith('/') ? path : `/${path}`}`;
    }
};

// Helper to check if we're in production environment
export const isProduction = process.env.NODE_ENV === 'production';

// For image URLs - converts relative paths to full URLs
export const getImageUrl = (url: string): string => {
    if (!url) return '';
    try {
        // 如果已经是完整URL或者数据URL，直接返回
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
            return url;
        }

        // 确保图片从 /upload/userImage/ 路径获取
        if (!url.startsWith('/upload/userImage/')) {
            url = `/upload/userImage/${url}`;
        }

        // 处理相对路径 - 确保它们前面有斜杠
        const path = url.startsWith('/') ? url : `/${url}`;
        // 返回完整的API URL
        return `${API_BASE_URL}${path}`;
    } catch (error) {
        console.error('Error generating image URL:', error);
        return url;
    }
}; 