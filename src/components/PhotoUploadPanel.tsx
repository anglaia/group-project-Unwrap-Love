import React, { useState, useRef, useEffect } from "react"
import { Sparkles, Upload, Loader2, ImageIcon, Cat, Search, Sticker, CornerDownLeft } from "lucide-react"
import { GiphyFetch } from "@giphy/js-fetch-api"
import { Grid } from "@giphy/react-components"
import axios from "axios"
import { usePathname } from "next/navigation"
import { getApiUrl } from '@/config/apiConfig'

interface PhotoUploadPanelProps {
    onSave: (file: File) => void
    onCancel: () => void
    onSaveGif?: (file: File, originalUrl: string, isSticker?: boolean, isLoading?: boolean) => void
}

// Initialize Giphy client with API key
const giphyFetch = new GiphyFetch("fJebUtjZPZza308n0YOvQQe0xiB8yn0N")

// 缓存已下载的GIF，避免重复下载
const gifCache = new Map<string, Blob>()

// 本地存储键名
const ACTIVE_TAB_STORAGE_KEY = 'photoUploadPanel_activeTab'

export const PhotoUploadPanel: React.FC<PhotoUploadPanelProps> = ({
    onSave,
    onCancel,
    onSaveGif = onSave // Default to onSave if onSaveGif not provided
}) => {
    // Get current pathname to check which route we're on
    const pathname = usePathname()
    const showAiGenerator = pathname?.includes('/paper') || pathname?.includes('/moodboard')
    // 判断是否在paper页面上 - 用于控制WebSocket行为
    const isOnPaperPage = pathname?.includes('/paper') && !pathname?.includes('/moodboard')

    // Add CSS to ensure Giphy grid items show pointer cursor
    useEffect(() => {
        // Add style for Giphy grid items
        const style = document.createElement('style')
        style.innerHTML = `
            .giphy-gif-img, .giphy-gif {
                cursor: pointer !important;
            }
        `
        document.head.appendChild(style)

        return () => {
            document.head.removeChild(style)
        }
    }, [])

    // 从localStorage读取上次的选项卡，如果没有则默认为'upload'
    const getInitialTab = (): 'upload' | 'search' | 'sticker' | 'generate' => {
        try {
            const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)
            const savedTabValue = savedTab as 'upload' | 'search' | 'sticker' | 'generate'

            // Don't load 'generate' tab if we're not on a route that supports it
            if (savedTabValue === 'generate' && !(pathname?.includes('/paper') || pathname?.includes('/moodboard'))) {
                return 'upload'
            }

            return savedTabValue || 'upload'
        } catch (error) {
            console.error('Failed to get saved tab:', error)
            return 'search'
        }
    }

    const [activeTab, setActiveTab] = useState<'upload' | 'search' | 'sticker' | 'generate'>(getInitialTab)
    const panelRef = useRef<HTMLDivElement>(null)
    const gridContainerRef = useRef<HTMLDivElement>(null)
    const stickerGridContainerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [stickerSearchQuery, setStickerSearchQuery] = useState<string>("")
    const [selectedGif, setSelectedGif] = useState<string | null>(null)
    const [gridWidth, setGridWidth] = useState(600) // Default width
    const [isProcessing, setIsProcessing] = useState(false) // 添加加载状态
    const [isDragging, setIsDragging] = useState(false) // 拖拽状态
    const [previewImage, setPreviewImage] = useState<string | null>(null) // 预览图片
    const [uploadError, setUploadError] = useState<string | null>(null) // 上传错误信息

    // 文生图相关状态
    const [prompt, setPrompt] = useState<string>("")
    const [generationError, setGenerationError] = useState<string | null>(null)

    // 监听activeTab变化，保存到localStorage
    useEffect(() => {
        try {
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab)
        } catch (error) {
            console.error('Failed to save active tab:', error)
        }
    }, [activeTab])

    // If we're on a route where AI Generator shouldn't show, and it's selected, change to upload tab
    useEffect(() => {
        if (!showAiGenerator && activeTab === 'generate') {
            setActiveTab('upload')
        }
    }, [pathname, showAiGenerator, activeTab])

    // Handle clicks outside the panel
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onCancel()
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [onCancel])

    // Update grid width based on container size
    useEffect(() => {
        const updateGridWidth = () => {
            if (gridContainerRef.current) {
                const containerWidth = gridContainerRef.current.clientWidth
                setGridWidth(containerWidth - 20) // Subtract padding
            }
            if (stickerGridContainerRef.current) {
                const containerWidth = stickerGridContainerRef.current.clientWidth
                setGridWidth(containerWidth - 20) // Subtract padding
            }
        }

        // Initial measurement
        updateGridWidth()

        // Update on resize
        window.addEventListener('resize', updateGridWidth)
        return () => window.removeEventListener('resize', updateGridWidth)
    }, [activeTab])

    // 修改setActiveTab的方式，包装在函数中以便保存到localStorage
    const handleTabChange = (tab: 'upload' | 'search' | 'sticker' | 'generate') => {
        setActiveTab(tab)
        // 切换到上传标签时清除预览和错误信息
        if (tab === 'upload') {
            setPreviewImage(null)
            setUploadError(null)
        }
    }

    // Handle Giphy search
    const fetchGifs = (offset: number) => {
        return searchQuery
            ? giphyFetch.search(searchQuery, { offset, limit: 20, type: 'gifs' })
            : giphyFetch.trending({ offset, limit: 20, type: 'gifs' })
    }

    // Handle Giphy stickers search
    const fetchStickers = (offset: number) => {
        return stickerSearchQuery
            ? giphyFetch.search(stickerSearchQuery, { offset, limit: 20, type: 'stickers' })
            : giphyFetch.trending({ offset, limit: 20, type: 'stickers' })
    }

    // 获取GIF Blob，先从缓存中查找，没有则下载
    const getGifBlob = async (url: string): Promise<Blob> => {
        // 如果缓存中有，直接返回
        if (gifCache.has(url)) {
            return gifCache.get(url)!
        }

        // 否则下载
        const response = await fetch(url)
        const blob = await response.blob()

        // 添加到缓存
        gifCache.set(url, blob)
        return blob
    }

    // Handle selection of a sticker - 直接放到画布上，无边框和背景
    const handleStickerSelect = async (sticker: any) => {
        if (isProcessing) return // 防止重复点击

        try {
            setIsProcessing(true)
            const stickerUrl = sticker.images.original.url
            setSelectedGif(stickerUrl)  // 重用selectedGif状态

            // 创建一个空File对象作为占位符
            const placeholderFile = new File([new Blob()], `giphy-sticker-${sticker.id}.gif`, { type: 'image/gif' })

            // 立即调用onSaveGif，但添加标记表明这是贴纸，不需要边框
            onSaveGif(placeholderFile, stickerUrl, true, false)  // 添加第四个参数false表示这不是加载状态

            // 关闭面板，给用户即时反馈
            onCancel()

            // 在后台下载实际的贴纸
            getGifBlob(stickerUrl).catch(error => {
                console.error("Failed to download sticker in background:", error)
            })
        } catch (error) {
            console.error("Failed to process sticker:", error)
        } finally {
            setIsProcessing(false)
        }
    }

    // Handle selection of a GIF - 修改为立即使用原始URL并在后台下载
    const handleGifSelect = async (gif: any) => {
        if (isProcessing) return // 防止重复点击

        try {
            setIsProcessing(true)
            const gifUrl = gif.images.original.url
            setSelectedGif(gifUrl)

            // 创建一个空File对象作为占位符
            const placeholderFile = new File([new Blob()], `giphy-${gif.id}.gif`, { type: 'image/gif' })

            // 立即调用onSaveGif，传递原始URL，不等待下载
            onSaveGif(placeholderFile, gifUrl, false, false)  // 添加第四个参数false表示这不是加载状态

            // 关闭面板，给用户即时反馈
            onCancel()

            // 在后台下载实际的GIF
            getGifBlob(gifUrl).catch(error => {
                console.error("Failed to download GIF in background:", error)
            })
        } catch (error) {
            console.error("Failed to process GIF:", error)
        } finally {
            setIsProcessing(false)
        }
    }

    // 处理图片文件上传
    const handleFileUpload = (file: File) => {
        // 验证文件类型
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!validTypes.includes(file.type)) {
            setUploadError('Invalid file type. Please upload JPG, PNG, GIF, or WebP images.')
            return
        }

        // 验证文件大小 (限制为10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            setUploadError('File is too large. Maximum size is 10MB.')
            return
        }

        setUploadError(null)

        // 创建预览
        const reader = new FileReader()
        reader.onload = (e) => {
            setPreviewImage(e.target?.result as string)
        }
        reader.readAsDataURL(file)

        // 将图片保存到画布
        onSave(file)

        // 关闭面板
        onCancel()
    }

    // 处理文件选择按钮点击
    const handleBrowseClick = () => {
        fileInputRef.current?.click()
    }

    // 处理文件选择事件
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            handleFileUpload(files[0])
        }
    }

    // 处理拖拽事件
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            handleFileUpload(files[0])
        }
    }

    // 生成AI图像并直接放入画布
    const handleGenerateImage = async () => {
        if (!prompt.trim() || isProcessing) return

        // 创建一个唯一ID，用于跟踪这个特定的生成请求
        const requestId = `ai-image-${Date.now()}`

        setIsProcessing(true)
        setGenerationError(null)

        try {
            // 创建一个空文件作为占位符
            const placeholderFile = new File([new Blob()], `${requestId}.png`, { type: 'image/png' })

            // 关闭面板并立即将占位符添加到画布
            // 传递一个特殊标记，表明这是一个加载中的AI生成图像
            onSaveGif(placeholderFile, requestId, false, true) // 添加第四个参数表示这是正在加载的AI图像
            onCancel()

            // 在后台继续生成图像
            const response = await axios.post<{
                success: boolean,
                imageUrl?: string,
                message?: string,
                id?: string
            }>(getApiUrl('/api/images/generate-image'), {
                prompt: prompt.trim()
            })

            if (response.data && response.data.success) {
                // 返回的imageUrl通常是相对路径，需要添加服务器前缀
                const imageUrl = getApiUrl(response.data.imageUrl || '')

                // 下载图片
                const imageResponse = await fetch(imageUrl)
                const blob = await imageResponse.blob()

                // 创建File对象
                const filename = `ai-image-${Date.now()}.png`
                const file = new File([blob], filename, { type: 'image/png' })

                // 最关键的部分：使用与之前相同的requestId更新画布上的元素
                // 这里需要通过某种方式来通知Canvas组件更新指定ID的元素

                // 方案1：通过一个自定义事件来通知画布组件
                const updateEvent = new CustomEvent('aiImageGenerated', {
                    detail: {
                        requestId: requestId,
                        file: file,
                        imageUrl: imageUrl
                    }
                });
                window.dispatchEvent(updateEvent);

                // 方案2：如果Canvas组件提供了更新元素的方法，也可以直接调用
                // 但目前代码中没有这样的方法，所以使用自定义事件是较好的选择

                // 重置状态
                setPrompt("")
            } else {
                throw new Error(response.data?.message || 'Failed to generate image')
            }
        } catch (error: any) {
            console.error('Image generation failed:', error)
            setGenerationError(error?.response?.data?.message || error.message || 'Failed to generate image')
            // 可以通过某种方式通知用户生成失败

            // 发送一个生成失败的事件，以便画布组件可以做相应处理
            const failureEvent = new CustomEvent('aiImageGenerationFailed', {
                detail: {
                    requestId: requestId,
                    error: error?.message || 'Unknown error'
                }
            });
            window.dispatchEvent(failureEvent);
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div ref={panelRef} className="w-full h-full flex flex-row">
            {/* Left Side Navigation */}
            <div className="border-r flex flex-col justify-between h-full">
                <button
                    onClick={() => handleTabChange('search')}
                    className={`flex items-center justify-center py-4 px-4 flex-1 ${activeTab === 'search'
                        ? 'text-black'
                        : 'text-gray-400 hover:text-gray-600'
                        } transition-colors duration-200`}
                    aria-label="Search"
                >
                    <Cat size={24} />
                </button>

                <button
                    onClick={() => handleTabChange('sticker')}
                    className={`flex items-center justify-center py-4 px-4 flex-1 ${activeTab === 'sticker'
                        ? 'text-black'
                        : 'text-gray-400 hover:text-gray-600'
                        } transition-colors duration-200`}
                    aria-label="Sticker"
                >
                    <Sticker size={24} />
                </button>

                {showAiGenerator && (
                    <button
                        onClick={() => handleTabChange('generate')}
                        className={`flex items-center justify-center py-4 px-4 flex-1 ${activeTab === 'generate'
                            ? 'text-black'
                            : 'text-gray-400 hover:text-gray-600'
                            } transition-colors duration-200`}
                        aria-label="Generate"
                    >
                        <Sparkles size={24} />
                    </button>
                )}

                <button
                    onClick={() => handleTabChange('upload')}
                    className={`flex items-center justify-center py-4 px-4 flex-1 ${activeTab === 'upload'
                        ? 'text-black'
                        : 'text-gray-400 hover:text-gray-600'
                        } transition-colors duration-200`}
                    aria-label="Upload"
                >
                    <Upload size={24} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 h-full overflow-hidden flex flex-col">
                {activeTab === 'search' && (
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for GIFs..."
                                    className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {/* Giphy Grid */}
                            <div ref={gridContainerRef} className="p-2 h-full">
                                <Grid
                                    key={searchQuery}
                                    width={gridWidth}
                                    columns={3}
                                    fetchGifs={fetchGifs}
                                    onGifClick={handleGifSelect}
                                    noLink
                                    noResultsMessage={<p className="text-center my-8 text-gray-500">No GIFs found. Try a different search.</p>}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sticker' && (
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={stickerSearchQuery}
                                    onChange={(e) => setStickerSearchQuery(e.target.value)}
                                    placeholder="Search for Stickers..."
                                    className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {/* Giphy Stickers Grid */}
                            <div ref={stickerGridContainerRef} className="p-2 h-full">
                                <Grid
                                    key={stickerSearchQuery}
                                    width={gridWidth}
                                    columns={3}
                                    fetchGifs={fetchStickers}
                                    onGifClick={handleStickerSelect}
                                    noLink
                                    noResultsMessage={<p className="text-center my-8 text-gray-500">No Stickers found. Try a different search.</p>}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="flex flex-col h-full p-6">
                        {/* 上传区域 */}
                        <div
                            className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 ${isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200'
                                } transition-colors duration-200`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            {previewImage ? (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    <img
                                        src={previewImage}
                                        alt="Preview"
                                        className="max-w-full max-h-[300px] object-contain mb-4"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPreviewImage(null)}
                                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleBrowseClick}
                                            className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800"
                                        >
                                            Choose Another
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <ImageIcon size={48} className="text-gray-300 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                                        Upload an Image
                                    </h3>
                                    <p className="text-gray-500 text-sm text-center mb-6">
                                        Drag and drop an image here, or click below to select a file.
                                        <br />
                                        JPG, PNG, GIF and WebP files are supported.
                                    </p>
                                    <button
                                        onClick={handleBrowseClick}
                                        className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800"
                                    >
                                        Browse Files
                                    </button>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>

                        {/* 错误信息 */}
                        {uploadError && (
                            <div className="mt-4 p-3 bg-gray-50 text-gray-800 rounded-md border border-gray-200 text-sm flex items-center">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                                <div>{uploadError}</div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'generate' && showAiGenerator && (
                    <div className="h-full flex flex-col p-0 bg-white rounded-lg overflow-hidden">
                        {/* 顶部导航区 */}
                        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900">
                                AI Image Generator
                            </h2>
                            {isProcessing && (
                                <div className="text-sm text-gray-500 flex items-center">
                                    <div className="w-3 h-3 bg-black rounded-full mr-2 animate-pulse"></div>
                                    Processing...
                                </div>
                            )}
                        </div>

                        {/* 主内容区 */}
                        <div className="flex-1 flex flex-col p-6 overflow-hidden">
                            {/* 输入区 - 简化后的设计 */}
                            <div className="flex-1 relative border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
                                <textarea
                                    id="prompt"
                                    placeholder="A detailed description of the image you want to create..."
                                    className="w-full h-full resize-none px-4 py-3 border-none focus:outline-none bg-white text-gray-900 placeholder-gray-400"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    disabled={isProcessing}
                                    style={{ minHeight: "200px" }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !isProcessing) {
                                            e.preventDefault();
                                            handleGenerateImage();
                                        }
                                    }}
                                />

                                {/* 生成按钮 - 仅在有内容时显示 */}
                                {prompt.trim() && !isProcessing && (
                                    <button
                                        onClick={handleGenerateImage}
                                        className="absolute bottom-3 right-3 px-5 py-2 rounded-md text-sm font-medium bg-black text-white hover:bg-gray-800 active:bg-gray-900 transition-colors flex items-center"
                                    >
                                        Generate
                                        <CornerDownLeft size={14} className="ml-2" />
                                    </button>
                                )}

                                {/* 加载指示器 - 处理中显示 */}
                                {isProcessing && (
                                    <div className="absolute bottom-3 right-3 px-5 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-500 flex items-center">
                                        <Loader2 size={16} className="mr-2 animate-spin" />
                                        Generating...
                                    </div>
                                )}
                            </div>

                            {/* 错误信息 */}
                            {generationError && (
                                <div className="mt-4 p-3 bg-gray-50 text-gray-800 rounded-md border border-gray-200 text-sm flex items-center">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                                    <div>{generationError}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 