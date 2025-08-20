"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { v4 as uuidv4 } from "uuid"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import GridBackground from "../../components/GridBackground"
import { Toolbar } from "../../components/Toolbar"
import DraggableItem from "../../components/DraggableItem"
import PolaroidContent from "../../components/PolaroidContent"
import NoteContent from "../../components/NoteContent"
import AudioContent from "../../components/AudioContent"
import MediaContent from "../../components/MediaContent"
import DoodleContent from "../../components/DoodleContent"
import GifContent from "../../components/GifContent"
import audioRecorder from "../../services/audioRecorder"
import { Send, Bird, X } from 'lucide-react'
import Link from "next/link"
import axios from 'axios';
import Image from "next/image"
import CanvasContextMenu from "@/components/CanvasContextMenu"
import { getContextMenuState } from "@/components/ContextMenu"
import { BrushPanel } from "../../components/BrushPanel"
import * as socketService from "../../services/socketService"
import { uniqueNamesGenerator, adjectives, colors, animals, names } from 'unique-names-generator'
import { getApiUrl } from "@/config/apiConfig"



interface Item {
    id: string
    position: { x: number; y: number }
    zIndex: number
    rotation: number
    type: "photo" | "note" | "audio" | "media" | "doodle" | "gif"
    data: {
        imageUrl?: string
        dateTaken?: string
        color?: string
        content?: string
        audioUrl?: string
        spotifyUrl?: string
        svgData?: string
        isGif?: boolean
        originalGifUrl?: string
        sizeFactor?: number
        isSticker?: boolean
        isLoading?: boolean
        waveColor?: string
        noteSize?: { width: string, height: string }
        scale?: number
        aiRequestId?: string
        originalBlobUrl?: string
    }
}
interface AiImageFromDB {
    id: string;
    position: { x: number; y: number };
    zIndex: number;
    rotation?: number;
    imageUrl: string;
    dateTaken?: string;
}

// 在顶部的 Item 接口下定义新的接口来存储历史记录状态
interface HistoryState {
    items: Item[];
    backgroundImage?: string;
    backgroundColor?: string | null;
}

// 创建一个内容组件，将所有依赖useSearchParams的逻辑放在这里
function PaperPageContent() {
    const [items, setItems] = useState<Item[]>([])
    const [highestZIndex, setHighestZIndex] = useState(10) // Initial z-index value
    const [isRecording, setIsRecording] = useState(false)
    const [isDoodling, setIsDoodling] = useState(false)
    const [isMediaInput, setIsMediaInput] = useState(false)
    const [isPhotoUpload, setIsPhotoUpload] = useState(false)
    const [isBrushPanel, setIsBrushPanel] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const recordingTimerId = useRef<NodeJS.Timeout | null>(null)
    const maxRecordingTime = audioRecorder.getMaxRecordingTime()
    const [isLoading, setIsLoading] = useState(false)

    // 检查是否在moodboard页面，决定是否使用WebSocket功能
    const pathname = usePathname() || '';
    const isMoodboardPage = pathname.includes('/moodboard');

    // 新增：判断当前用户是否为paper所有者的状态
    const [isOwner, setIsOwner] = useState<boolean>(false)

    // 修改：历史记录和右键菜单相关状态，使用新的 HistoryState 接口
    const [history, setHistory] = useState<HistoryState[]>([]) // 操作历史
    const [historyIndex, setHistoryIndex] = useState(-1) // 当前历史位置
    const [showCanvasContextMenu, setShowCanvasContextMenu] = useState(false) // 是否显示画布右键菜单
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 }) // 右键菜单位置

    // 新增：Set background
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>()

    // 新增：背景颜色状态
    const [backgroundColor, setBackgroundColor] = useState<string | null>(null)

    // 新增：网格显示状态
    const [showGrid, setShowGrid] = useState<boolean>(true)

    // 新增：画布可滚动状态
    const [canvasScrollable, setCanvasScrollable] = useState<boolean>(false)

    // 新增：画布缩放比例
    const [canvasScale, setCanvasScale] = useState<number>(3)

    // 新增：Canvas页数
    const [canvasPages, setCanvasPages] = useState<number>(1)

    // 新增：笔刷颜色
    const [brushColor, setBrushColor] = useState<string | null>(null)

    // 新增：paper ID状态
    const [paperId, setPaperId] = useState<string | null>(null)

    // 新增：自动保存计时器
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

    // 新增：获取URL参数
    const searchParams = useSearchParams()
    const paperIdFromUrl = searchParams.get('id')

    // 移除用户认证检查
    const { isSignedIn, isLoaded, user } = useAuth();
    const router = useRouter();

    // 新增：跟踪上次保存的状态
    const lastSavedStateRef = useRef<{
        itemsLength: number;
        lastItemId?: string;
        backgroundImage?: string;
        backgroundColor?: string | null;
        showGrid?: boolean;
        canvasScrollable?: boolean;
        canvasScale?: number;
        canvasPages?: number;
        brushColor?: string | null;
        timestamp: number;
        initialLoadComplete: boolean; // 新增标志位，用于跟踪初始加载是否完成
    }>({
        itemsLength: 0,
        timestamp: 0,
        initialLoadComplete: false // 初始化为false
    });

    // 新增：初始化paper - 检查URL参数或创建新paper
    useEffect(() => {
        if (!isLoaded) return;

        const initPaper = async () => {
            if (paperIdFromUrl) {
                // 如果URL中有paper ID，加载该paper
                await loadPaper(paperIdFromUrl);
            } else if (isSignedIn && user) {
                // 如果用户已登录但没有指定paper ID，创建新paper
                await createNewPaper();
            }
        };

        initPaper();
    }, [isLoaded, isSignedIn, user, paperIdFromUrl]);

    // 新增：创建新paper
    const createNewPaper = async () => {
        if (!isSignedIn || !user) return;

        try {
            const newPaperData = {
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                items: [],
                backgroundImage: null,
                backgroundColor: null,
                showGrid: true,
                canvasScrollable: false,
                canvasScale: 3,
                canvasPages: 1,  // 确保新建paper时使用默认值1
                brushColor: null
            };

            const response = await fetch(getApiUrl('/api/papers'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newPaperData),
            });

            if (!response.ok) {
                throw new Error('Failed to create new paper');
            }

            const data = await response.json();
            setPaperId(data.paperId);

            // 设置为所有者
            setIsOwner(true);

            // 更新URL以包含paper ID
            window.history.replaceState(null, '', `/paper?id=${data.paperId}`);

            // 初始化历史记录
            setHistory([{ items: [], backgroundImage: undefined, backgroundColor: null }]);
            setHistoryIndex(0);

            // 新增：更新lastSavedStateRef以防止页面加载后的不必要保存
            lastSavedStateRef.current = {
                itemsLength: 0,
                lastItemId: undefined,
                backgroundImage: undefined,
                backgroundColor: null,
                showGrid: true,
                canvasScrollable: false,
                canvasScale: 3,
                canvasPages: 1,
                brushColor: null,
                timestamp: Date.now(),
                initialLoadComplete: true // 标记初始加载已完成
            };
        } catch (error) {
            console.error('Failed to create new paper:', error);
        }
    };

    // 新增：加载指定paper
    const loadPaper = async (id: string) => {
        try {
            const response = await fetch(getApiUrl(`/api/papers/${id}`));

            if (!response.ok) {
                if (response.status === 404) {
                    // 修改: 使用正确的Next.js路由格式重定向到not-found页面
                    router.push('/not-found');
                    return;
                }
                throw new Error('Failed to load paper');
            }

            const data = await response.json();

            // 详细检查返回的项目数据


            // 设置paper ID
            setPaperId(id);

            // 检查当前用户是否为文档所有者
            const isCurrentUserOwner = isSignedIn && user && user.uid === data.userId;
            setIsOwner(!!isCurrentUserOwner);

            // 加载paper数据
            setItems(data.items || []);
            setBackgroundImage(data.backgroundImage || undefined);
            setBackgroundColor(data.backgroundColor || null);
            setShowGrid(data.showGrid !== undefined ? data.showGrid : true);
            setCanvasScrollable(data.canvasScrollable || false);
            setCanvasScale(data.canvasScale || 3);

            // 设置Canvas页数，使用paper的实际值
            const paperCanvasPages = data.canvasPages || 1;
            setCanvasPages(paperCanvasPages);

            // 加载笔刷颜色
            setBrushColor(data.brushColor || null);

            // 找出最高的z-index
            const maxZ = data.items.length > 0
                ? Math.max(...data.items.map((item: Item) => item.zIndex), 10)
                : 10;
            setHighestZIndex(maxZ);

            // 初始化历史记录
            setHistory([{
                items: data.items || [],
                backgroundImage: data.backgroundImage || undefined,
                backgroundColor: data.backgroundColor || null
            }]);
            setHistoryIndex(0);

            // 新增：更新lastSavedStateRef以防止页面加载后的不必要保存
            lastSavedStateRef.current = {
                itemsLength: data.items?.length || 0,
                lastItemId: data.items?.length > 0 ? data.items[data.items.length - 1]?.id : undefined,
                backgroundImage: data.backgroundImage || undefined,
                backgroundColor: data.backgroundColor || null,
                showGrid: data.showGrid !== undefined ? data.showGrid : true,
                canvasScrollable: data.canvasScrollable || false,
                canvasScale: data.canvasScale || 3,
                canvasPages: paperCanvasPages,
                brushColor: data.brushColor || null,
                timestamp: Date.now(),
                initialLoadComplete: true // 标记初始加载已完成
            };
        } catch (error) {
            console.error('Failed to load paper:', error);
        }
    };

    // 修改：工具函数：上传文件
    const uploadFile = async (file: File, type: 'image' | 'audio') => {
        const formData = new FormData();
        formData.append(type, file);

        try {
            const response = await fetch(getApiUrl(`/api/upload/${type}`), {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`File upload failed with status: ${response.status}`);
            }

            const data = await response.json();
            return data.url;
        } catch (error: any) {
            console.error('Upload error:', error);
            throw new Error(`Failed to upload ${type} file: ${error.message}`);
        }
    };

    // 优化：增量保存当前paper
    const savePaper = async () => {
        if (!paperId || !isSignedIn || !user) return Promise.resolve();

        // @ts-ignore - 检查我们添加的全局标记
        if (window._deletionInProgress) {
            return Promise.resolve();
        }

        // Filter out temporary AI loading items from the current state for this save operation
        // These items are placeholders and should not be persisted.
        const currentItemsFilteredForSave = items.filter(item => {
            const isTemporaryAiPlaceholder = item.type === 'gif' &&
                item.data.isLoading &&
                (
                    (item.data.aiRequestId && item.data.aiRequestId.startsWith('ai-image-')) ||
                    (item.data.imageUrl && item.data.imageUrl.startsWith('ai-image-'))
                );
            return !isTemporaryAiPlaceholder;
        });

        // Use the filtered list for all operations within this save function
        let allItems: Item[] = [...currentItemsFilteredForSave];

        try {
            setIsLoading(true);

            const itemsToProcess: Item[] = [];
            const newItemsOnly: Item[] = [];
            const lastSaved = lastSavedStateRef.current;

            // Iterate over the filtered items (allItems) for processing
            for (let i = 0; i < allItems.length; i++) {
                const item = allItems[i];
                // Compare with lastSaved. lastSavedStateRef is updated based on filtered items,
                // so this comparison remains consistent.
                const isNewItem = i >= lastSaved.itemsLength ||
                    (lastSaved.lastItemId && i === allItems.length - 1 && item.id !== lastSaved.lastItemId);
                const needsMediaUpload = (
                    (item.type === 'photo' && item.data.imageUrl && !item.data.imageUrl.startsWith('http') && !item.data.imageUrl.startsWith('/upload/')) ||
                    (item.type === 'gif' && item.data.imageUrl && !item.data.imageUrl.startsWith('http') && !item.data.imageUrl.startsWith('/upload/')) ||
                    (item.type === 'audio' && item.data.audioUrl && !item.data.audioUrl.startsWith('http') && !item.data.audioUrl.startsWith('/upload/'))
                );
                if (isNewItem || needsMediaUpload) {
                    itemsToProcess.push(item);
                    if (isNewItem) {
                        newItemsOnly.push(item);
                    }
                }
            }

            const processedItems = await Promise.all(
                itemsToProcess.map(async (item) => {
                    const processedItem = { ...item };
                    // ... (media upload logic)
                    // Process images - 处理所有图片，不仅是blob URL
                    if (item.type === 'photo' && item.data.imageUrl) {
                        // 如果图片URL不是以http或https开头，我们需要上传它
                        if (!item.data.imageUrl.startsWith('http://') &&
                            !item.data.imageUrl.startsWith('https://') &&
                            !item.data.imageUrl.startsWith('/upload/')) {
                            try {
                                const response = await fetch(item.data.imageUrl);
                                const blob = await response.blob();
                                const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                                const url = await uploadFile(file, 'image');
                                processedItem.data = {
                                    ...item.data,
                                    imageUrl: url,
                                    scale: item.data.scale || 1.0
                                };
                            } catch (error) {
                                console.error('处理图片失败:', error);
                                processedItem.data = { ...item.data };
                            }
                        }
                    }

                    // Process GIFs - 处理所有GIF，不仅是blob URL
                    if (item.type === 'gif' && item.data.imageUrl) {
                        // 如果GIF URL不是以http或https开头，我们需要上传它
                        const gifUrl = item.data.originalGifUrl || item.data.imageUrl;
                        if (!gifUrl.startsWith('http://') &&
                            !gifUrl.startsWith('https://') &&
                            !gifUrl.startsWith('/upload/')) {
                            try {
                                const response = await fetch(gifUrl);
                                const blob = await response.blob();
                                const file = new File([blob], 'gif.gif', { type: blob.type || 'image/gif' });
                                const url = await uploadFile(file, 'image');
                                processedItem.data = {
                                    ...item.data,
                                    imageUrl: url,
                                    originalGifUrl: url,
                                    isGif: true,
                                    isSticker: item.data.isSticker
                                };
                            } catch (error) {
                                console.error('处理GIF失败:', error);
                                processedItem.data = { ...item.data };
                            }
                        }
                    }

                    // Process audio - 处理所有音频，不仅是blob URL
                    if (item.type === 'audio' && item.data.audioUrl) {
                        // 如果音频URL不是以http或https开头，我们需要上传它
                        if (!item.data.audioUrl.startsWith('http://') &&
                            !item.data.audioUrl.startsWith('https://') &&
                            !item.data.audioUrl.startsWith('/upload/')) {
                            try {
                                const response = await fetch(item.data.audioUrl);
                                const blob = await response.blob();
                                // 将blob转换为File对象
                                const file = new File([blob], "audio.webm", { type: "audio/webm" });
                                const url = await uploadFile(file, 'audio');
                                processedItem.data = {
                                    ...item.data,
                                    audioUrl: url,
                                    waveColor: item.data.waveColor || "#ec4899"
                                };
                            } catch (error) {
                                console.error('处理音频失败:', error);
                                processedItem.data = { ...item.data };
                            }
                        }
                    }
                    return processedItem;
                })
            );

            // Update allItems (which is the filtered list) with processed items
            // allItems was already initialized from currentItemsFilteredForSave.
            // Now, we update its elements if they were processed (e.g., media URL updated).
            processedItems.forEach(processedItem => {
                const index = allItems.findIndex(item => item.id === processedItem.id);
                if (index !== -1) {
                    allItems[index] = processedItem;
                }
            });

            let processedBackgroundImage = backgroundImage;
            const backgroundUrlChanged = backgroundImage !== lastSaved.backgroundImage;
            if (backgroundUrlChanged && backgroundImage &&
                !backgroundImage.startsWith('http://') &&
                !backgroundImage.startsWith('https://') &&
                !backgroundImage.startsWith('/upload/')) {
                try {
                    const response = await fetch(backgroundImage);
                    const blob = await response.blob();
                    const file = new File([blob], 'background.jpg', { type: blob.type || 'image/jpeg' });
                    processedBackgroundImage = await uploadFile(file, 'image');
                } catch (error) {
                    console.error('处理背景图片失败:', error);
                    processedBackgroundImage = backgroundImage.startsWith('blob:') ? undefined : backgroundImage;
                }
            }

            const settingsChanged =
                showGrid !== lastSaved.showGrid ||
                canvasScrollable !== lastSaved.canvasScrollable ||
                canvasScale !== lastSaved.canvasScale ||
                canvasPages !== lastSaved.canvasPages ||
                brushColor !== lastSaved.brushColor;
            const backgroundsStateChanged =
                backgroundUrlChanged ||
                (processedBackgroundImage !== lastSaved.backgroundImage) ||
                backgroundColor !== lastSaved.backgroundColor;

            const deletedItemIds: string[] = [];
            if (historyIndex >= 0 && history[historyIndex]?.items) {
                const currentItemIds = new Set(allItems.map(item => item.id));
                history[historyIndex].items.forEach(historyItem => {
                    if (!currentItemIds.has(historyItem.id)) {
                        deletedItemIds.push(historyItem.id);
                    }
                });
            }

            const modifiedItems: Item[] = [];
            if (history.length > 0 && historyIndex >= 0) {
                const lastHistoryState = history[historyIndex];
                allItems.forEach(currentItem => {
                    if (newItemsOnly.some(newItem => newItem.id === currentItem.id)) return;
                    const previousItem = lastHistoryState.items.find(item => item.id === currentItem.id);
                    if (previousItem) {
                        const positionChanged =
                            previousItem.position.x !== currentItem.position.x ||
                            previousItem.position.y !== currentItem.position.y;
                        const zIndexChanged = previousItem.zIndex !== currentItem.zIndex;
                        const rotationChanged = previousItem.rotation !== currentItem.rotation;
                        let dataChanged = false;
                        if (currentItem.type === 'note' && previousItem.type === 'note') {
                            dataChanged = currentItem.data.content !== previousItem.data.content || currentItem.data.color !== previousItem.data.color;
                        } else if (currentItem.data && previousItem.data) {
                            const currentDataStr = JSON.stringify({ ...currentItem.data, isLoading: undefined, originalBlobUrl: undefined });
                            const previousDataStr = JSON.stringify({ ...previousItem.data, isLoading: undefined, originalBlobUrl: undefined });
                            dataChanged = currentDataStr !== previousDataStr;
                        }
                        if (positionChanged || zIndexChanged || rotationChanged || dataChanged) {
                            modifiedItems.push({ ...currentItem });
                        }
                    }
                });
            }

            const updatePayloads: { endpoint: string, method: string, body: any }[] = [];
            const finalNewItemsOnly = newItemsOnly.map(newItem => {
                const processedVersion = allItems.find(ai => ai.id === newItem.id);
                return processedVersion || newItem;
            });
            const itemsToSync = [...finalNewItemsOnly];
            modifiedItems.forEach(modItem => {
                if (!itemsToSync.some(syncedItem => syncedItem.id === modItem.id)) {
                    itemsToSync.push(modItem);
                }
            });

            if (itemsToSync.length > 0 || deletedItemIds.length > 0) {
                updatePayloads.push({
                    endpoint: getApiUrl(`/api/papers/${paperId}/items`),
                    method: 'PATCH',
                    body: {
                        userId: user.uid,
                        newItems: itemsToSync,
                        deletedItemIds: deletedItemIds,
                        lastModified: new Date().toISOString(),
                    },
                });
            }

            if (settingsChanged || backgroundsStateChanged) {
                updatePayloads.push({
                    endpoint: getApiUrl(`/api/papers/${paperId}/settings`),
                    method: 'PATCH',
                    body: {
                        userId: user.uid,
                        backgroundImage: processedBackgroundImage === "" ? null : (processedBackgroundImage || null),
                        backgroundColor: backgroundColor,
                        showGrid: showGrid,
                        canvasScrollable: canvasScrollable,
                        canvasScale: canvasScale,
                        canvasPages: canvasPages,
                        brushColor: brushColor,
                        lastModified: new Date().toISOString(),
                    },
                });
            }

            if (updatePayloads.length > 0) {
                for (const payload of updatePayloads) {
                    const response = await fetch(payload.endpoint, {
                        method: payload.method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload.body),
                    });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(`增量保存失败 (${payload.method} ${payload.endpoint}): ${response.status} - ${errorData.message || response.statusText}`);
                    }
                }
                lastSavedStateRef.current = {
                    itemsLength: allItems.length,
                    lastItemId: allItems.length > 0 ? allItems[allItems.length - 1]?.id : undefined,
                    backgroundImage: processedBackgroundImage,
                    backgroundColor,
                    showGrid,
                    canvasScrollable,
                    canvasScale,
                    canvasPages,
                    brushColor,
                    timestamp: Date.now(),
                    initialLoadComplete: true
                };
                return true;
            } else {
                return Promise.resolve(true);
            }

        } catch (error) {
            console.error('保存操作失败:', error);
            try {
                // Ensure allItems is up-to-date for fallback if media processing happened
                // This re-assignment ensures 'allItems' from the try block (which includes processed media)
                // is used, not the initial [...items]. This relies on 'allItems' being declared with 'let'
                // at the function scope.

                const currentBackgroundImageForFallback = backgroundImage &&
                    !backgroundImage.startsWith('http://') &&
                    !backgroundImage.startsWith('https://') &&
                    !backgroundImage.startsWith('/upload/') &&
                    !backgroundImage.startsWith('blob:') ?
                    await (async () => {
                        try {
                            const response = await fetch(backgroundImage);
                            const blob = await response.blob();
                            const file = new File([blob], 'background.jpg', { type: blob.type || 'image/jpeg' });
                            return await uploadFile(file, 'image');
                        } catch (err) {
                            console.error('处理背景图片失败 (fallback):', err);
                            return backgroundImage;
                        }
                    })() : (backgroundImage === "" ? null : backgroundImage);

                const fullRequestBody = {
                    userId: user.uid,
                    items: allItems, // allItems here refers to the one updated after media processing
                    backgroundImage: currentBackgroundImageForFallback,
                    backgroundColor: backgroundColor,
                    showGrid: showGrid,
                    canvasScrollable: canvasScrollable,
                    canvasScale: canvasScale,
                    canvasPages: canvasPages,
                    brushColor: brushColor,
                    lastModified: new Date().toISOString()
                };

                const fallbackResponse = await fetch(getApiUrl(`/api/papers/${paperId}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fullRequestBody),
                });

                if (!fallbackResponse.ok) {
                    const fallbackErrorData = await fallbackResponse.json().catch(() => ({}));
                    throw new Error(`备选完整更新也失败: ${fallbackResponse.status} - ${fallbackErrorData.message || fallbackResponse.statusText}`);
                }

                lastSavedStateRef.current = {
                    itemsLength: allItems.length, // Use allItems.length
                    lastItemId: allItems.length > 0 ? allItems[allItems.length - 1]?.id : undefined, // Use allItems
                    backgroundImage: currentBackgroundImageForFallback,
                    backgroundColor,
                    showGrid,
                    canvasScrollable,
                    canvasScale,
                    canvasPages,
                    brushColor,
                    timestamp: Date.now(),
                    initialLoadComplete: true
                };
                return true;
            } catch (fallbackError) {
                console.error('备选完整更新失败:', fallbackError);
                throw fallbackError;
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 优化：自动保存功能 - 使用防抖并检测有意义的变化
    useEffect(() => {
        // 如果没有paper ID，不启动自动保存
        if (!paperId || !isOwner) return;

        // 检查是否有重要变化需要保存
        const now = Date.now();
        const lastSaved = lastSavedStateRef.current;
        const minSaveInterval = 1000; // 最小保存间隔时间：1秒

        // 新增：如果是初次加载数据，则更新lastSavedStateRef并返回
        if (!lastSaved.initialLoadComplete) {
            // 更新最后保存的状态
            lastSavedStateRef.current = {
                itemsLength: items.length,
                lastItemId: items.length > 0 ? items[items.length - 1]?.id : undefined,
                backgroundImage,
                backgroundColor,
                showGrid,
                canvasScrollable,
                canvasScale,
                canvasPages,
                brushColor,
                timestamp: now,
                initialLoadComplete: true // 标记初始加载已完成
            };
            return;
        }

        // 如果存在正在执行的删除操作，则不触发自动保存
        // 这样可以防止删除操作时的全量更新
        // @ts-ignore - 我们会在另一个地方添加这个属性
        if (window._deletionInProgress) {
            return;
        }

        // 有意义的变化检测
        const itemsChanged = items.length !== lastSaved.itemsLength;
        const lastItemChanged = items.length > 0 && items[items.length - 1]?.id !== lastSaved.lastItemId;
        const backgroundChanged = backgroundImage !== lastSaved.backgroundImage;
        const backgroundColorChanged = backgroundColor !== lastSaved.backgroundColor;
        const gridChanged = showGrid !== lastSaved.showGrid;
        const scrollableChanged = canvasScrollable !== lastSaved.canvasScrollable;
        const scaleChanged = canvasScale !== lastSaved.canvasScale;
        const pagesChanged = canvasPages !== lastSaved.canvasPages;
        const brushColorChanged = brushColor !== lastSaved.brushColor;

        // 时间检查：距离上次保存至少要1秒
        const timeElapsed = now - lastSaved.timestamp > minSaveInterval;

        // 是否需要保存的决定因素
        const needsSave = timeElapsed && (
            itemsChanged ||
            lastItemChanged ||
            backgroundChanged ||
            backgroundColorChanged ||
            gridChanged ||
            scrollableChanged ||
            scaleChanged ||
            pagesChanged ||
            brushColorChanged
        );

        if (!needsSave) return;

        // 设置一个短暂的延迟以避免频繁保存
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
            savePaper().then(() => {
                // 更新最后保存的状态
                lastSavedStateRef.current = {
                    itemsLength: items.length,
                    lastItemId: items.length > 0 ? items[items.length - 1]?.id : undefined,
                    backgroundImage,
                    backgroundColor,
                    showGrid,
                    canvasScrollable,
                    canvasScale,
                    canvasPages,
                    brushColor,
                    timestamp: Date.now(),
                    initialLoadComplete: true // 保持初始加载标记为true
                };
            });
        }, 1000); // 延迟1秒后保存

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [paperId, items, backgroundImage, backgroundColor, showGrid, canvasScrollable, canvasScale, canvasPages, brushColor, isOwner]);

    // 移除在离开页面前保存的代码
    // 完全依靠自动保存功能

    // 修改：将当前状态保存到历史记录
    const saveToHistory = useCallback((newItems: Item[], newBackground?: string, newBackgroundColor?: string | null) => {
        // 防止添加重复的历史记录
        if (history.length > 0 && historyIndex >= 0) {
            const lastHistoryState = history[historyIndex];

            // 检查是否实际发生了变化
            const backgroundChanged = newBackground !== undefined && newBackground !== lastHistoryState.backgroundImage;
            const backgroundColorChanged = newBackgroundColor !== undefined && newBackgroundColor !== lastHistoryState.backgroundColor;

            // 如果仅背景变化或项目数量变化，我们认为是有效的变化
            if (backgroundChanged || backgroundColorChanged || lastHistoryState.items.length !== newItems.length) {
                // 这是一个有效的变化，继续保存
            } else {
                // 检查项目是否有实质性变化
                let itemsChanged = false;

                // 深度比较项目，检查有无属性变化
                for (let i = 0; i < newItems.length; i++) {
                    const newItem = newItems[i];
                    const oldItem = lastHistoryState.items.find(item => item.id === newItem.id);

                    // 如果找不到旧项目，则发生了变化
                    if (!oldItem) {
                        itemsChanged = true;
                        break;
                    }

                    // 检查关键属性是否变化（忽略isLoading状态）
                    if (
                        newItem.position.x !== oldItem.position.x ||
                        newItem.position.y !== oldItem.position.y ||
                        newItem.rotation !== oldItem.rotation ||
                        newItem.type !== oldItem.type ||
                        JSON.stringify({ ...newItem.data, isLoading: undefined }) !==
                        JSON.stringify({ ...oldItem.data, isLoading: undefined })
                    ) {
                        itemsChanged = true;
                        break;
                    }
                }

                // 如果没有实质性变化，不保存新历史记录
                if (!itemsChanged && !backgroundChanged && !backgroundColorChanged) {
                    return;
                }
            }
        }

        // 过滤掉正在加载的AI图像 - 使用aiRequestId或imageUrl检查
        const filteredItems = newItems.filter(item => {
            return !(item.data.isLoading &&
                ((item.data.aiRequestId && item.data.aiRequestId.startsWith('ai-image-')) ||
                    (item.data.imageUrl && item.data.imageUrl.startsWith('ai-image-'))));
        });

        // 截断历史记录
        if (historyIndex < history.length - 1) {
            setHistory(history.slice(0, historyIndex + 1));
        }

        // 添加新状态到历史记录
        setHistory(prev => [...prev, {
            items: [...filteredItems],
            backgroundImage: newBackground !== undefined ? newBackground : backgroundImage,
            backgroundColor: newBackgroundColor !== undefined ? newBackgroundColor : backgroundColor
        }]);
        setHistoryIndex(prev => prev + 1);
    }, [history, historyIndex, backgroundImage, backgroundColor]);

    // 优化：监听AI图像生成完成事件
    useEffect(() => {
        const handleAiImageGenerated = (event: CustomEvent) => {
            const { requestId, imageUrl } = event.detail;

            // 查找具有相同requestId的临时加载项
            setItems(currentItems => {
                // 先尝试通过aiRequestId匹配
                let itemToUpdate = currentItems.find(item =>
                    item.data.aiRequestId === requestId
                );

                // 如果找不到，再尝试通过id匹配（兼容旧版）
                if (!itemToUpdate) {
                    itemToUpdate = currentItems.find(item => item.id === requestId);
                }

                if (!itemToUpdate) {
                    return currentItems;
                }

                // 创建更新后的Items数组，移除临时加载项并添加新的完成项
                // 移除所有与该requestId相关的临时项
                const filteredItems = currentItems.filter(item =>
                    !(item.data.aiRequestId === requestId || (item.id === requestId && item.data.isLoading))
                );

                // 创建新的已完成项
                const newUniqueId = uuidv4();
                const newItem: Item = {
                    id: newUniqueId,
                    position: itemToUpdate.position,
                    zIndex: itemToUpdate.zIndex,
                    rotation: itemToUpdate.rotation,
                    type: "gif", // 显式指定类型为合法的联合类型值
                    data: {
                        imageUrl: imageUrl,
                        originalGifUrl: imageUrl,
                        isGif: true,
                        isSticker: itemToUpdate.data.isSticker || false,
                        isLoading: false,
                        sizeFactor: itemToUpdate.data.sizeFactor || 0.8,
                        dateTaken: new Date().toISOString()
                    }
                };

                // 添加新的已完成项
                const updatedItems = [...filteredItems, newItem];

                // 更新历史记录 - 简化历史记录逻辑，避免多余的历史记录条目
                setHistory(prevHistory => {
                    // 创建新的历史记录数组，保留之前所有历史状态直到当前状态
                    const newHistory = prevHistory.slice(0, historyIndex + 1);

                    // 修改当前历史状态，移除临时项并添加新的已完成项
                    const currentHistory = { ...newHistory[historyIndex] };
                    currentHistory.items = updatedItems;

                    // 替换当前历史状态
                    newHistory[historyIndex] = currentHistory;

                    return newHistory;
                });

                // 不再需要额外调用saveToHistory
                // 直接更新items状态
                return updatedItems;
            });
        };

        // 监听生成失败事件
        const handleAiImageGenerationFailed = (event: CustomEvent) => {
            const { error, requestId } = event.detail;
            console.error('AI 图像生成失败:', error);

            // 移除所有相关的临时项
            setItems(currentItems => {
                // 过滤掉所有处于加载状态的AI图像项目
                const filteredItems = currentItems.filter(item => {
                    // 如果项目正在加载且aiRequestId匹配，则过滤掉
                    if (item.data.isLoading && item.data.aiRequestId === requestId) {
                        return false;
                    }
                    // 兼容旧版：如果项目正在加载且ID就是requestId，也过滤掉
                    if (item.data.isLoading && item.id === requestId) {
                        return false;
                    }
                    return true;
                });

                // 只在有变化时更新历史记录
                if (filteredItems.length !== currentItems.length) {
                    // 更新历史记录 - 使用与 handleAiImageGenerated 相同的逻辑
                    setHistory(prevHistory => {
                        // 创建新的历史记录数组，保留之前所有历史状态直到当前状态
                        const newHistory = prevHistory.slice(0, historyIndex + 1);

                        // 修改当前历史状态，移除临时项
                        const currentHistory = { ...newHistory[historyIndex] };
                        currentHistory.items = filteredItems;

                        // 替换当前历史状态
                        newHistory[historyIndex] = currentHistory;

                        return newHistory;
                    });
                }

                return filteredItems;
            });

            // 不再需要额外更新历史记录，因为在上面的 setItems 回调中已经完成了
        };

        // 添加事件监听器
        window.addEventListener('aiImageGenerated', handleAiImageGenerated as EventListener);
        window.addEventListener('aiImageGenerationFailed', handleAiImageGenerationFailed as EventListener);

        // 清理函数
        return () => {
            window.removeEventListener('aiImageGenerated', handleAiImageGenerated as EventListener);
            window.removeEventListener('aiImageGenerationFailed', handleAiImageGenerationFailed as EventListener);
        };
    }, [saveToHistory, setHistory, backgroundImage, backgroundColor, history, historyIndex]);

    // 修改：处理撤销操作
    const handleUndo = useCallback(() => {
        if (!isOwner || historyIndex <= 0) return;

        // Get previous state
        const prevState = history[historyIndex - 1];

        // Update current state with previous state
        setItems(prevState.items);
        setBackgroundImage(prevState.backgroundImage);
        setBackgroundColor(prevState.backgroundColor || null);

        // Move history pointer back
        setHistoryIndex(historyIndex - 1);

        // 立即进行全量更新，确保撤销操作被完整同步到后端
        if (paperId && isSignedIn && user) {
            // 取消之前的自动保存计时器
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }

            // 立即执行全量更新保存
            setTimeout(() => {
                // 准备全量更新数据
                const fullUpdateData = {
                    userId: user.uid,
                    items: prevState.items,
                    backgroundImage: prevState.backgroundImage || null,
                    backgroundColor: prevState.backgroundColor || null,
                    showGrid: showGrid,
                    canvasScrollable: canvasScrollable,
                    canvasScale: canvasScale,
                    canvasPages: canvasPages,
                    brushColor: brushColor,
                    lastModified: new Date().toISOString(),
                    // 指示这是撤销操作
                    isHistoryOperation: true,
                    historyAction: 'undo',
                    historyIndex: historyIndex - 1
                };

                // 发送全量更新
                fetch(getApiUrl(`/api/papers/${paperId}`), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(fullUpdateData),
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`撤销同步失败: ${response.status}`);
                        }

                        // 更新最后保存的状态
                        lastSavedStateRef.current = {
                            ...lastSavedStateRef.current,
                            itemsLength: prevState.items.length,
                            lastItemId: prevState.items.length > 0 ? prevState.items[prevState.items.length - 1]?.id : undefined,
                            backgroundImage: prevState.backgroundImage,
                            backgroundColor: prevState.backgroundColor || null,
                            timestamp: Date.now()
                        };
                    })
                    .catch(error => {
                        console.error('撤销同步到服务器失败:', error);
                    });
            }, 0);
        }
    }, [history, historyIndex, isOwner, paperId, isSignedIn, user, showGrid, canvasScrollable, canvasScale, canvasPages, brushColor]);

    // 修改：处理重做操作
    const handleRedo = useCallback(() => {
        if (!isOwner || historyIndex >= history.length - 1) return;

        // Get next state
        const nextState = history[historyIndex + 1];

        // Update current state with next state
        setItems(nextState.items);
        setBackgroundImage(nextState.backgroundImage);
        setBackgroundColor(nextState.backgroundColor || null);

        // Move history pointer forward
        setHistoryIndex(historyIndex + 1);

        // 立即进行全量更新，确保重做操作被完整同步到后端
        if (paperId && isSignedIn && user) {
            // 取消之前的自动保存计时器
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }

            // 立即执行全量更新保存
            setTimeout(() => {
                // 准备全量更新数据
                const fullUpdateData = {
                    userId: user.uid,
                    items: nextState.items,
                    backgroundImage: nextState.backgroundImage || null,
                    backgroundColor: nextState.backgroundColor || null,
                    showGrid: showGrid,
                    canvasScrollable: canvasScrollable,
                    canvasScale: canvasScale,
                    canvasPages: canvasPages,
                    brushColor: brushColor,
                    lastModified: new Date().toISOString(),
                    // 指示这是重做操作
                    isHistoryOperation: true,
                    historyAction: 'redo',
                    historyIndex: historyIndex + 1
                };

                // 发送全量更新
                fetch(getApiUrl(`/api/papers/${paperId}`), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(fullUpdateData),
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`重做同步失败: ${response.status}`);
                        }

                        // 更新最后保存的状态
                        lastSavedStateRef.current = {
                            ...lastSavedStateRef.current,
                            itemsLength: nextState.items.length,
                            lastItemId: nextState.items.length > 0 ? nextState.items[nextState.items.length - 1]?.id : undefined,
                            backgroundImage: nextState.backgroundImage,
                            backgroundColor: nextState.backgroundColor || null,
                            timestamp: Date.now()
                        };
                    })
                    .catch(error => {
                        console.error('重做同步到服务器失败:', error);
                    });
            }, 0);
        }
    }, [history, historyIndex, isOwner, paperId, isSignedIn, user, showGrid, canvasScrollable, canvasScale, canvasPages, brushColor]);

    // 修改：处理画布右键菜单
    const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
        // 如果不是所有者，则不打开菜单
        if (!isOwner) return;

        // 先检查是否已有菜单打开
        const { anyMenuOpen } = getContextMenuState();

        // 如果已有菜单打开，则阻止默认行为并返回
        if (anyMenuOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 检查是否点击在画布上而不是组件上
        if (e.target === canvasRef.current || e.currentTarget === canvasRef.current) {
            e.preventDefault();
            e.stopPropagation();
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            setShowCanvasContextMenu(true);
        }
    }, [isOwner]);

    // 新增：处理画布点击事件，关闭任何打开的菜单
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        // 如果有菜单打开且用户是所有者，关闭它
        if (showCanvasContextMenu && isOwner) {
            setShowCanvasContextMenu(false);
        }
    }, [showCanvasContextMenu, isOwner]);

    // 新增：辅助函数，计算当前视口内的随机位置
    const getRandomPositionInViewport = (itemWidth: number, itemHeight: number) => {
        // 如果画布不可滚动或canvasRef不存在，使用原来的逻辑
        if (!canvasScrollable || !canvasRef.current) {
            const canvasRect = canvasRef.current?.getBoundingClientRect()
            const maxX = canvasRect ? canvasRect.width - itemWidth : window.innerWidth - itemWidth
            const maxY = canvasRect ? canvasRect.height - itemHeight : window.innerHeight - itemHeight

            // 生成随机位置，避开边缘
            const randomX = Math.max(50, Math.random() * maxX)
            const randomY = Math.max(50, Math.random() * maxY)

            return { x: randomX, y: randomY }
        }

        // 画布可滚动时，获取当前视口的位置和尺寸
        const scrollLeft = canvasRef.current.scrollLeft
        const scrollTop = canvasRef.current.scrollTop
        const viewportWidth = canvasRef.current.clientWidth
        const viewportHeight = canvasRef.current.clientHeight

        // 计算在当前视口内的随机位置
        const maxX = viewportWidth - itemWidth
        const maxY = viewportHeight - itemHeight

        // 生成随机位置，加上当前滚动位置，避开边缘
        const randomX = scrollLeft + Math.max(50, Math.random() * (maxX - 100))
        const randomY = scrollTop + Math.max(50, Math.random() * (maxY - 100))

        return { x: randomX, y: randomY }
    }

    // 修改 handleStopRecording 函数
    const handleStopRecording = useCallback(async () => {
        try {
            // 立即设置不在录音状态，这样会关闭录音面板
            setIsRecording(false)

            // 先停止录音，获取blob URL
            const audioUrl = await audioRecorder.stopRecording()

            // 如果 audioUrl 为空或者未定义，则不继续执行
            if (!audioUrl) {
                console.warn("Stopping recording did not yield an audio URL. No item will be created.");
                return;
            }

            // 使用辅助函数获取随机位置
            const position = getRandomPositionInViewport(320, 300)

            // New audio uses current highest z-index
            const newZIndex = highestZIndex + 1
            setHighestZIndex(newZIndex)

            // Random rotation angle between -5 and 5 degrees
            const rotation = Math.random() * 10 - 5

            // 选择一个随机波形颜色
            const colors = [
                "#ec4899", // Pink
                "#3b82f6", // Blue
                "#10b981", // Green
                "#f59e0b", // Amber
                "#8b5cf6", // Purple
                "#ef4444", // Red
                "#06b6d4", // Cyan
            ]
            const waveColor = colors[Math.floor(Math.random() * colors.length)]

            // 创建一个新的音频项，先使用本地 blob URL
            const newItemId = uuidv4()
            const newItem: Item = {
                id: newItemId,
                position: position,
                zIndex: newZIndex,
                rotation,
                type: "audio",
                data: {
                    audioUrl,
                    waveColor,
                },
            }

            // 立即将音频项添加到界面上
            const newItems = [...items, newItem]
            setItems(newItems)

            // 保存到历史记录
            saveToHistory(newItems, backgroundImage, backgroundColor)

            // 发送新项目通知via WebSocket - 仅在moodboard页面使用
            if (isMoodboardPage) {
                socketService.addItem(newItem);
            }

            // 在后台上传录音文件到服务器
            if (audioUrl.startsWith('blob:')) {
                // 不等待上传完成，在后台处理
                (async () => {
                    try {
                        const response = await fetch(audioUrl);
                        const blob = await response.blob();
                        // 将blob转换为File对象
                        const file = new File([blob], "audio.webm", { type: "audio/webm" });
                        // 上传到服务器
                        const serverUrl = await uploadFile(file, 'audio');
                        // 上传成功后更新项目的URL
                        setItems(prevItems =>
                            prevItems.map(item =>
                                item.id === newItemId
                                    ? {
                                        ...item,
                                        data: {
                                            ...item.data,
                                            audioUrl: serverUrl,
                                            originalBlobUrl: audioUrl // 保存原始blob URL作为备份
                                        }
                                    }
                                    : item
                            )
                        );
                    } catch (uploadError) {
                        console.error("Failed to upload audio in background:", uploadError);
                        // 上传失败也不影响用户体验，继续使用本地 blob URL
                    }
                })();
            }
        } catch (error) {
            console.error("Failed to stop recording:", error)
            // 确保即使出错也关闭录音面板
            setIsRecording(false) // This line is okay, ensures panel is closed on error
        }
    }, [highestZIndex, items, saveToHistory, setHighestZIndex, setItems, setIsRecording, canvasRef, canvasScrollable, backgroundImage, backgroundColor, isMoodboardPage])

    //load all the ai images
    useEffect(() => {
        const fetchAIImages = async () => {
            try {
                // 修改API请求，添加超时和重试
                const apiClient = axios.create({
                    baseURL: getApiUrl(''),
                    timeout: 10000, // 10秒超时
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                // 尝试获取AI图像
                const res = await apiClient.get<{ data: AiImageFromDB[] }>('/api/ai/aiImages');
                const data = res.data.data;

                const formattedItems: Item[] = data.map((img: any) => ({
                    id: img.id,
                    position: img.position,
                    zIndex: img.zIndex,
                    rotation: img.rotation || 0,
                    type: "photo",
                    data: {
                        imageUrl: img.imageUrl,
                        dateTaken: img.dateTaken,
                    },
                }));

                setItems((prev) => [...prev, ...formattedItems]);
                const maxZ = Math.max(...formattedItems.map(i => i.zIndex), 10);
                setHighestZIndex(maxZ);
            } catch (err) {
                console.error("fail to load ai Images", err);
            }
        };
        fetchAIImages();
    }, []);

    // Start recording
    const handleStartRecording = async () => {
        try {
            await audioRecorder.startRecording()
            setIsRecording(true)
        } catch (error) {
            console.error("Failed to start recording:", error)
        }
    }

    // Handle record button click - 修改为直接开始录音，不再做toggle操作
    const handleRecordVoice = () => {
        if (!isRecording) {
            handleStartRecording()
        }
    }

    // 添加取消录音的处理函数
    const handleCancelRecording = useCallback(() => {
        // 停止录音器但不保存录音
        audioRecorder.cancelRecording().then(() => {
            setIsRecording(false)
        }).catch(error => {
            console.error("Failed to cancel recording:", error)
            setIsRecording(false)
        })
    }, [])

    // Handle adding photo
    const handleAddPhoto = (file: File) => {
        handleUploadPhoto(file)
    }

    // 修改 handleUploadPhoto 函数
    const handleUploadPhoto = async (file: File) => {
        // 上传图片到服务器
        let imageUrl;
        try {
            // 使用我们改进的uploadFile函数上传图片
            imageUrl = await uploadFile(file, 'image');
        } catch (error) {
            console.error('Failed to upload photo to server:', error);
            // 如果上传失败，使用本地URL但记录错误
            imageUrl = URL.createObjectURL(file);
            console.warn('Using local blob URL as fallback, this will not persist:', imageUrl);
        }

        // Extract photo date
        const dateTaken = await extractImageDate(file)

        // 使用辅助函数获取随机位置
        const position = getRandomPositionInViewport(200, 300)

        // New photo uses current highest z-index
        const newZIndex = highestZIndex + 1
        setHighestZIndex(newZIndex)

        // Random rotation angle between -5 and 5 degrees
        const rotation = Math.random() * 10 - 5

        // 生成随机缩放比例 (0.7 to 1.3)
        const scale = 0.7 + Math.random() * 0.6

        const newItem: Item = {
            id: uuidv4(),
            position: position,
            zIndex: newZIndex,
            rotation,
            type: "photo",
            data: {
                imageUrl,
                dateTaken,
                scale,  // 保存随机缩放比例
            },
        }

        const newItems = [...items, newItem]
        setItems(newItems)

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor)

        // 发送新项目通知via WebSocket - 仅在moodboard页面使用
        if (isMoodboardPage) {
            socketService.addItem(newItem);
        }
    }

    // 保留原fileInput处理程序，用于兼容性和后备
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            const file = files[0]
            await handleUploadPhoto(file)
        }

        // Reset file input, so same file can be selected again
        if (e.target) {
            e.target.value = ""
        }
    }

    // Extract date from image
    const extractImageDate = (file: File): Promise<string | undefined> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                if (!e.target?.result) {
                    resolve(undefined)
                    return
                }

                try {
                    // Try to read date from EXIF data
                    import("exif-js")
                        .then((EXIF) => {
                            const exifData = EXIF.default.readFromBinaryFile(e.target!.result as ArrayBuffer)

                            if (exifData && exifData.DateTimeOriginal) {
                                // EXIF date format is usually: YYYY:MM:DD HH:MM:SS
                                const dateParts = exifData.DateTimeOriginal.split(" ")[0].split(":")
                                if (dateParts.length === 3) {
                                    const formattedDate = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`
                                    resolve(formattedDate)
                                    return
                                }
                            }

                            // If no EXIF date, use file's last modified date
                            const lastModified = new Date(file.lastModified).toLocaleDateString()
                            resolve(lastModified)
                        })
                        .catch(() => {
                            // If EXIF library fails, use file's last modified date
                            const lastModified = new Date(file.lastModified).toLocaleDateString()
                            resolve(lastModified)
                        })
                } catch (error) {
                    // On error, use current date
                    resolve(new Date().toLocaleDateString())
                }
            }

            reader.readAsArrayBuffer(file)
        })
    }

    // 修改 handlePositionChange 函数，添加可选参数来控制是否保存历史记录
    const handlePositionChange = async (id: string, newPosition: { x: number; y: number }, shouldSaveHistory: boolean = false) => {
        // 如果用户不是所有者，忽略位置变更请求
        if (!isOwner) return;

        // 确保位置是数值类型
        let yPosition = typeof newPosition.y === 'number' ? newPosition.y : 0;
        const xPosition = typeof newPosition.x === 'number' ? newPosition.x : 0;

        // Add top and bottom boundary constraint ONLY if canvas is scrollable and multi-page
        if (canvasScrollable && canvasPages > 1) {
            const estimatedItemHeight = 200; // Consistent with previous logic
            const topBuffer = -400; // Allow item to go 400px off-screen at the top
            const bottomBuffer = 200; // Buffer from the absolute bottom edge of item content

            const maxCanvasHeight = canvasPages * 1500;

            // Calculate maximum Y position: canvas height - item height - bottom buffer
            const maxYPosition = maxCanvasHeight - estimatedItemHeight - bottomBuffer;

            yPosition = Math.min(yPosition, maxYPosition);
            yPosition = Math.max(topBuffer, yPosition); // Apply top buffer as minimum Y
        }
        // No specific y-axis constraints if it's a single, non-scrollable page.
        // The browser's viewport itself acts as the natural boundary.

        const validPosition = { x: xPosition, y: yPosition };

        // 查找拖动的项目并创建副本
        // const draggedItem = items.find(item => item.id === id);
        // if (!draggedItem) {
        //     console.error(`找不到要更新的项目: ${id}`);
        //     return;
        // }

        // 更新状态
        const newItems = items.map((item) =>
            (item.id === id ? { ...item, position: validPosition } : item)
        );
        setItems(newItems);

        // 只在拖拽结束时（shouldSaveHistory 为 true 时）保存历史记录并直接更新
        if (shouldSaveHistory) {
            saveToHistory(newItems, backgroundImage, backgroundColor);

            const itemToUpdateDirectly = newItems.find(item => item.id === id);

            if (itemToUpdateDirectly && paperId && isSignedIn && user) {
                const isTemporaryAiPlaceholder = itemToUpdateDirectly.type === 'gif' &&
                    itemToUpdateDirectly.data.isLoading &&
                    (
                        (itemToUpdateDirectly.data.aiRequestId && itemToUpdateDirectly.data.aiRequestId.startsWith('ai-image-')) ||
                        (itemToUpdateDirectly.data.imageUrl && itemToUpdateDirectly.data.imageUrl.startsWith('ai-image-'))
                    );

                if (!isTemporaryAiPlaceholder) {
                    // 取消之前的定时器
                    if (autoSaveTimerRef.current) {
                        clearTimeout(autoSaveTimerRef.current);
                    }
                    try {
                        // 发送专门的位置更新请求
                        const positionUpdateEndpoint = getApiUrl(`/api/papers/${paperId}/items`);
                        const positionUpdateResponse = await fetch(positionUpdateEndpoint, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                userId: user.uid,
                                newItems: [itemToUpdateDirectly], // 只发送被拖动的项目
                                lastModified: new Date().toISOString()
                            }),
                        });

                        if (positionUpdateResponse.ok) {
                            const responseData = await positionUpdateResponse.json();

                            // 如果服务器返回了更新后的项目，应用到当前状态
                            if (responseData.updatedItems && responseData.updatedItems.length > 0) {
                                const serverItem = responseData.updatedItems[0];

                                // 如果服务器位置与本地位置不同，使用服务器位置
                                if (serverItem.position.x !== validPosition.x || serverItem.position.y !== validPosition.y) {
                                    // 更新本地状态以与服务器同步
                                    setItems(currentItems =>
                                        currentItems.map(item =>
                                            item.id === id ? { ...item, position: serverItem.position } : item
                                        )
                                    );
                                }
                            }

                            // 更新最后保存状态
                            lastSavedStateRef.current = {
                                ...lastSavedStateRef.current,
                                timestamp: Date.now()
                            };
                        } else {
                            console.error(`项目位置更新失败:`, await positionUpdateResponse.text());
                            // 如果直接更新失败，回退到完整保存
                            autoSaveTimerRef.current = setTimeout(() => {
                                savePaper();
                            }, 1000);
                        }
                    } catch (error) {
                        console.error('位置更新错误:', error);
                        // 如果出错，回退到完整保存
                        autoSaveTimerRef.current = setTimeout(() => {
                            savePaper();
                        }, 1000);
                    }
                } else {
                    // If it IS a temporary placeholder, rely on the main auto-save or AI completion.
                    autoSaveTimerRef.current = setTimeout(() => {
                        savePaper();
                    }, 1000);
                }
            } else if (!paperId || !isSignedIn || !user) {
                // If no necessary user info for direct update, fallback to full save
                autoSaveTimerRef.current = setTimeout(() => {
                    savePaper();
                }, 1000);
            }
        }

        const target = items.find((item) => item.id === id);
        if (target && target.type === "photo" && target.data.imageUrl?.includes("/upload/aiImage")) {
            try {
                await axios.patch(getApiUrl('/api/ai/aiImage/update-position'), {
                    id,
                    position: newPosition,
                    zIndex: target.zIndex,
                }, {
                    timeout: 5000 // 5 second timeout
                });

            } catch (err) {
                console.error("Failed to update position in MongoDB", err);
            }
        }
    };

    // for deleting the ai image
    const handleDelete = async (id: string, imageUrl?: string) => {
        // 如果用户不是所有者，不允许删除
        if (!isOwner) return;

        try {
            // 标记删除操作正在进行中，防止自动保存触发
            // @ts-ignore - 简单地添加全局标记
            window._deletionInProgress = true;



            // 如果其实当前历史记录为空，先创建一个包含当前状态的历史记录点
            if (history.length === 0 || historyIndex < 0) {
                saveToHistory([...items], backgroundImage, backgroundColor);
            }

            // If it's an AI image, delete it from the server
            if (imageUrl && imageUrl.includes("/upload/aiImage")) {
                try {
                    const filename = imageUrl.split("/").pop();
                    await axios.delete(getApiUrl(`/api/ai/aiImage/by-id/${id}`), {
                        timeout: 5000 // 5 seconds timeout
                    });
                } catch (apiErr) {
                    console.error("API error:", apiErr);
                }
            }

            // Remove the item from the state
            const newItems = items.filter(item => item.id !== id);
            setItems(newItems);

            // 创建一个新的历史记录点，保存删除后的状态
            saveToHistory(newItems, backgroundImage, backgroundColor);



            // 触发自动保存 - 使用增量更新删除功能
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }

            // 不要延迟，直接调用增量删除接口
            await incrementalSaveDelete(id);

        } catch (err) {
            console.error("Failed to delete item", err);
            // 确保在出错时也清除标记
            // @ts-ignore
            window._deletionInProgress = false;
        }
    }

    // 新增：增量删除项目的功能
    const incrementalSaveDelete = async (deletedItemId: string) => {
        if (!paperId || !user?.uid) return;

        try {
            // 标记删除操作正在进行中
            // @ts-ignore - 简单地添加全局标记以防止自动保存
            window._deletionInProgress = true;

            // 不从历史记录中检测，直接使用传入的 deletedItemId
            const deletedItemIds = [deletedItemId];

            // 发送增量删除请求
            const response = await fetch(getApiUrl(`/api/papers/${paperId}/items`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deletedItemIds: deletedItemIds,
                    lastModified: new Date().toISOString(),
                    userId: user.uid,
                }),
            });

            const data = await response.json();

            if (response.ok) {

                // 移除 Socket 通知，因为Paper页面不使用WebSocket协作
                // Paper页面只需本地删除，不需要通过WebSocket广播

                // 更新 lastSavedStateRef 以反映最新状态
                lastSavedStateRef.current = {
                    ...lastSavedStateRef.current,
                    itemsLength: items.length,
                    timestamp: Date.now()
                };
            } else {
                console.error('增量删除失败:', data.message || response.statusText);
                // 如果增量删除失败，不要回退到完整保存
            }
        } catch (err) {
            console.error('增量删除错误:', err);
            // 出错后也不回退到完整保存
        } finally {
            // 删除操作完成，取消标记
            // @ts-ignore
            window._deletionInProgress = false;
        }
    }


    // 修改 handleDragStart 函数
    const handleDragStart = (id: string) => {
        if (!isOwner) return;

        const newZIndex = highestZIndex + 1;
        setHighestZIndex(newZIndex);

        // 获取要更新的项目
        // const targetItem = items.find(item => item.id === id);
        // if (!targetItem) return;

        // 创建更新后的项目列表
        const newItems = items.map((item) =>
            (item.id === id ? { ...item, zIndex: newZIndex } : item)
        );
        setItems(newItems);

        // 注意：我们不在这里保存历史记录，因为改变 z-index 不需要记录在历史中

        const itemToUpdateForZIndex = newItems.find(item => item.id === id);

        if (itemToUpdateForZIndex && paperId && isSignedIn && user) {
            const isTemporaryAiPlaceholder = itemToUpdateForZIndex.type === 'gif' &&
                itemToUpdateForZIndex.data.isLoading &&
                (
                    (itemToUpdateForZIndex.data.aiRequestId && itemToUpdateForZIndex.data.aiRequestId.startsWith('ai-image-')) ||
                    (itemToUpdateForZIndex.data.imageUrl && itemToUpdateForZIndex.data.imageUrl.startsWith('ai-image-'))
                );

            if (!isTemporaryAiPlaceholder) {
                // 立即发送 zIndex 更新到服务器
                // 取消之前的定时器
                if (autoSaveTimerRef.current) {
                    clearTimeout(autoSaveTimerRef.current);
                }

                // 异步直接更新 zIndex 
                (async () => {
                    try {
                        const zIndexUpdateEndpoint = getApiUrl(`/api/papers/${paperId}/items`);
                        await fetch(zIndexUpdateEndpoint, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                userId: user.uid,
                                newItems: [itemToUpdateForZIndex], // 只发送被点击/拖动的项目
                                lastModified: new Date().toISOString()
                            }),
                        });
                        // Successfully updated z-index, update lastSavedStateRef timestamp
                        lastSavedStateRef.current = {
                            ...lastSavedStateRef.current,
                            timestamp: Date.now()
                        };
                    } catch (error) {
                        console.error('zIndex 更新错误:', error);
                        // 如果出错，回退到完整保存
                        autoSaveTimerRef.current = setTimeout(() => {
                            savePaper();
                        }, 1000);
                    }
                })();
            } else {
                // If it IS a temporary placeholder, rely on the main auto-save or AI completion.
                autoSaveTimerRef.current = setTimeout(() => {
                    savePaper();
                }, 1000);
            }
        } else if (!paperId || !isSignedIn || !user) {
            // 如果没有必要的用户信息，回退到完整保存
            autoSaveTimerRef.current = setTimeout(() => {
                savePaper();
            }, 1000);
        }
    }

    const handleAddNote = (color: string) => {
        // 使用辅助函数获取随机位置
        const position = getRandomPositionInViewport(200, 300)

        // New note uses current highest z-index
        const newZIndex = highestZIndex + 1
        setHighestZIndex(newZIndex)

        // Random rotation angle between -12 and 12 degrees (can lean left or right)
        const rotation = Math.random() * 24 - 12

        // 随机选择便签大小
        const widthOptions = ['w-48', 'w-52', 'w-56', 'w-60', 'w-64']
        const heightOptions = ['h-48', 'h-52', 'h-56', 'h-60', 'h-64']
        const noteWidth = widthOptions[Math.floor(Math.random() * widthOptions.length)]
        const noteHeight = heightOptions[Math.floor(Math.random() * heightOptions.length)]

        const newItem: Item = {
            id: uuidv4(),
            position: position,
            zIndex: newZIndex,
            rotation,
            type: "note",
            data: {
                color,
                noteSize: { width: noteWidth, height: noteHeight }
            },
        }

        const newItems = [...items, newItem]
        setItems(newItems)

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor)
    }

    const handleAddMedia = (url: string) => {
        // 使用辅助函数获取随机位置
        const position = getRandomPositionInViewport(320, 400)

        // New Spotify component uses current highest z-index
        const newZIndex = highestZIndex + 1
        setHighestZIndex(newZIndex)

        // Random rotation angle between -3 and 3 degrees (slight lean)
        const rotation = Math.random() * 6 - 3

        const newItem: Item = {
            id: uuidv4(),
            position: position,
            zIndex: newZIndex,
            rotation,
            type: "media",
            data: {
                spotifyUrl: url,
            },
        }

        const newItems = [...items, newItem]
        setItems(newItems)

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor)
    }

    const handleAddAIImage = (item: {
        id: string;
        src: string;
        initialPosition: { x: number; y: number };
        zIndex: number;
    }) => {
        // 检查是否是正在生成的AI图像
        const isGenerating = item.id.startsWith('ai-image-') && !item.src.startsWith('http');

        // 使用辅助函数获取随机位置
        const position = getRandomPositionInViewport(200, 200)

        // 使用新的唯一ID
        const newUniqueId = uuidv4();

        // 对于生成中的AI图像，添加临时加载项
        if (isGenerating) {
            const loadingItem: Item = {
                id: newUniqueId,
                position: position,
                zIndex: item.zIndex,
                rotation: Math.random() * 6 - 3, // 较小的旋转角度
                type: "gif",
                data: {
                    imageUrl: item.id, // 临时使用requestId作为URL
                    dateTaken: new Date().toISOString(),
                    isGif: true,
                    isLoading: true,
                    aiRequestId: item.id, // 存储AI请求ID以便后续匹配
                    originalGifUrl: item.id,
                    sizeFactor: 0.7 + Math.random() * 0.2
                }
            };

            // 将临时加载项添加到画布
            setItems(prev => [...prev, loadingItem]);

            // 不添加到历史记录，等待生成完成
            return;
        }

        // 对于已生成完成的AI图像，直接添加到画布
        const newItem: Item = {
            id: newUniqueId,
            position: position,
            zIndex: item.zIndex,
            rotation: Math.random() * 6 - 3, // 较小的旋转角度
            type: "gif",
            data: {
                imageUrl: item.src,
                dateTaken: new Date().toLocaleDateString(),
                isGif: true,
                originalGifUrl: item.src,
                sizeFactor: 0.7 + Math.random() * 0.2, // GIF: Random value between 70% to 90%
            },
        }

        // 添加到items数组
        const newItems = [...items, newItem]
        setItems(newItems)

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor)
    }

    const handleAddDoodle = () => {
        setIsDoodling(!isDoodling)
    }

    const handleSaveDoodle = (svgData: string) => {
        // 使用辅助函数获取随机位置
        const position = getRandomPositionInViewport(200, 200)

        // New doodle uses current highest z-index
        const newZIndex = highestZIndex + 1
        setHighestZIndex(newZIndex)

        // Random rotation angle between -5 and 5 degrees
        const rotation = Math.random() * 10 - 5

        // Parse SVG to get dimensions
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgData, "image/svg+xml")
        const svgElement = svgDoc.querySelector("svg")

        // Ensure minimum size for very small doodles
        const width = svgElement?.getAttribute("width")
            ? Math.max(100, Number.parseInt(svgElement.getAttribute("width") || "100"))
            : 100
        const height = svgElement?.getAttribute("height")
            ? Math.max(100, Number.parseInt(svgElement.getAttribute("height") || "100"))
            : 100

        const newItem: Item = {
            id: uuidv4(),
            position: position,
            zIndex: newZIndex,
            rotation,
            type: "doodle",
            data: {
                svgData,
            },
        }

        const newItems = [...items, newItem]
        setItems(newItems)

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor)
        setIsDoodling(false)
    }

    const handleCancelDoodle = () => {
        setIsDoodling(false)
    }

    const handleNoteContentChange = (id: string, content: string) => {
        // 如果用户不是所有者，不允许修改内容
        if (!isOwner) return;

        // 查找要修改的便签
        const noteItem = items.find(item => item.id === id);
        if (!noteItem) return;

        // 检查内容是否真的变化了
        if (noteItem.data.content === content) return;

        // 更新items中的便签内容
        const newItems = items.map((item) =>
            item.id === id
                ? { ...item, data: { ...item.data, content } }
                : item
        );
        setItems(newItems);

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor);

        // 当内容变化时触发自动保存 - 使用增量更新
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {

            // 使用增量更新API
            const modifiedNote = newItems.find(item => item.id === id);
            if (modifiedNote && paperId && isSignedIn && user) {
                try {
                    // 直接发送增量更新请求，而不调用完整的savePaper函数
                    // 这样可以避免处理所有项目并触发全量更新
                    const endpoint = getApiUrl(`/api/papers/${paperId}/items`);

                    fetch(endpoint, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: user.uid,
                            newItems: [modifiedNote], // 只发送修改过的便签
                            lastModified: new Date().toISOString()
                        }),
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`便签增量更新失败: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {

                            // 更新最后保存的状态
                            lastSavedStateRef.current = {
                                ...lastSavedStateRef.current,
                                timestamp: Date.now()
                            };

                            // 如果服务器返回了更新后的数据，用它来更新我们的状态
                            // 这可以防止客户端和服务器状态不同步导致的重复ID问题
                            if (data && data.updatedItems && Array.isArray(data.updatedItems)) {
                                // 查找更新后的便签
                                const updatedNote = data.updatedItems.find((item: Item) => item.id === id);

                                if (updatedNote) {
                                    // 应用服务器的更新
                                    setItems(currentItems =>
                                        currentItems.map((item: Item) =>
                                            item.id === id ? updatedNote : item
                                        )
                                    );
                                }
                            }
                        })
                        .catch(error => {
                            console.error('便签增量更新失败，尝试完整保存:', error);
                            // 如果增量更新失败，回退到完整保存
                            savePaper();
                        });
                } catch (error) {
                    console.error('准备便签增量更新时出错，回退到完整保存:', error);
                    // 如果准备过程中出错，回退到完整保存
                    savePaper();
                }
            } else {
                // 如果找不到便签或缺少必要条件，执行完整保存
                savePaper();
            }
        }, 1000); // 延迟时间减少到1秒，因为只保存一项内容
    };

    // 新增：处理便签颜色变化的函数
    const handleNoteColorChange = (id: string, color: string) => {
        // 如果用户不是所有者，不允许修改内容
        if (!isOwner) return;

        // 查找要修改的便签
        const noteItem = items.find(item => item.id === id);
        if (!noteItem) return;

        // 检查颜色是否真的变化了
        if (noteItem.data.color === color) return;

        // 更新items中的便签颜色
        const newItems = items.map((item) =>
            item.id === id
                ? { ...item, data: { ...item.data, color } }
                : item
        );
        setItems(newItems);

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor);

        // 当颜色变化时触发自动保存 - 使用增量更新
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {

            // 使用增量更新API
            const modifiedNote = newItems.find(item => item.id === id);
            if (modifiedNote && paperId && isSignedIn && user) {
                try {
                    // 直接发送增量更新请求，而不调用完整的savePaper函数
                    const endpoint = getApiUrl(`/api/papers/${paperId}/items`);

                    fetch(endpoint, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: user.uid,
                            newItems: [modifiedNote], // 只发送修改过的便签
                            lastModified: new Date().toISOString()
                        }),
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`便签颜色增量更新失败: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {

                            // 更新最后保存的状态
                            lastSavedStateRef.current = {
                                ...lastSavedStateRef.current,
                                timestamp: Date.now()
                            };

                            // 如果服务器返回了更新后的数据，用它来更新我们的状态
                            // 这可以防止客户端和服务器状态不同步导致的重复ID问题
                            if (data && data.updatedItems && Array.isArray(data.updatedItems)) {
                                // 查找更新后的便签
                                const updatedNote = data.updatedItems.find((item: Item) => item.id === id);

                                if (updatedNote) {
                                    // 应用服务器的更新
                                    setItems(currentItems =>
                                        currentItems.map((item: Item) =>
                                            item.id === id ? updatedNote : item
                                        )
                                    );
                                }
                            }
                        })
                        .catch(error => {
                            console.error('便签颜色增量更新失败，尝试完整保存:', error);
                            // 如果增量更新失败，回退到完整保存
                            savePaper();
                        });
                } catch (error) {
                    console.error('准备便签颜色增量更新时出错，回退到完整保存:', error);
                    // 如果准备过程中出错，回退到完整保存
                    savePaper();
                }
            } else {
                // 如果找不到便签或缺少必要条件，执行完整保存
                savePaper();
            }
        }, 1000); // 延迟时间为1秒，因为只保存一项内容
    };

    const handleAddBackgroundRemover = (item: {
        id: string;
        src: string;
        initialPosition: { x: number; y: number };
        zIndex: number;
    }) => {
        // 始终使用新的唯一ID
        const newUniqueId = uuidv4();

        // create new item object
        const newItem: Item = {
            id: newUniqueId,
            position: item.initialPosition,
            zIndex: item.zIndex,
            rotation: Math.random() * 10 - 5, // random rotation angle
            type: "photo",
            data: {
                imageUrl: item.src,
                dateTaken: new Date().toLocaleDateString(), // use current date
                // 如果原始ID是AI图像ID格式，保存在aiRequestId中
                aiRequestId: item.id.startsWith('ai-image-') ? item.id : undefined
            },
        };

        // add to items array
        const newItems = [...items, newItem];
        setItems(newItems);

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor);
    };

    // Toggle media input mode
    const handleToggleMediaInput = () => {
        setIsMediaInput(!isMediaInput)
    }

    // 处理照片上传界面的显示与隐藏
    const handleTogglePhotoUpload = () => {
        setIsPhotoUpload(!isPhotoUpload)
    }

    // 处理刷子面板的显示与隐藏
    const handleToggleBrushPanel = () => {
        setIsBrushPanel(!isBrushPanel)
    }

    // 处理GIF保存
    const handleSaveGif = (file: File, originalUrl: string, isSticker: boolean = false, isLoading: boolean = false) => {
        // 生成随机位置
        const position = getRandomPositionInViewport(300, 300)

        // 使用当前最高z-index
        const newZIndex = highestZIndex + 1
        setHighestZIndex(newZIndex)

        // 如果是AI生成图像请求，使用不同的处理逻辑
        if (isLoading && originalUrl.startsWith('ai-image-')) {
            // 对于AI图像生成请求，生成一个临时项，稍后在生成完成后会被替换
            // 这个临时项不会被保存到历史记录中
            const loadingItem: Item = {
                id: uuidv4(), // 使用新的UUID作为项目ID
                position: position,
                zIndex: newZIndex,
                rotation: Math.random() * 10 - 5, // Random rotation
                type: "gif",
                data: {
                    imageUrl: originalUrl, // 临时使用requestId作为URL
                    dateTaken: new Date().toISOString(),
                    isGif: !isSticker,
                    isSticker: isSticker,
                    isLoading: true, // 标记为加载状态
                    aiRequestId: originalUrl, // 存储requestId以便后续匹配
                    originalGifUrl: originalUrl,
                    sizeFactor: isSticker
                        ? 0.6 + Math.random() * 0.4  // Sticker: Random value between 60% to 100%
                        : 0.7 + Math.random() * 0.2 // GIF: Random value between 70% to 90%
                }
            };

            // 将临时加载项添加到画布
            setItems(prev => [...prev, loadingItem]);

            // 不要将临时加载项添加到历史记录
            // AI图像生成完成后会创建一个新的历史记录点

            // 关闭照片上传面板
            setIsPhotoUpload(false);

            return;
        }

        // 为普通GIF或贴纸创建合适的项目
        const newItem: Item = {
            id: uuidv4(),
            position: position,
            zIndex: newZIndex,
            rotation: Math.random() * 10 - 5, // Random rotation
            type: "gif", // All items from this handler are type "gif"
            data: {
                imageUrl: originalUrl,
                dateTaken: new Date().toISOString(),
                isGif: !isSticker && !isLoading,
                isSticker: isSticker,
                isLoading: isLoading,
                originalGifUrl: originalUrl,
                // Apply random sizeFactor based on isSticker
                sizeFactor: isSticker
                    ? 0.6 + Math.random() * 0.4  // Sticker: Random value between 60% to 100%
                    : 0.7 + Math.random() * 0.2 // GIF: Random value between 70% to 90%
            },
        }

        const newItems = [...items, newItem]
        setItems(newItems)

        // 保存到历史记录
        saveToHistory(newItems, backgroundImage, backgroundColor)

        // 仅在moodboard页面使用WebSocket
        if (isMoodboardPage) {
            socketService.addItem(newItem);
        }

        setIsPhotoUpload(false)
    }

    // 修复: Upload background 函数
    const handleUploadBackground = (file: File, preserveColor?: boolean) => {
        // 如果文件大小为0，这是一个清除背景的请求
        const isClearRequest = file.size === 0;

        if (isClearRequest) {
            // 如果是清除请求，但要保留颜色

            // 清除背景图片
            setBackgroundImage('');

            // 如果不保留颜色，则清除背景颜色
            if (!preserveColor) {
                setBackgroundColor(null);
            }

            // 保存到历史记录
            saveToHistory([...items], '', preserveColor ? backgroundColor : null);

            // 通知WebSocket服务 - 仅在moodboard页面
            if (isMoodboardPage) {
                socketService.updateBackground({
                    backgroundImage: '',
                    backgroundColor: preserveColor ? backgroundColor || undefined : undefined
                });
            }

            return;
        }

        // 正常的背景图片上传逻辑
        const tempUrl = URL.createObjectURL(file)

        // 同时更新背景和历史记录，避免多次记录
        setBackgroundImage(tempUrl)

        // 直接从当前items获取并保存到历史记录，保留当前背景颜色
        saveToHistory([...items], tempUrl, backgroundColor);

        // 通知WebSocket服务 - 仅在moodboard页面
        if (isMoodboardPage) {
            socketService.updateBackground({ backgroundImage: tempUrl });
        }
    }

    // 修改：初始化空白画布的历史记录
    useEffect(() => {
        // 初始化一个空的历史记录条目
        if (history.length === 0) {
            setHistory([{ items: [], backgroundImage: undefined, backgroundColor: null }]);
            setHistoryIndex(0);
        }
    }, []);

    // 添加键盘快捷键支持
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 撤销：Ctrl+Z
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
            // 重做：Ctrl+Y 或 Ctrl+Shift+Z
            else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                handleRedo();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleUndo, handleRedo]);

    // 修改处理颜色变化的函数
    const handleColorChange = (color: string | null) => {
        // 避免不必要的状态更新和日志输出
        if (backgroundColor === color) {
            return;
        }

        // 记录上一个颜色，用于判断是否有变化
        const previousColor = backgroundColor;

        setBrushColor(color);
        setBackgroundColor(color);

        // 如果用户是所有者且颜色真的变了，触发自动保存
        if (isOwner && paperId && previousColor !== color) {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            autoSaveTimerRef.current = setTimeout(() => {
                savePaper();
            }, 500);
        }

        // 保存到历史记录
        saveToHistory([...items], backgroundImage, color);
    }

    // 新增：处理网格可见性变化的函数
    const handleGridVisibilityChange = (visible: boolean) => {
        setShowGrid(visible)

        // 如果用户是所有者，触发自动保存
        if (isOwner && paperId) {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            autoSaveTimerRef.current = setTimeout(() => {
                savePaper();
            }, 1000);
        }
    }

    // 新增：处理画布可滚动性变化的函数
    const handleCanvasScrollableChange = (scrollable: boolean, scale?: number) => {
        setCanvasScrollable(scrollable)
        // 不再使用scale参数，现在由canvasPages决定高度
        // if (scale !== undefined) {
        //    setCanvasScale(scale)
        // }

        // 如果用户是所有者，触发自动保存
        if (isOwner && paperId) {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            autoSaveTimerRef.current = setTimeout(() => {
                savePaper();
            }, 1000);
        }
    }

    // 新增：提前创建分享链接的状态
    const [sharePathCache, setSharePathCache] = useState<string | null>(null);

    // 新增：提前创建分享链接
    useEffect(() => {
        // 只在paper加载完成且有paperId时创建分享链接
        if (paperId && items.length > 0 && !sharePathCache) {

            const createSharePath = async () => {
                try {
                    // 生成有趣的分享路径
                    const uniqueSharePath = uniqueNamesGenerator({
                        dictionaries: [adjectives, colors, animals, names],
                        separator: '-',
                        length: 3,
                        style: 'lowerCase'
                    });

                    // 创建或更新分享链接
                    const shareResponse = await fetch(getApiUrl(`/api/papers/${paperId}/share`), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            sharePath: uniqueSharePath
                        }),
                    });

                    if (!shareResponse.ok) {
                        console.error('提前创建分享链接失败');
                        return;
                    }

                    const shareData = await shareResponse.json();
                    // 缓存分享路径
                    setSharePathCache(shareData.sharePath || uniqueSharePath);
                } catch (error) {
                    console.error('提前创建分享链接失败:', error);
                }
            };

            createSharePath();
        }
    }, [paperId, items.length, sharePathCache]);

    // 修改：处理分享功能，使用缓存的分享链接或立即创建
    const handleShare = async () => {
        if (!paperId || items.length === 0) return;

        // 设置加载状态
        setIsLoading(true);

        try {
            // 在分享前尝试保存当前更改
            try {
                await savePaper();
            } catch (error) {
                console.error("Error saving paper before sharing:", error);
                // 即使保存失败，也继续尝试分享
            }

            // 如果已有缓存的分享路径，直接使用
            if (sharePathCache) {
                router.push(`/share?id=${paperId}&path=${sharePathCache}`);
                return;
            }

            // 如果没有缓存，即时创建
            // 生成有趣的分享路径
            const uniqueSharePath = uniqueNamesGenerator({
                dictionaries: [adjectives, colors, animals, names],
                separator: '-',
                length: 3,
                style: 'lowerCase'
            });

            // 创建或更新分享链接
            const shareResponse = await fetch(getApiUrl(`/api/papers/${paperId}/share`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sharePath: uniqueSharePath
                }),
            });

            if (!shareResponse.ok) {
                throw new Error('创建分享链接失败');
            }

            const shareData = await shareResponse.json();
            const sharePath = shareData.sharePath || uniqueSharePath;

            // 缓存这个路径
            setSharePathCache(sharePath);

            // 跳转到分享页面
            router.push(`/share?id=${paperId}&path=${sharePath}`);
        } catch (error) {
            console.error('创建分享链接失败:', error);
            alert('创建分享链接时出错，请稍后再试');
            // 发生错误时重置加载状态
            setIsLoading(false);
        } finally {
            // 确保在路由跳转前修改状态
            setTimeout(() => {
                setIsLoading(false);
            }, 500); // 给予足够时间让路由跳转开始
        }
    };

    // 新增：处理Canvas页数变化的函数
    const handleCanvasPagesChange = (pages: number) => {
        // 确保页数不小于1
        const newPages = Math.max(1, pages);

        // 如果值没有变化，不执行操作
        if (newPages === canvasPages) {
            return;
        }

        const oldPages = canvasPages; // Store old page count for comparison
        setCanvasPages(newPages);

        const shouldScroll = newPages > 1;
        if (shouldScroll !== canvasScrollable) {
            setCanvasScrollable(shouldScroll);
            handleCanvasScrollableChange(shouldScroll);
        }

        // If page count decreases, adjust items and scroll position
        if (newPages < oldPages) {
            const estimatedItemHeight = 200; // Estimate item height for repositioning
            const viewportHeight = canvasRef.current ? canvasRef.current.clientHeight : window.innerHeight;
            let newMaxHeight: number;
            if (newPages === 1) {
                newMaxHeight = viewportHeight;
            } else {
                newMaxHeight = newPages * 1500;
            }

            const updatedItems = items.map(item => {
                // Check if item is beyond the new max height
                // Add a small buffer (e.g., 50px) below the item for comfortable positioning
                if (item.position.y + estimatedItemHeight > newMaxHeight) {
                    return {
                        ...item,
                        position: {
                            ...item.position,
                            // Reposition to be within the new max height, near the bottom
                            y: Math.max(0, newMaxHeight - estimatedItemHeight - 50)
                        }
                    };
                }
                return item;
            });
            setItems(updatedItems);
            saveToHistory(updatedItems, backgroundImage, backgroundColor); // Save changes to history

            // Adjust scroll position if current scroll is beyond new max height
            if (canvasRef.current) {
                // Calculate the maximum possible scrollTop
                const maxScrollTop = newMaxHeight - viewportHeight;
                if (canvasRef.current.scrollTop > maxScrollTop) {
                    canvasRef.current.scrollTop = Math.max(0, maxScrollTop);
                }
                // If newPages is 1, ensure scroll is at the top
                if (newPages === 1) {
                    canvasRef.current.scrollTop = 0;
                }
            }
        }


        // 如果用户是所有者，触发仅设置的增量更新保存
        if (isOwner && paperId) {
            // 清除之前的计时器
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }

            // 使用设置增量更新API直接更新设置，避免完整保存
            const incrementalSettingsSave = async () => {
                try {
                    const settingsEndpoint = getApiUrl(`/api/papers/${paperId}/settings`);

                    // 创建请求
                    const response = await fetch(settingsEndpoint, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: user?.uid,
                            canvasPages: newPages,
                            canvasScrollable: shouldScroll,
                            lastModified: new Date().toISOString()
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('更新设置失败');
                    }

                    // 更新最后保存的状态
                    lastSavedStateRef.current = {
                        ...lastSavedStateRef.current,
                        canvasPages: newPages,
                        canvasScrollable: shouldScroll,
                        timestamp: Date.now()
                    };
                } catch (error) {
                    console.error('保存页数时出错:', error);

                    // 如果增量更新失败，回退到完整保存
                    savePaper().catch(err => {
                        console.error('完整保存也失败:', err);
                    });
                }
            };

            // 立即执行增量保存
            incrementalSettingsSave();
        }
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <GridBackground
                imageUrl={backgroundImage}
                backgroundColor={backgroundColor || undefined}
                showGrid={showGrid}
            />

            {/* Home button - 添加Link返回主页 */}
            <div className="fixed top-4 left-4 z-50 flex gap-2">
                {/* Home button */}
                <Link href="/">
                    <button
                        className="p-3 bg-white/80 backdrop-blur-sm rounded-md shadow-sm hover:shadow hover:bg-white transition-all duration-300 ease-in-out transform hover:scale-[1.05]"
                        aria-label="Return to home"
                    >
                        <Bird className="w-5 h-5 text-gray-600" />
                    </button>
                </Link>

                {/* 移除保存按钮 */}
            </div>

            {/* Share button - 移到右上角 */}
            {isOwner && (
                <button
                    onClick={handleShare}
                    disabled={items.length === 0 || isLoading}
                    className="fixed top-4 right-4 z-50 p-3 bg-white/80 backdrop-blur-sm rounded-md shadow-sm hover:shadow hover:bg-white transition-all duration-300 ease-in-out transform hover:scale-[1.05] disabled:opacity-50 disabled:transform-none"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Send className={`w-5 h-5 ${items.length > 0 ? 'text-gray-600' : 'text-gray-300'}`} />
                    )}
                </button>
            )}

            {/* 移除ShareDialog组件 */}

            {/* Hidden file input */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {/* Canvas area - for placing photos, notes, and audio */}
            <div
                ref={canvasRef}
                className={`absolute inset-0 z-0 ${canvasScrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
                onContextMenu={handleCanvasContextMenu}
                onClick={handleCanvasClick}
            >
                <div
                    className="relative w-full h-full"
                    style={canvasScrollable ? {
                        minHeight: canvasPages === 1 ? '100vh' : `${canvasPages * 1500}px`
                    } : {}}
                >
                    {items.map((item) => (
                        <DraggableItem
                            key={item.id}
                            id={item.id}
                            initialPosition={item.position}
                            zIndex={item.zIndex}
                            rotation={item.rotation}
                            onPositionChange={handlePositionChange}
                            onDragStart={handleDragStart}
                            onDelete={handleDelete}
                            onDuplicate={() => {
                                // 复制 item 并放到随机位置
                                const position = getRandomPositionInViewport(320, 400)
                                const newZIndex = highestZIndex + 1
                                setHighestZIndex(newZIndex)

                                const newItems = [
                                    ...items,
                                    {
                                        ...item,
                                        id: uuidv4(),
                                        position: position,
                                        zIndex: newZIndex,
                                        rotation: Math.random() * 6 - 3
                                    }
                                ]
                                setItems(newItems)

                                // 保存到历史记录
                                saveToHistory(newItems, backgroundImage, backgroundColor)
                            }}
                            isEditable={isOwner}
                        >
                            {item.type === "photo" ? (
                                <div className="relative">
                                    <PolaroidContent imageUrl={item.data.imageUrl || ""} dateTaken={item.data.dateTaken} scale={item.data.scale} />
                                </div>
                            ) : item.type === "gif" ? (
                                <GifContent
                                    imageUrl={item.data.imageUrl || ""}
                                    sizeFactor={item.data.sizeFactor}
                                    isDragging={false}
                                    isSticker={item.data.isSticker}
                                    forcedLoading={item.data.isLoading}
                                />
                            ) : item.type === "note" ? (
                                <NoteContent
                                    color={item.data.color || "yellow"}
                                    content={item.data.content || ""}
                                    onContentChange={(content) => handleNoteContentChange(item.id, content)}
                                    onBringToFront={() => handleDragStart(item.id)}
                                    noteSize={item.data.noteSize}
                                    readOnly={!isOwner}
                                    onColorChange={(color) => handleNoteColorChange(item.id, color)}
                                />
                            ) : item.type === "media" ? (
                                <MediaContent initialUrl={item.data.spotifyUrl} />
                            ) : item.type === "doodle" ? (
                                <DoodleContent svgData={item.data.svgData || ""} />
                            ) : (
                                <AudioContent audioUrl={item.data.audioUrl || ""} waveColor={item.data.waveColor} />
                            )}
                        </DraggableItem>
                    ))}
                </div>
            </div>

            {/* Toolbar - When doodling mode, add animation class */}
            <div className="fixed bottom-0 left-0 right-0 w-full">
                <Toolbar
                    onAddPhoto={handleAddPhoto}
                    onAddNote={handleAddNote}
                    onRecordVoice={handleRecordVoice}
                    onAddMedia={handleAddMedia}
                    onAddDoodle={handleAddDoodle}
                    onSaveDoodle={handleSaveDoodle}
                    isRecording={isRecording}
                    isDoodling={isDoodling}
                    isMediaInput={isMediaInput}
                    isPhotoUpload={isPhotoUpload}
                    isBrushPanel={isBrushPanel}
                    onToggleMediaInput={handleToggleMediaInput}
                    onTogglePhotoUpload={handleTogglePhotoUpload}
                    onToggleBrushPanel={handleToggleBrushPanel}
                    onStopRecording={handleStopRecording}
                    onCancelRecording={handleCancelRecording}
                    onAddAIImage={handleAddAIImage}
                    onAddBackgroundRemover={handleAddBackgroundRemover}
                    onUploadBackground={handleUploadBackground}
                    onSaveGif={handleSaveGif}
                    onColorChange={handleColorChange}
                    onGridVisibilityChange={handleGridVisibilityChange}
                    onCanvasScrollableChange={handleCanvasScrollableChange}
                    onPaperCountChange={handleCanvasPagesChange}
                    initialCanvasPages={canvasPages}
                    initialBrushColor={brushColor}
                    initialShowGrid={showGrid}
                />
            </div>

            {/* Doodle canvas - Integrated into Toolbar */}
            {/* {isDoodling && <DoodleCanvas onSave={handleSaveDoodle} onCancel={handleCancelDoodle} />} */}

            {/* 画布右键菜单 */}
            {isOwner && (
                <CanvasContextMenu
                    visible={showCanvasContextMenu}
                    position={contextMenuPosition}
                    onClose={() => setShowCanvasContextMenu(false)}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={historyIndex > 0}
                    canRedo={historyIndex < history.length - 1}
                />
            )}

            <style jsx>{`
      @keyframes slide-up {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
      }
      
      .animate-slide-up {
        animation: slide-up 0.3s ease-out forwards;
      }
    `}</style>
        </div>
    )
}

// 加载时的占位内容
function PaperPageFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
        </div>
    );
}

export default function PaperPage() {
    return (
        <Suspense fallback={<PaperPageFallback />}>
            <PaperPageContent />
        </Suspense>
    );
} 