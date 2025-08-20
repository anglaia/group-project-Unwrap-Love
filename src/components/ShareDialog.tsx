import React, { useState, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
import EmailShareForm from './EmailShareForm';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/config/apiConfig';

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    shareUrl: string;
    paperId: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, shareUrl, paperId }) => {
    const [isCopied, setIsCopied] = useState(false);
    const { user } = useAuth();
    const [customRoute, setCustomRoute] = useState('');
    const [customShareUrl, setCustomShareUrl] = useState(shareUrl);
    const [error, setError] = useState('');

    useEffect(() => {
        // 重置自定义路由名称和错误信息
        setCustomRoute('');
        setCustomShareUrl(shareUrl);
        setError('');
    }, [isOpen, shareUrl]);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(customShareUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error('Copy failed:', error);
            alert('Copy failed, please try again');
        }
    };

    const handleCustomRouteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomRoute(value);

        // 验证输入值
        if (value.trim() === '') {
            setCustomShareUrl(shareUrl);
            setError('');
        } else if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
            setError('只能使用字母、数字、连字符和下划线');
        } else {
            setError('');
            // 生成新的分享URL
            const baseUrl = window.location.origin;
            setCustomShareUrl(`${baseUrl}/shared/${value}?id=${paperId}`);
        }
    };

    const handleCreateCustomLink = async () => {
        if (customRoute.trim() === '' || error) return;

        try {
            // 这里可以添加调用后端API创建自定义链接的逻辑
            // 例如: 将customRoute和paperId关联并存储到数据库
            const response = await fetch(getApiUrl('/api/shared-links'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customRoute,
                    paperId,
                    createdBy: user?.uid || 'anonymous'
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || '创建自定义链接失败');
            }

            // 创建成功后更新URL并提示用户
            alert('自定义链接创建成功！');
        } catch (err) {
            console.error('Failed to create custom link:', err);
            setError(err instanceof Error ? err.message : '创建自定义链接失败');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-semibold text-gray-900">分享你的Paper</h1>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 transition-all duration-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-2">创建自定义链接:</p>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">{window.location.origin}/shared/</span>
                                <input
                                    type="text"
                                    value={customRoute}
                                    onChange={handleCustomRouteChange}
                                    placeholder="my-awesome-paper"
                                    className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                                />
                                <button
                                    onClick={handleCreateCustomLink}
                                    disabled={!customRoute || !!error}
                                    className="p-2 bg-pink-500 text-white rounded-md text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    创建
                                </button>
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500 mb-2">分享此链接:</p>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="text"
                                value={customShareUrl}
                                readOnly
                                className="flex-1 bg-transparent text-sm text-gray-600 focus:outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="p-2 text-gray-500 hover:text-gray-700 transition-all duration-300 ease-in-out transform hover:scale-110"
                            >
                                {isCopied ? (
                                    <Check className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Copy className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">通过邮件发送</h2>
                        <EmailShareForm
                            shareUrl={customShareUrl}
                            senderName={user ? (user.displayName || user.email?.split('@')[0] || 'Anonymous') : 'Anonymous'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareDialog; 