"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"

interface GifContentProps {
    imageUrl: string
    isDragging?: boolean
    onDelete?: () => void
    sizeFactor?: number
    isSticker?: boolean
    forcedLoading?: boolean
}

export const GifContent: React.FC<GifContentProps> = ({
    imageUrl,
    isDragging = false,
    onDelete,
    sizeFactor,
    isSticker = false,
    forcedLoading = false,
}) => {
    // 对于直接从Giphy来的URL使用原始URL，否则使用提供的imageUrl
    const [displayUrl, setDisplayUrl] = useState(imageUrl)
    const [isLoading, setIsLoading] = useState(true)
    const [imageDimensions, setImageDimensions] = useState({ width: 300, height: 300 })
    // 使用小数精度跟踪加载时间（精确到0.1秒）
    const [loadingTime, setLoadingTime] = useState(0)

    // 判断是否为AI生成的图片 - 使用更精确的检测方法
    // 只有明确标记为加载中的AI图像才会被视为"isAiGenerated"
    const isAiGenerated = forcedLoading && (
        imageUrl.startsWith('ai-image-') ||
        (typeof imageUrl === 'string' && imageUrl.includes('/api/ai/'))
    )

    // 生成随机尺寸比例 - 使用props中的sizeFactor或生成新的随机值
    const [scale] = useState(() => sizeFactor || (0.85 + Math.random() * 0.3))

    // 计算实际尺寸
    const baseWidth = imageDimensions.width
    const baseHeight = imageDimensions.height
    const finalWidth = Math.round(baseWidth * scale)
    const finalHeight = Math.round(baseHeight * scale)

    // 如果URL是blob:开头，说明是本地文件URL；如果包含giphy.com，则是Giphy URL
    useEffect(() => {
        if (imageUrl.startsWith('blob:') || !imageUrl.includes('giphy.com')) {
            setDisplayUrl(imageUrl)
        } else {
            // 确保使用原始Giphy URL
            setDisplayUrl(imageUrl)
        }

        // 每次URL改变时，重置加载状态
        // 但如果URL是实际的图片URL(http/https)，且不是AI生成的临时URL，则设为false
        const isRealImageUrl = typeof imageUrl === 'string' && (
            imageUrl.startsWith('http://') ||
            imageUrl.startsWith('https://') ||
            imageUrl.startsWith('/upload/')
        ) && !imageUrl.startsWith('ai-image-');

        // 只有在forcedLoading为true时才强制显示加载状态
        if (forcedLoading) {
            setIsLoading(true);
        } else if (isRealImageUrl) {
            // 如果是实际图片URL且不是强制加载，则假定图片已就绪
            setIsLoading(false);
        } else {
            // 其他情况（如blob URL等）需要等待onLoad事件
            setIsLoading(true);
        }

        // 重置计时器
        setLoadingTime(0)

        // 预加载图片以获取其真实尺寸 - 确保只在客户端执行
        if (typeof window !== 'undefined') {
            const img = new window.Image()
            img.src = imageUrl
            img.onload = () => {
                // 使用真实尺寸，但设置最大尺寸为300px
                const maxDimension = 300
                let width = img.width
                let height = img.height

                // 按比例缩放至最大尺寸
                if (width > height && width > maxDimension) {
                    height = Math.round((height * maxDimension) / width)
                    width = maxDimension
                } else if (height > width && height > maxDimension) {
                    width = Math.round((width * maxDimension) / height)
                    height = maxDimension
                } else if (width > maxDimension) {
                    width = height = maxDimension
                }

                setImageDimensions({ width, height })

                // 当图片加载完成时，如果不是强制加载状态，则更新为非加载状态
                if (!forcedLoading) {
                    setIsLoading(false);
                }
            }
        }
    }, [imageUrl, forcedLoading])

    // 添加计时器效果 - 每100毫秒更新一次，以便精确到0.1秒
    // 仅在AI图像生成时启用计时器
    useEffect(() => {
        // 如果不是AI生成的图片或不是加载状态，不启动计时器
        if (!isAiGenerated || !isLoading) {
            return;
        }

        // 创建一个每100毫秒递增的计时器
        const timer = setInterval(() => {
            setLoadingTime(prevTime => prevTime + 0.1);
        }, 100);

        // 清理函数
        return () => {
            clearInterval(timer);
        };
    }, [isLoading, isAiGenerated]);

    // 格式化计时器显示 - 精确到一位小数
    const formattedTime = loadingTime.toFixed(1);

    // 判断是否应该显示计时器
    // 只有在AI生成图片且处于加载状态时才显示
    const shouldShowTimer = isAiGenerated && isLoading && loadingTime > 0;

    const handleImageLoad = () => {
        // 只有在非强制加载状态下才更新加载状态
        if (!forcedLoading) {
            setIsLoading(false);
        }
    }

    // 确定是否显示加载动画
    const showLoading = isLoading || forcedLoading;

    // 如果是贴纸，使用简化版本的渲染，没有边框和背景
    if (isSticker) {
        return (
            <div
                className={`transition-opacity duration-300 ${isDragging ? "opacity-90" : "opacity-100"}`}
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    cursor: isDragging ? "grabbing" : "grab"
                }}
            >
                <div className="relative" style={{ minWidth: "60px", minHeight: "60px" }}>
                    {/* 简单的贴纸容器 - 没有边框或背景 */}
                    <div className="relative">
                        {/* 删除按钮如果需要 */}
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="absolute top-0 right-0 z-10 bg-white bg-opacity-70 rounded-full p-1 shadow-md hover:bg-opacity-100 transition"
                            >
                                ✕
                            </button>
                        )}

                        {/* 加载指示器 */}
                        {showLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 border-4 border-gray-100 border-t-black rounded-full animate-spin mb-2"></div>
                                {/* 添加计时文本 - 英文，只在AI生图时显示 */}
                                {shouldShowTimer && (
                                    <div className="text-xs text-gray-600 bg-white bg-opacity-80 px-2 py-0.5 rounded font-mono">
                                        {formattedTime}s
                                    </div>
                                )}
                            </div>
                        )}

                        <Image
                            src={displayUrl}
                            alt="Sticker"
                            width={finalWidth}
                            height={finalHeight}
                            className="object-contain pointer-events-none"
                            style={{
                                width: `${finalWidth}px`,
                                height: `${finalHeight}px`,
                                opacity: showLoading ? 0 : 1,
                                transition: 'opacity 0.3s ease-in-out'
                            }}
                            unoptimized
                            priority
                            onLoad={handleImageLoad}
                            draggable={false}
                        />
                    </div>
                </div>
            </div>
        )
    }

    // 普通GIF的渲染，带有边框和背景
    return (
        <div
            className={`transition-shadow duration-300 rounded-lg overflow-hidden ${isDragging ? "shadow-2xl" : "shadow-md hover:shadow-xl"
                }`}
            style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center'
            }}
        >
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* GIF container with equal padding on all sides */}
                <div className="p-3 relative">
                    {/* Delete button if needed */}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="absolute top-2 right-2 z-10 bg-white bg-opacity-70 rounded-full p-1 shadow-md hover:bg-opacity-100 transition"
                        >
                            ✕
                        </button>
                    )}

                    {/* GIF image container with minimum dimensions */}
                    <div
                        className="relative rounded-md overflow-hidden flex items-center justify-center"
                        style={{
                            minWidth: `${Math.max(150, finalWidth * 0.7)}px`,
                            minHeight: `${Math.max(120, finalHeight * 0.7)}px`
                        }}
                    >
                        {/* Loading indicator - 使用黑色样式 */}
                        {showLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
                                <div className="w-8 h-8 border-4 border-gray-100 border-t-black rounded-full animate-spin mb-2"></div>
                                {/* 添加计时文本 - 英文，只在AI生图时显示 */}
                                {shouldShowTimer && (
                                    <div className="text-xs font-medium text-gray-600 bg-white bg-opacity-80 px-2.5 py-1 rounded font-mono">
                                        {formattedTime}s
                                    </div>
                                )}
                            </div>
                        )}

                        <Image
                            src={displayUrl}
                            alt="GIF"
                            width={finalWidth}
                            height={finalHeight}
                            className="object-contain"
                            style={{
                                width: `${finalWidth}px`,
                                height: `${finalHeight}px`,
                                opacity: showLoading ? 0 : 1,
                                transition: 'opacity 0.3s ease-in-out'
                            }}
                            unoptimized
                            priority
                            onLoad={handleImageLoad}
                            draggable={false}
                        />

                        {/* Subtle inner shadow for style */}
                        <div className="absolute inset-0 shadow-[inset_0_0_4px_rgba(0,0,0,0.1)] rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GifContent 