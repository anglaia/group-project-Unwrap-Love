"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"
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
import { Bird, X, Users, Globe } from 'lucide-react'
import Link from "next/link"
import axios from 'axios';
import Image from "next/image"
import CanvasContextMenu from "@/components/CanvasContextMenu"
import { getContextMenuState } from "@/components/ContextMenu"
import { BrushPanel } from "../../components/BrushPanel"
import * as socketService from "../../services/socketService"
import DateNavigation from "../../components/DateNavigation"
import { getApiUrl, getImageUrl, API_BASE_URL } from "@/config/apiConfig"



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
        isBase64Audio?: boolean
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

// Define an interface to store history state below the Item interface
interface HistoryState {
    items: Item[];
    backgroundImage?: string;
    backgroundColor?: string | null;
}

export default function MoodboardPage() {
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

    // WebSocket connection related states
    const [connectedUsers, setConnectedUsers] = useState(1)
    const [roomId, setRoomId] = useState<string>('moodboard-room') // Default room ID
    const [username, setUsername] = useState<string>('') // Username
    const [isConnected, setIsConnected] = useState(false) // WebSocket connection status
    const [wsError, setWsError] = useState<string | null>(null) // WebSocket error message

    // History and right-click menu related states using the new HistoryState interface
    const [history, setHistory] = useState<HistoryState[]>([]) // Operation history
    const [historyIndex, setHistoryIndex] = useState(-1) // Current history position
    const [showCanvasContextMenu, setShowCanvasContextMenu] = useState(false) // Whether to show canvas right-click menu
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 }) // Right-click menu position
    const [initialLoadCompleteAndSaved, setInitialLoadCompleteAndSaved] = useState<boolean>(false); // Tracks if initial items have been loaded and saved to history

    // Set background
    const [backgroundImage, setBackgroundImage] = useState<string | undefined>()

    // Background color state
    const [backgroundColor, setBackgroundColor] = useState<string | null>(null)

    // Grid display state
    const [showGrid, setShowGrid] = useState<boolean>(true)

    // Canvas scrollable state
    const [canvasScrollable, setCanvasScrollable] = useState<boolean>(true)

    // Canvas scale ratio
    const [canvasScale, setCanvasScale] = useState<number>(3)

    // 以下状态将保留但暂不使用
    const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isHistoryMode, setIsHistoryMode] = useState<boolean>(false);

    // Reconnection strategy constants
    const MAX_RECONNECT_ATTEMPTS = 5;
    const INITIAL_RETRY_DELAY_MS = 1000;
    const MAX_RETRY_DELAY_MS = 30000; // 30 seconds

    // State for WebSocket reconnection attempts
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Reset grid display localStorage value to true when the component loads
    useEffect(() => {
        try {
            localStorage.setItem('brushPanel_showGrid', 'true')
            localStorage.setItem('brushPanel_canvasScrollable', 'true')
            localStorage.setItem('brushPanel_canvasScale', '3')
        } catch (error) {
            console.error('Failed to reset visibility settings in localStorage:', error)
        }
    }, [])

    // Initialize WebSocket connection on component load
    useEffect(() => {
        // Generate random username
        const randomUsername = `User${Math.floor(Math.random() * 10000)}`;
        setUsername(randomUsername);

        try {
            // Create WebSocket connection
            const socket = socketService.createSocketConnection();

            if (!socket) {
                console.error("Unable to create WebSocket connection");
                setWsError("Cannot connect to server, collaboration features unavailable");
                return;
            }

            // Join default room
            socketService.joinRoom(roomId, randomUsername);

            // Set connection status
            setIsConnected(socketService.isConnected());

            // Listen for connection status changes
            const handleConnect = () => {
                setIsConnected(true);
                setWsError(null);
                setReconnectAttempt(0); // Reset on successful connection
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                    reconnectTimerRef.current = null;
                }
                console.log("WebSocket connected successfully. Reconnect attempts reset.");
                // Ensure to join room if not automatically handled by socketService on reconnect
                // socketService.joinRoom(roomId, randomUsername); // This might be needed if reconnect creates a new socket instance
            };

            const handleDisconnect = () => {
                setIsConnected(false);
                // General disconnect message, specific retry messages will come from handleConnectError
                if (reconnectAttempt === 0) { // Only set general message if not already in a retry cycle
                    setWsError("Disconnected. Attempting to reconnect if connection is lost...");
                }
            };

            const handleConnectError = (error: Error) => {
                setIsConnected(false); // Ensure isConnected is false
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                }

                if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(
                        INITIAL_RETRY_DELAY_MS * Math.pow(2, reconnectAttempt),
                        MAX_RETRY_DELAY_MS
                    );

                    setWsError(`Connection error: ${error.message}. Reconnecting in ${delay / 1000}s (Attempt ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS}).`);

                    reconnectTimerRef.current = setTimeout(() => {
                        console.log(`Attempting reconnect: ${reconnectAttempt + 1}`);
                        socketService.reconnect();
                        setReconnectAttempt(prev => prev + 1);
                    }, delay);
                } else {
                    setWsError(`Connection error: ${error.message}. Max reconnect attempts reached. Please check your connection or refresh the page.`);
                    console.error("Max reconnect attempts reached for WebSocket.");
                }
            };

            socketService.onEvent('connect', handleConnect);
            socketService.onEvent('disconnect', handleDisconnect);
            socketService.onEvent('connect_error', handleConnectError);

            // Listen for room state updates
            socketService.onEvent('room-state', handleRoomState);

            // Listen for user joining
            socketService.onEvent('user-joined', handleUserJoined);

            // Listen for user leaving
            socketService.onEvent('user-left', handleUserLeft);

            // Listen for item updates
            socketService.onEvent('item-added', handleRemoteItemAdded);
            socketService.onEvent('item-updated', handleRemoteItemUpdated);
            socketService.onEvent('item-deleted', handleRemoteItemDeleted);

            // Listen for background updates
            socketService.onEvent('background-updated', handleBackgroundUpdated);

            // Listen for canvas sync
            socketService.onEvent('canvas-synced', (data: {
                items: Item[],
                background: {
                    backgroundImage?: string,
                    backgroundColor?: string,
                    showGrid?: boolean,
                    canvasScrollable?: boolean,
                    canvasScale?: number
                }
            }) => {
                console.log('Received complete canvas sync');

                // Update items
                setItems(data.items);

                // Update highest z-index
                const maxZ = Math.max(...data.items.map(i => i.zIndex), 10);
                setHighestZIndex(maxZ);

                // Update background settings
                if (data.background) {
                    if (data.background.backgroundImage !== undefined) {
                        setBackgroundImage(data.background.backgroundImage);
                    }

                    if (data.background.backgroundColor !== undefined) {
                        setBackgroundColor(data.background.backgroundColor);
                    }

                    if (data.background.showGrid !== undefined) {
                        setShowGrid(data.background.showGrid);
                    }

                    if (data.background.canvasScrollable !== undefined) {
                        setCanvasScrollable(data.background.canvasScrollable);
                    }
                }
            });

            // Clean up on component unmount
            return () => {
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                }
                socketService.offEvent('connect', handleConnect);
                socketService.offEvent('disconnect', handleDisconnect);
                socketService.offEvent('connect_error', handleConnectError);
                socketService.offEvent('room-state');
                socketService.offEvent('user-joined');
                socketService.offEvent('user-left');
                socketService.offEvent('item-added');
                socketService.offEvent('item-updated');
                socketService.offEvent('item-deleted');
                socketService.offEvent('background-updated');
                socketService.offEvent('canvas-synced');
                socketService.disconnectSocket();
            };
        } catch (error) {
            console.error("Error initializing WebSocket:", error);
            setWsError("Error during connection initialization, collaboration features unavailable");
        }
    }, [roomId]);

    // WebSocket event handlers
    const handleRoomState = useCallback((state: {
        items: Item[],
        backgroundImage?: string,
        backgroundColor?: string,
        showGrid?: boolean,
        users: number
    }) => {
        console.log('Received room state:', state);
        // Only accept remote state when there are no local items
        if (items.length === 0) {
            setItems(state.items);

            // Set highest z-index
            const maxZ = Math.max(...state.items.map(i => i.zIndex), 10);
            setHighestZIndex(maxZ);

            // Set background
            if (state.backgroundImage !== undefined) {
                setBackgroundImage(state.backgroundImage);
            }

            if (state.backgroundColor !== undefined) {
                setBackgroundColor(state.backgroundColor);
            }

            if (state.showGrid !== undefined) {
                setShowGrid(state.showGrid);
            }

            // If we received items from server, make sure we add a history entry for this state
            if (state.items.length > 0) {
                // We don't call saveToHistory here directly because the state update hasn't been applied yet
                // Instead, our useEffect will detect the new items and save to history
                console.log('Received initial room state with items, will save to history');
            }
        }

        // Update online user count
        setConnectedUsers(state.users);
    }, [items.length]);

    const handleUserJoined = useCallback((user: { id: string, username: string }) => {
        console.log(`User joined: ${user.username} (${user.id})`);
        setConnectedUsers(prev => prev + 1);
    }, []);

    const handleUserLeft = useCallback((userId: string) => {
        console.log(`User left: ${userId}`);
        setConnectedUsers(prev => Math.max(1, prev - 1));
    }, []);

    const handleRemoteItemAdded = useCallback((item: Item) => {
        console.log('Received remote item addition:', item);

        // Special handling for audio items
        let processedItem = { ...item };

        if (item.type === "audio" && item.data.audioUrl) {
            // Check if it contains base64 audio data
            if (item.data.audioUrl.startsWith('data:audio/') ||
                (item.data.audioUrl.startsWith('data:') && item.data.isBase64Audio)) {
                console.log('Received base64 audio data, setting isBase64Audio flag and ensuring waveColor');
                // Ensure isBase64Audio flag is set and waveColor exists
                const colors = [
                    "#ec4899", // Pink
                    "#3b82f6", // Blue
                    "#10b981", // Green
                    "#f59e0b", // Amber
                    "#8b5cf6", // Purple
                    "#ef4444", // Red
                    "#06b6d4", // Cyan
                ];

                processedItem = {
                    ...item,
                    data: {
                        ...item.data,
                        isBase64Audio: true,
                        waveColor: item.data.waveColor || colors[Math.floor(Math.random() * colors.length)]
                    }
                };
            } else if (item.data.audioUrl.startsWith('blob:')) {
                console.warn('Received blob URL audio, other users may not be able to play:', item.id);
            }
        }

        setItems(prev => [...prev, processedItem]);

        // Update highest z-index
        if (processedItem.zIndex > highestZIndex) {
            setHighestZIndex(processedItem.zIndex);
        }
    }, [highestZIndex]);

    const handleRemoteItemUpdated = useCallback((updatedItem: Item) => {
        console.log('Received remote item update:', updatedItem);
        setItems(prev => prev.map(item =>
            item.id === updatedItem.id ? updatedItem : item
        ));

        // Update highest z-index
        if (updatedItem.zIndex > highestZIndex) {
            setHighestZIndex(updatedItem.zIndex);
        }
    }, [highestZIndex]);

    const handleRemoteItemDeleted = useCallback((itemId: string) => {
        console.log('Received remote item deletion:', itemId);
        setItems(prev => prev.filter(item => item.id !== itemId));
    }, []);

    const handleBackgroundUpdated = useCallback((data: {
        backgroundImage?: string,
        backgroundColor?: string,
        showGrid?: boolean,
        canvasScrollable?: boolean,
        canvasScale?: number
    }) => {
        console.log('Received remote background update:', data);

        if (data.backgroundImage !== undefined) {
            setBackgroundImage(data.backgroundImage);
        }

        if (data.backgroundColor !== undefined) {
            setBackgroundColor(data.backgroundColor);
        }

        if (data.showGrid !== undefined) {
            setShowGrid(data.showGrid);
        }

        if (data.canvasScrollable !== undefined) {
            setCanvasScrollable(data.canvasScrollable);
        }

        // 不再根据远程数据更新canvasScale
        // if (data.canvasScale !== undefined) {
        //     setCanvasScale(data.canvasScale);
        // }
    }, []);

    // Save to history function with WebSocket support
    const saveToHistory = useCallback((newItems: Item[], newBackground?: string, newBackgroundColor?: string | null) => {
        // Prevent adding duplicate history records
        if (history.length > 0 && historyIndex >= 0) {
            const lastHistoryState = history[historyIndex];

            // Check if there was an actual change
            const backgroundChanged = newBackground !== undefined && newBackground !== lastHistoryState.backgroundImage;
            const backgroundColorChanged = newBackgroundColor !== undefined && newBackgroundColor !== lastHistoryState.backgroundColor;

            // If only background changed or item count changed, we consider it a valid change
            if (backgroundChanged || backgroundColorChanged || lastHistoryState.items.length !== newItems.length) {
                // This is a valid change, continue saving
            } else {
                // Check if items have substantive changes
                let itemsChanged = false;

                // Deep comparison of items, check for property changes
                for (let i = 0; i < newItems.length; i++) {
                    const newItem = newItems[i];
                    const oldItem = lastHistoryState.items.find(item => item.id === newItem.id);

                    // If old item not found, a change occurred
                    if (!oldItem) {
                        itemsChanged = true;
                        break;
                    }

                    // Check if key properties have changed (ignoring isLoading state)
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

                // If no substantive changes, don't save new history
                if (!itemsChanged && !backgroundChanged && !backgroundColorChanged) {
                    return;
                }
            }
        }

        // Filter out loading AI images
        const filteredItems = newItems.filter(item => {
            return !(item.data.isLoading && item.data.imageUrl && item.data.imageUrl.startsWith('ai-image-'));
        });

        // Truncate history record
        if (historyIndex < history.length - 1) {
            setHistory(history.slice(0, historyIndex + 1));
        }

        // Add new state to history record
        setHistory(prev => [...prev, {
            items: [...filteredItems],
            backgroundImage: newBackground !== undefined ? newBackground : backgroundImage,
            backgroundColor: newBackgroundColor !== undefined ? newBackgroundColor : backgroundColor
        }]);
        setHistoryIndex(prev => prev + 1);
    }, [history, historyIndex, backgroundImage, backgroundColor]);

    // Undo operation - ensure it doesn't affect loading AI images
    const handleUndo = useCallback(() => {
        let canUndoThisStep = false;
        if (initialLoadCompleteAndSaved) {
            // If initial load with items was saved, we can't undo to the true empty state (history[0]).
            // The earliest we can go back to is the loaded state itself (history[1]).
            // So, undo is possible if current historyIndex is > 1.
            canUndoThisStep = historyIndex > 1;
        } else {
            // Initial load either didn't happen (board started empty) or didn't have items.
            // We can undo to the true empty state (history[0]).
            // So, undo is possible if current historyIndex is > 0.
            canUndoThisStep = historyIndex > 0;
        }

        if (canUndoThisStep) {
            // Get previous state
            const prevState = history[historyIndex - 1];

            // Update current state with previous state
            setItems(prevState.items);
            setBackgroundImage(prevState.backgroundImage);
            setBackgroundColor(prevState.backgroundColor || null);

            // Move history pointer back
            setHistoryIndex(historyIndex - 1);

            // Send canvas sync via WebSocket to keep other clients in sync
            socketService.syncCanvasState(
                prevState.items,
                {
                    backgroundImage: prevState.backgroundImage,
                    backgroundColor: prevState.backgroundColor || undefined,
                    showGrid
                }
            );
        }
    }, [historyIndex, history, showGrid, initialLoadCompleteAndSaved]);

    // Redo operation - ensure it doesn't affect loading AI images
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            // Get next state
            const nextState = history[historyIndex + 1];

            // Update current state with next state
            setItems(nextState.items);
            setBackgroundImage(nextState.backgroundImage);
            setBackgroundColor(nextState.backgroundColor || null);

            // Move history pointer forward
            setHistoryIndex(historyIndex + 1);

            // Send canvas sync via WebSocket to keep other clients in sync
            socketService.syncCanvasState(
                nextState.items,
                {
                    backgroundImage: nextState.backgroundImage,
                    backgroundColor: nextState.backgroundColor || undefined,
                    showGrid
                }
            );
        }
    }, [historyIndex, history, showGrid]);

    // Handle canvas right-click menu
    const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
        // First check if a menu is already open
        const { anyMenuOpen } = getContextMenuState();

        // If a menu is already open, prevent default and return
        if (anyMenuOpen) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Check if click is on the canvas, not on a component
        if (e.target === canvasRef.current || e.currentTarget === canvasRef.current) {
            e.preventDefault();
            e.stopPropagation();
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            setShowCanvasContextMenu(true);
        }
    }, []);

    // Handle canvas click event, close any open menus
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        // If a menu is open, close it
        if (showCanvasContextMenu) {
            setShowCanvasContextMenu(false);
        }
    }, [showCanvasContextMenu]);

    // Remove user authentication check
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();

    // Helper function to calculate random position in current viewport
    const getRandomPositionInViewport = (itemWidth: number, itemHeight: number) => {
        // 获取画布元素
        const canvasElement = canvasRef.current;
        if (!canvasElement) {
            // 如果画布元素不存在，使用窗口尺寸作为备选
            const maxX = window.innerWidth - itemWidth - 100;
            const maxY = window.innerHeight - itemHeight - 100;

            // 生成随机位置，避开边缘
            const randomX = Math.max(50, Math.random() * maxX);
            const randomY = Math.max(50, Math.random() * maxY);

            return { x: randomX, y: randomY };
        }

        // 获取当前视口的滚动位置和尺寸
        const scrollTop = canvasElement.scrollTop;
        const viewportWidth = canvasElement.clientWidth;
        const viewportHeight = canvasElement.clientHeight;

        // 计算水平方向的随机位置（限制在可见区域内）
        const maxX = viewportWidth - itemWidth - 100;
        const randomX = Math.max(50, Math.random() * maxX);

        // 计算垂直方向的随机位置（考虑当前滚动位置）
        // 在当前视口内放置项目
        const maxY = viewportHeight - itemHeight - 100;
        const randomY = scrollTop + Math.max(50, Math.random() * maxY);

        // 确保Y坐标不超过画布总高度
        const finalY = Math.min(randomY, 6000 - itemHeight - 50);

        return { x: randomX, y: finalY };
    }

    // 添加直接上传音频文件的辅助函数
    const uploadAudioFile = async (audioBlob: Blob): Promise<string> => {
        try {
            console.log(`Uploading audio file, size: ${audioBlob.size}...`);

            // 获取MIME类型
            const mimeType = audioBlob.type || 'audio/webm';

            // 确定文件扩展名
            let fileExtension = 'webm';
            if (mimeType.includes('mp4')) fileExtension = 'mp4';
            else if (mimeType.includes('mp3')) fileExtension = 'mp3';
            else if (mimeType.includes('aac')) fileExtension = 'aac';
            else if (mimeType.includes('wav')) fileExtension = 'wav';

            // 创建FormData对象
            const formData = new FormData();
            const file = new File([audioBlob], `audio.${fileExtension}`, { type: mimeType });
            formData.append("audio", file);

            // 使用fetch API上传
            const response = await fetch(getApiUrl('/api/upload/audio'), {
                method: 'POST',
                body: formData,
                // 不使用credentials，以避免CORS问题
                mode: 'cors',
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error(`Upload failed with status ${response.status}`);
            }

            const result = await response.json();

            if (result.url) {
                const fullUrl = getImageUrl(result.url);
                console.log("File uploaded successfully, URL:", result.url);
                return fullUrl;
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error('Direct upload failed:', error);
            throw error;
        }
    };

    // Modify handleStopRecording function
    const handleStopRecording = useCallback(async () => {
        try {
            // 检测是否为Safari浏览器
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            console.log(`[MoodboardPage] 浏览器检测: ${isSafari ? 'Safari' : '其他浏览器'}`);

            // 立即设置不在录音状态，这样会关闭录音面板
            setIsRecording(false)

            // 先停止录音，获取blob URL
            const audioUrl = await audioRecorder.stopRecording()

            // 如果 audioUrl 为空或者未定义，则不继续执行
            if (!audioUrl) {
                console.warn("Stopping recording did not yield an audio URL. No item will be created.");
                return;
            }

            console.log("Recording stopped, audio URL:", audioUrl);

            // Use helper function to get random position
            const position = getRandomPositionInViewport(320, 300)

            // New audio uses current highest z-index
            const newZIndex = highestZIndex + 1
            setHighestZIndex(newZIndex)

            // Random rotation angle between -5 and 5 degrees
            const rotation = Math.random() * 10 - 5

            // Choose a random waveform color
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

            // 创建一个新的音频项，使用本地 blob URL
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
            const tempItems = [...items, newItem]
            setItems(tempItems)

            // 保存到历史记录
            saveToHistory(tempItems, backgroundImage, backgroundColor)

            console.log(`创建新音频项: ID=${newItemId}, 位置=(${position.x}, ${position.y}), zIndex=${newZIndex}`);

            // 立即通过WebSocket发送音频项 - 先尝试转换为Base64
            if (isConnected) {
                try {
                    console.log('尝试立即通过WebSocket共享音频项');
                    // 获取blob数据
                    const response = await fetch(audioUrl);
                    const blob = await response.blob();

                    // 转换为base64
                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve) => {
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            resolve(base64data);
                        };
                    });
                    reader.readAsDataURL(blob);

                    // 等待转换完成
                    const base64Audio = await base64Promise;

                    // 创建可共享的项目（使用base64数据）
                    const shareableItem = {
                        ...newItem,
                        data: {
                            ...newItem.data,
                            audioUrl: base64Audio,
                            isBase64Audio: true
                        }
                    };

                    // 发送可共享项目
                    socketService.addItem(shareableItem);
                    console.log('已通过WebSocket发送音频项（使用base64数据）');
                } catch (err) {
                    console.error('准备音频项用于WebSocket共享失败:', err);
                }
            }

            // 在后台上传录音文件到服务器
            if (audioUrl.startsWith('blob:')) {
                // 不等待上传完成，在后台处理
                (async () => {
                    try {
                        // 获取blob数据
                        const response = await fetch(audioUrl);
                        const blob = await response.blob();
                        let serverAudioUrl = '';
                        let uploadSuccess = false;

                        // 尝试使用直接上传方法
                        try {
                            // 使用blob的实际MIME类型
                            const mimeType = blob.type || 'audio/webm';
                            console.log(`音频MIME类型: ${mimeType}`);

                            // 确定文件扩展名
                            let fileExtension = 'webm';
                            if (mimeType.includes('mp4')) fileExtension = 'mp4';
                            else if (mimeType.includes('mp3')) fileExtension = 'mp3';
                            else if (mimeType.includes('aac')) fileExtension = 'aac';
                            else if (mimeType.includes('wav')) fileExtension = 'wav';

                            const file = new File([blob], `audio.${fileExtension}`, { type: mimeType });
                            serverAudioUrl = await uploadAudioFile(file);
                            uploadSuccess = true;
                            console.log('Audio uploaded successfully using direct method');
                        } catch (uploadError) {
                            console.warn('Failed to upload using direct method:', uploadError);

                            // 继续尝试其他方法
                            // 方法 1: 使用 fetch API
                            try {
                                // Convert blob to base64
                                const reader = new FileReader();
                                const base64Promise = new Promise<string>((resolve) => {
                                    reader.onloadend = () => {
                                        const base64data = reader.result as string;
                                        resolve(base64data);
                                    };
                                });
                                reader.readAsDataURL(blob);

                                // Wait for conversion to complete
                                const base64Audio = await base64Promise;

                                // Upload to server
                                const uploadResponse = await fetch(getApiUrl('/api/audio/upload'), {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        base64Audio,
                                        // 添加浏览器信息，帮助服务器决定如何处理
                                        browser: isSafari ? 'safari' : 'other',
                                        mimeType: blob.type
                                    }),
                                    credentials: 'include'
                                });

                                if (uploadResponse.ok) {
                                    const uploadResult = await uploadResponse.json();
                                    if (uploadResult.success) {
                                        // Use server-returned permanent URL
                                        serverAudioUrl = getApiUrl(uploadResult.audioUrl);
                                        uploadSuccess = true;
                                        console.log('Audio uploaded successfully using Method 1');
                                    }
                                }
                            } catch (err) {
                                console.warn('Failed to upload audio using Method 1:', err);
                            }

                            // 方法 2: 使用更多表单数据
                            if (!uploadSuccess) {
                                try {
                                    console.log('Trying alternative upload method...');

                                    // 创建 FormData
                                    const formData = new FormData();

                                    // 使用blob的实际MIME类型
                                    const mimeType = blob.type || 'audio/webm';

                                    // 确定文件扩展名
                                    let fileExtension = 'webm';
                                    if (mimeType.includes('mp4')) fileExtension = 'mp4';
                                    else if (mimeType.includes('mp3')) fileExtension = 'mp3';
                                    else if (mimeType.includes('aac')) fileExtension = 'aac';
                                    else if (mimeType.includes('wav')) fileExtension = 'wav';

                                    const file = new File([blob], `audio.${fileExtension}`, { type: mimeType });
                                    formData.append('audio', file);
                                    // 添加浏览器信息
                                    formData.append('browser', isSafari ? 'safari' : 'other');
                                    formData.append('originalMimeType', mimeType);

                                    // 直接上传到文件上传端点
                                    const uploadResponse = await fetch(getApiUrl('/api/upload/audio'), {
                                        method: 'POST',
                                        body: formData,
                                        credentials: 'include'
                                    });

                                    if (uploadResponse.ok) {
                                        const uploadResult = await uploadResponse.json();
                                        if (uploadResult.url) {
                                            // 构建完整 URL
                                            serverAudioUrl = getImageUrl(uploadResult.url);
                                            uploadSuccess = true;
                                            console.log('Audio uploaded successfully using Method 2');
                                        }
                                    }
                                } catch (err) {
                                    console.warn('Failed to upload audio using Method 2:', err);
                                }
                            }
                        }

                        if (uploadSuccess && serverAudioUrl) {
                            // 上传成功后更新项目的URL
                            setItems(prevItems =>
                                prevItems.map(item =>
                                    item.id === newItemId
                                        ? {
                                            ...item,
                                            data: {
                                                ...item.data,
                                                audioUrl: serverAudioUrl,
                                                originalBlobUrl: audioUrl // 保存原始blob URL作为备份
                                            }
                                        }
                                        : item
                                )
                            );
                            console.log('Audio uploaded to server in background, permanent URL:', serverAudioUrl);

                            // 服务器URL可用时，再次发送更新
                            if (isConnected) {
                                try {
                                    // 获取最新的项目状态
                                    const latestItems = await new Promise<Item[]>(resolve => {
                                        setItems(current => {
                                            resolve(current);
                                            return current;
                                        });
                                    });

                                    const currentItem = latestItems.find(item => item.id === newItemId);

                                    if (currentItem) {
                                        // 使用服务器URL更新项目
                                        const updatedItem = {
                                            ...currentItem,
                                            data: {
                                                ...currentItem.data,
                                                audioUrl: serverAudioUrl
                                            }
                                        };

                                        // 发送更新
                                        socketService.updateItem(updatedItem);
                                        console.log('已通过WebSocket更新音频项（使用服务器URL）');
                                    }
                                } catch (err) {
                                    console.error('更新WebSocket音频项失败:', err);
                                }
                            }
                        }
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
    }, [highestZIndex, items, saveToHistory, setHighestZIndex, setItems, setIsRecording, isConnected, backgroundImage, backgroundColor])

    // Load all AI images
    useEffect(() => {
        const fetchAIImages = async () => {
            let retryCount = 0;
            const maxRetries = 3;

            const tryFetchImages = async () => {
                try {
                    // Modify API request, add timeout and retry
                    const apiClient = axios.create({
                        baseURL: API_BASE_URL,
                        timeout: 10000, // 10 second timeout
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    // Try to get AI images
                    console.log(`Fetching AI image list... (attempt ${retryCount + 1}/${maxRetries + 1})`);
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
                    console.log(`Successfully loaded ${formattedItems.length} AI images`);
                } catch (err) {
                    console.error("Failed to fetch AI images", err);

                    // Retry logic
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Retrying in 2 seconds... (${retryCount}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                        return tryFetchImages();
                    } else {
                        console.error("Max retries reached, giving up on fetching AI images");
                        // Can add UI notification here, but don't affect basic functionality
                    }
                }
            };

            await tryFetchImages();
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

    // Handle record button click - modified to start recording directly, no longer toggle operation
    const handleRecordVoice = () => {
        if (!isRecording) {
            handleStartRecording()
        }
    }

    // Add cancel recording handler
    const handleCancelRecording = useCallback(() => {
        // Stop recorder but don't save recording
        audioRecorder.cancelRecording().then(() => {
            setIsRecording(false)
            console.log('Recording cancelled')
        }).catch(error => {
            console.error("Failed to cancel recording:", error)
            setIsRecording(false)
        })
    }, [])

    // Handle adding photo
    const handleAddPhoto = (file: File) => {
        handleUploadPhoto(file)
    }

    // Modify handleUploadPhoto function
    const handleUploadPhoto = async (file: File) => {
        // Create a temporary URL for immediate display
        const tempImageUrl = URL.createObjectURL(file)

        // Extract photo date
        const dateTaken = await extractImageDate(file)

        // Use helper function to get random position
        const position = getRandomPositionInViewport(200, 300)

        // New photo uses current highest z-index
        const newZIndex = highestZIndex + 1
        setHighestZIndex(newZIndex)

        // Random rotation angle between -5 and 5 degrees
        const rotation = Math.random() * 10 - 5

        // Generate random scale factor (0.7 to 1.3)
        const scale = 0.7 + Math.random() * 0.6

        // Create initial item with temporary URL
        const newItem: Item = {
            id: uuidv4(),
            position: position,
            zIndex: newZIndex,
            rotation,
            type: "photo",
            data: {
                imageUrl: tempImageUrl,
                dateTaken,
                scale,  // Save random scale factor
            },
        }

        // Add to items array immediately for better UX
        const newItems = [...items, newItem]
        setItems(newItems)

        // Upload the image to the server for persistence
        try {
            // Create a FormData object
            const formData = new FormData()
            formData.append('image', file)

            // Upload the image to the server
            const uploadResponse = await fetch(getApiUrl('/api/upload/image'), {
                method: 'POST',
                body: formData,
            })

            if (!uploadResponse.ok) {
                throw new Error('Image upload failed')
            }

            const uploadResult = await uploadResponse.json()

            // Update the item with the permanent server URL
            const serverImageUrl = getApiUrl(uploadResult.url)

            // Create an updated item with the server URL
            const updatedItem = {
                ...newItem,
                data: {
                    ...newItem.data,
                    imageUrl: serverImageUrl,
                    originalBlobUrl: tempImageUrl, // Keep the original blob URL as a backup
                },
            }

            // Update the state
            setItems(prevItems => prevItems.map(item =>
                item.id === newItem.id ? updatedItem : item
            ))

            console.log('Image uploaded to server, permanent URL:', serverImageUrl)

            // Send new item notification via WebSocket - with server URL
            if (isConnected) {
                socketService.addItem(updatedItem)
                console.log('Sent photo item via WebSocket (using server URL):', updatedItem.id)
            }

            // Save to history record - using updated items
            saveToHistory(newItems, backgroundImage, backgroundColor)
        } catch (error) {
            console.error('Failed to upload image to server:', error)
            // Keep using the blob URL if upload fails, but log the error

            // Send new item notification via WebSocket - with blob URL as fallback
            if (isConnected) {
                socketService.addItem(newItem)
                console.log('Sent photo item via WebSocket (using local URL):', newItem.id)
            }

            // Save to history record - using original items with blob URL
            saveToHistory([...items], backgroundImage, backgroundColor)
        }
    }

    // Keep original fileInput handler for compatibility and fallback
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

    // Modify handlePositionChange function, add optional parameter to control whether to save history
    const handlePositionChange = async (id: string, newPosition: { x: number; y: number }, shouldSaveHistory: boolean = false) => {
        const targetItem = items.find(item => item.id === id);

        if (!targetItem) return;

        let yPosition = typeof newPosition.y === 'number' ? newPosition.y : 0;
        const xPosition = typeof newPosition.x === 'number' ? newPosition.x : 0;

        // Apply Y-axis constraints if canvas is scrollable
        if (canvasScrollable) { // No canvasPages check needed for moodboard as it has a fixed scroll height
            const estimatedItemHeight = 200; // Consistent item height estimation
            const topBuffer = -400;         // Allow item to go 400px off-screen at the top
            const bottomBuffer = 200;       // Buffer from the absolute bottom edge of item content

            const maxCanvasHeight = 6000; // Moodboard's fixed scrollable height

            // Calculate maximum Y position: canvas height - item height - bottom buffer
            const maxYPosition = maxCanvasHeight - estimatedItemHeight - bottomBuffer;

            yPosition = Math.min(yPosition, maxYPosition);
            yPosition = Math.max(topBuffer, yPosition); // Apply top buffer as minimum Y
        }
        // If not canvasScrollable, no Y-axis constraints are applied here.

        const finalPosition = { x: xPosition, y: yPosition };

        const newItems = items.map((item) =>
            (item.id === id ? { ...item, position: finalPosition } : item)
        );
        setItems(newItems);

        // Only save history when drag ends (shouldSaveHistory is true)
        if (shouldSaveHistory) {
            saveToHistory(newItems, backgroundImage, backgroundColor);

            // Send update via WebSocket
            const updatedItem = {
                ...targetItem,
                position: finalPosition // Use the potentially constrained position
                // 完整包含项目属性，确保zIndex也被传输
            };
            socketService.updateItem(updatedItem);
        }

        // Backend API call with error handling
        if (targetItem && targetItem.type === "photo" && targetItem.data.imageUrl?.includes("/upload/aiImage")) {
            try {
                await axios.patch(getApiUrl('/api/ai/aiImage/update-position'), {
                    id,
                    position: finalPosition,
                    zIndex: targetItem.zIndex, // 确保zIndex被包含
                }, {
                    timeout: 5000 // 5 second timeout
                });
                console.log("MongoDB updated successfully" +
                    `ID: ${id} ➜ new position: x=${finalPosition.x}, y=${finalPosition.y}, zIndex=${targetItem.zIndex}`);
            } catch (err) {
                // API errors don't block user experience, just log
                console.error("Failed to update position in MongoDB", err);
            }
        }
    };

    // Modify handleDelete function, add WebSocket support and incremental update
    const handleDelete = async (id: string, imageUrl?: string) => {
        try {
            // Original backend call remains unchanged, but added error handling
            if (imageUrl && imageUrl.includes("/upload/aiImage")) {
                try {
                    const filename = imageUrl.split("/").pop();
                    await axios.delete(getApiUrl(`/api/ai/aiImage/by-id/${id}`), {
                        timeout: 5000 // 5 seconds timeout
                    });
                    console.log("AI image deleted", filename);
                } catch (apiErr) {
                    // API error does not block user experience, just logs
                    console.error("删除服务器图像失败，但继续本地删除", apiErr);
                }
            }

            // Remove project from state
            const newItems = items.filter(item => item.id !== id);
            setItems(newItems);

            // Save to history
            saveToHistory(newItems, backgroundImage, backgroundColor);

            // Send delete via WebSocket
            socketService.deleteItem(id);
        } catch (err) {
            console.error("Failed to delete item", err);
        }
    }


    // Modify handleDragStart function to save history
    const handleDragStart = (id: string) => {
        const targetItem = items.find(item => item.id === id);
        if (!targetItem) return;

        const newZIndex = highestZIndex + 1;

        // 先更新 highestZIndex，确保后续操作使用新值
        setHighestZIndex(newZIndex);

        // 创建新的 items 数组，更新选中项的 zIndex
        const newItems = items.map((item) =>
            (item.id === id ? { ...item, zIndex: newZIndex } : item)
        );

        // 使用函数式更新确保使用最新状态
        setItems(prevItems => {
            // 再次检查，确保项目存在
            const itemExists = prevItems.some(item => item.id === id);
            if (!itemExists) return prevItems;

            // 创建更新的数组
            const updatedItems = prevItems.map((item) =>
                (item.id === id ? { ...item, zIndex: newZIndex } : item)
            );

            // 发送 WebSocket 更新
            const updatedItem = {
                ...targetItem,
                zIndex: newZIndex
            };
            socketService.updateItem(updatedItem);

            // 立即更新 AI 图像项目的 zIndex (如果适用)
            if (targetItem.type === "photo" && targetItem.data.imageUrl?.includes("/upload/aiImage")) {
                (async () => {
                    try {
                        await axios.patch(getApiUrl('/api/ai/aiImage/update-position'), {
                            id,
                            position: targetItem.position,
                            zIndex: newZIndex,
                        }, {
                            timeout: 5000 // 5 second timeout
                        });
                        console.log(`AI 图像 zIndex 更新成功: ID=${id}, 新 zIndex=${newZIndex}`);
                    } catch (err) {
                        console.error("无法更新 AI 图像 zIndex", err);
                    }
                })();
            }

            return updatedItems;
        });

        // 额外安全措施：在短暂延迟后再次确认更新生效
        setTimeout(() => {
            setItems(currentItems => {
                const targetItem = currentItems.find(item => item.id === id);
                // 如果找到项目但 zIndex 不是最高值，再次更新
                if (targetItem && targetItem.zIndex !== newZIndex) {
                    console.log('进行二次 zIndex 修正');
                    return currentItems.map(item =>
                        item.id === id ? { ...item, zIndex: newZIndex } : item
                    );
                }
                return currentItems;
            });
        }, 50);
    }

    const handleAddNote = (color: string) => {
        // Use helper function to get random position
        const position = getRandomPositionInViewport(200, 300)

        // New note uses current highest z-index
        const newZIndex = highestZIndex + 1
        setHighestZIndex(newZIndex)

        // Random rotation angle between -12 and 12 degrees (can lean left or right)
        const rotation = Math.random() * 24 - 12

        // Randomly select note size
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

        // Save to history
        saveToHistory(newItems, backgroundImage, backgroundColor)

        // Send new project notification via WebSocket
        socketService.addItem(newItem);
    }

    const handleAddMedia = (url: string) => {
        // Use helper function to get random position
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

        // Save to history
        saveToHistory(newItems, backgroundImage, backgroundColor)

        // Send new project notification via WebSocket
        socketService.addItem(newItem);
    }

    const handleAddAIImage = (item: {
        id: string;
        src: string;
        initialPosition: { x: number; y: number };
        zIndex: number;
    }) => {
        // Use helper function to get random position
        const position = getRandomPositionInViewport(200, 200)

        // create new item object
        const newItem: Item = {
            id: item.id,
            position: position, // Use random position within current viewport
            zIndex: item.zIndex,
            rotation: Math.random() * 6 - 3, // Small rotation angle
            type: "gif", // Change to gif type
            data: {
                imageUrl: item.src,
                dateTaken: new Date().toLocaleDateString(),
                isGif: true,
                originalGifUrl: item.src,
                sizeFactor: 0.7 + Math.random() * 0.2 // GIF: Random value between 70% to 90%
            },
        }

        // add to items array
        const newItems = [...items, newItem]
        setItems(newItems)

        // Save to history
        saveToHistory(newItems, backgroundImage, backgroundColor)

        // Send new project notification via WebSocket
        socketService.addItem(newItem);
    }

    const handleAddDoodle = () => {
        setIsDoodling(!isDoodling)
    }

    const handleSaveDoodle = (svgData: string) => {
        // Use helper function to get random position
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

        // Save to history
        saveToHistory(newItems, backgroundImage, backgroundColor)

        // Send new project notification via WebSocket
        socketService.addItem(newItem);

        setIsDoodling(false)
    }

    const handleCancelDoodle = () => {
        setIsDoodling(false)
    }

    const handleNoteContentChange = (id: string, content: string) => {
        const targetItem = items.find(item => item.id === id);
        if (!targetItem) return;

        const newItems = items.map((item) =>
            item.id === id
                ? { ...item, data: { ...item.data, content } }
                : item
        );
        setItems(newItems);

        // Save to history
        saveToHistory(newItems, backgroundImage, backgroundColor);

        // Send update via WebSocket
        const updatedItem = {
            ...targetItem,
            data: { ...targetItem.data, content }
        };
        socketService.updateItem(updatedItem);
    };

    const handleAddBackgroundRemover = (item: {
        id: string;
        src: string;
        initialPosition: { x: number; y: number };
        zIndex: number;
    }) => {
        // create new item object
        const newItem: Item = {
            id: item.id,
            position: item.initialPosition,
            zIndex: item.zIndex,
            rotation: Math.random() * 10 - 5, // random rotation angle
            type: "photo",
            data: {
                imageUrl: item.src,
                dateTaken: new Date().toLocaleDateString(), // use current date
            },
        };

        // add to items array
        const newItems = [...items, newItem];
        setItems(prevItems => [...prevItems, newItem]);

        // Save to history
        saveToHistory([...items, newItem], backgroundImage, backgroundColor);

        // Send new project notification via WebSocket
        socketService.addItem(newItem);
    };

    // Toggle media input mode
    const handleToggleMediaInput = () => {
        setIsMediaInput(!isMediaInput)
    }

    // Handle photo upload interface display and hide
    const handleTogglePhotoUpload = () => {
        setIsPhotoUpload(!isPhotoUpload)
    }

    // Handle brush panel display and hide
    const handleToggleBrushPanel = () => {
        setIsBrushPanel(!isBrushPanel)
    }

    // Handle GIF saving
    const handleSaveGif = (file: File, originalUrl: string, isSticker: boolean = false, isLoading: boolean = false) => {
        // Use helper function to get random position
        const position = getRandomPositionInViewport(300, 300)

        // New GIF uses current highest z-index
        const newZIndex = highestZIndex + 1
        setHighestZIndex(newZIndex)

        // Random rotation angle (GIF rotation angle is small)
        const rotation = Math.random() * 6 - 3

        // Random size factor - to make GIF size on canvas change
        // Sticker uses smaller size range, more random
        const sizeFactor = isSticker
            ? 0.6 + Math.random() * 0.4  // Sticker: Random value between 60% to 100%
            : 0.7 + Math.random() * 0.2 // GIF: Random value between 70% to 90%

        // For AI image generation special handling: If loading state and file name starts with ai-image, save original ID for subsequent update
        const itemId = isLoading && originalUrl.startsWith('ai-image-') ? originalUrl : uuidv4()

        const newItem: Item = {
            id: itemId,
            position: position,
            zIndex: newZIndex,
            rotation,
            type: "gif", // New type: gif
            data: {
                // Directly use originalUrl, no longer use blob URL
                imageUrl: originalUrl,
                dateTaken: new Date().toLocaleDateString(),
                isGif: true,
                originalGifUrl: originalUrl,
                sizeFactor, // Add size factor
                isSticker,  // New: Whether it's a sticker mark
                // If it's a loading AI image, add mark
                isLoading: isLoading
            },
        }

        const newItems = [...items, newItem]
        setItems(newItems)

        // Modify: Save to history - Only save when not loading
        // AI image generation should not save history twice, once before generation, once after generation
        // Send WebSocket notification
        if (isLoading && originalUrl.startsWith('ai-image-')) {
            // For loading AI images, send the placeholder immediately.
            // The final image and history save will be handled by the 'aiImageGenerated' event.
            socketService.addItem(newItem);
        } else if (!isLoading) {
            // For regular GIFs/Stickers or non-loading items, save history and send item.
            saveToHistory(newItems, backgroundImage, backgroundColor);
            socketService.addItem(newItem);
        }
        // Note: For loading AI images, saveToHistory is called within the aiImageGenerated event handler
        // after the image is successfully loaded and the item is updated.

        setIsPhotoUpload(false)
    }

    // Modify: Handle background change more intelligently, prevent multiple history records
    const handleUploadBackground = async (file: File, preserveColor?: boolean) => {
        // 如果文件大小为0，这是一个清除背景的请求
        const isClearRequest = file.size === 0;

        if (isClearRequest) {
            // 如果是清除请求，但要保留颜色
            console.log('清除背景图片，preserveColor =', preserveColor);

            // 清除背景图片
            setBackgroundImage('');

            // 如果不保留颜色，则清除背景颜色
            if (!preserveColor) {
                setBackgroundColor(null);
            }

            // 保存到历史记录
            saveToHistory([...items], '', preserveColor ? backgroundColor : null);

            // 通知WebSocket服务
            socketService.updateBackground({
                backgroundImage: '',
                backgroundColor: preserveColor ? backgroundColor || undefined : undefined
            });

            return;
        }

        // 正常的背景图片上传逻辑
        // Create a temporary URL for immediate preview
        const tempUrl = URL.createObjectURL(file)

        // Update the background immediately for better UX
        setBackgroundImage(tempUrl)

        // Upload the image to the server for persistence
        try {
            // Create a FormData object
            const formData = new FormData()
            formData.append('image', file)

            // Upload the image to the server
            const uploadResponse = await fetch(getApiUrl('/api/upload/image'), {
                method: 'POST',
                body: formData,
            })

            if (!uploadResponse.ok) {
                throw new Error('背景图片上传失败')
            }

            const uploadResult = await uploadResponse.json()

            // Get the permanent server URL
            const serverImageUrl = getApiUrl(uploadResult.url)

            // Update the background with the server URL
            setBackgroundImage(serverImageUrl)

            // Save to history with the server URL
            saveToHistory([...items], serverImageUrl, backgroundColor)

            console.log('背景图片已上传到服务器，永久URL:', serverImageUrl)

            // Send background update notification via WebSocket with server URL
            socketService.updateBackground({ backgroundImage: serverImageUrl })
        } catch (error) {
            console.error('上传背景图片到服务器失败:', error)

            // Keep using the blob URL if upload fails, but save to history
            saveToHistory([...items], tempUrl, backgroundColor)

            // Send background update notification via WebSocket with blob URL
            socketService.updateBackground({ backgroundImage: tempUrl })
        }
    }

    // Modify: Initialize blank canvas history record
    useEffect(() => {
        // Initialize an empty history record item, but only if no history exists yet
        if (history.length === 0) {
            setHistory([{ items: [], backgroundImage: undefined, backgroundColor: null }]);
            setHistoryIndex(0);
        }
    }, [history.length]);

    // Save current state to history when receiving initial room state
    useEffect(() => {
        // If we have items (from room state) but only one history entry (the empty one), 
        // and initial load hasn't been marked as saved to history yet,
        // save the current state as a new history entry.
        if (items.length > 0 && history.length === 1 && history[0].items.length === 0 && !initialLoadCompleteAndSaved) {
            console.log('Saving initial room state to history and marking as complete');
            saveToHistory([...items], backgroundImage, backgroundColor);
            setInitialLoadCompleteAndSaved(true);
        }
    }, [items, history, backgroundImage, backgroundColor, saveToHistory, initialLoadCompleteAndSaved]);

    // Add keyboard shortcut support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo: Ctrl+Z
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
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

    // useEffect for handling AI image generation events
    useEffect(() => {
        const handleAiImageSuccess = (event: Event) => {
            const customEvent = event as CustomEvent<{ requestId: string; file: File; imageUrl: string }>;
            const { requestId, imageUrl } = customEvent.detail;

            setItems(prevItems => {
                let itemWasUpdated = false;
                const updatedItems = prevItems.map(item => {
                    if (item.id === requestId && item.type === "gif" && item.data.isLoading) {
                        console.log(`AI Image Success: Updating item ${requestId} with new URL ${imageUrl}`);
                        itemWasUpdated = true;
                        return {
                            ...item,
                            data: {
                                ...item.data,
                                imageUrl: imageUrl, // Update with the real image URL
                                originalGifUrl: imageUrl, // Also update this if it was the placeholder
                                isLoading: false, // Crucial: mark as no longer loading
                            }
                        };
                    }
                    return item;
                });

                if (itemWasUpdated) {
                    saveToHistory(updatedItems, backgroundImage, backgroundColor);
                    const updatedItemFromState = updatedItems.find(item => item.id === requestId);
                    if (updatedItemFromState) {
                        socketService.updateItem(updatedItemFromState);
                    }
                }
                return updatedItems;
            });
        };

        const handleAiImageFailure = (event: Event) => {
            const customEvent = event as CustomEvent<{ requestId: string; error: string }>;
            const { requestId } = customEvent.detail;

            console.error(`AI Image Generation Failed for ${requestId}:`, customEvent.detail.error);
            setItems(prevItems => {
                const itemExists = prevItems.some(item => item.id === requestId && item.type === "gif" && item.data.isLoading);
                if (itemExists) {
                    const updatedItems = prevItems.filter(item => item.id !== requestId);
                    saveToHistory(updatedItems, backgroundImage, backgroundColor);
                    socketService.deleteItem(requestId); // Notify other clients to delete the placeholder
                    return updatedItems;
                }
                return prevItems; // Return previous items if no item was found/removed
            });
            // Optionally, notify the user about the failure (e.g., using a toast notification)
        };

        window.addEventListener('aiImageGenerated', handleAiImageSuccess);
        window.addEventListener('aiImageGenerationFailed', handleAiImageFailure);

        return () => {
            window.removeEventListener('aiImageGenerated', handleAiImageSuccess);
            window.removeEventListener('aiImageGenerationFailed', handleAiImageFailure);
        };
    }, [saveToHistory, backgroundImage, backgroundColor]);

    // Modify handle color change function
    const handleColorChange = (color: string | null) => {
        setBackgroundColor(color)

        // Send background update notification via WebSocket
        socketService.updateBackground({ backgroundColor: color || undefined });
    }

    // Add: Handle grid visibility change function
    const handleGridVisibilityChange = (visible: boolean) => {
        setShowGrid(visible)

        // Send background update notification via WebSocket
        socketService.updateBackground({ showGrid: visible });
    }

    // Add: Handle canvas scrollable change function
    const handleCanvasScrollableChange = (scrollable: boolean, scale?: number) => {
        setCanvasScrollable(scrollable)

        // Send background update notification via WebSocket - 只更新垂直滚动状态
        socketService.updateBackground({
            canvasScrollable: scrollable
        });
    }

    // 添加历史记录监听器
    useEffect(() => {
        // 监听历史记录数据
        const handleHistoryData = (response: {
            success: boolean;
            date: string;
            data?: {
                items: Item[];
                backgroundImage?: string;
                backgroundColor?: string;
                showGrid?: boolean;
                canvasScrollable?: boolean;
                canvasScale?: number;
            };
            error?: string;
        }) => {
            if (response.success && response.data) {
                // 更新UI状态以显示历史数据
                setItems(response.data.items);

                if (response.data.backgroundImage !== undefined) {
                    setBackgroundImage(response.data.backgroundImage);
                }

                if (response.data.backgroundColor !== undefined) {
                    setBackgroundColor(response.data.backgroundColor);
                }

                if (response.data.showGrid !== undefined) {
                    setShowGrid(response.data.showGrid);
                }

                if (response.data.canvasScrollable !== undefined) {
                    setCanvasScrollable(response.data.canvasScrollable);
                }

                if (response.data.canvasScale !== undefined) {
                    setCanvasScale(response.data.canvasScale);
                }

                // 找出最高的z-index
                const maxZ = Math.max(...response.data.items.map(i => i.zIndex), 10);
                setHighestZIndex(maxZ);

                // 切换到历史模式
                setIsHistoryMode(true);

                console.log(`已加载 ${response.date} 的历史记录，包含 ${response.data.items.length} 个项目`);
            } else {
                console.error('加载历史记录失败:', response.error);
            }
        };

        // 注册事件监听
        socketService.onEvent('moodboard-history-data', handleHistoryData);

        // 组件卸载时取消监听
        return () => {
            socketService.offEvent('moodboard-history-data', handleHistoryData);
        };
    }, []);

    // 保留函数签名但不在UI中使用
    const handleDateChange = (date: string) => {
        console.log(`切换到日期: ${date}`);
        setCurrentDate(date);

        // 获取选定日期的历史记录
        socketService.getMoodboardHistory(date);
    };

    // 返回今天的处理函数
    const handleBackToToday = () => {
        // 重新加载当前状态
        window.location.reload();
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            <GridBackground
                imageUrl={backgroundImage}
                backgroundColor={backgroundColor || undefined}
                showGrid={showGrid}
            />

            {/* Home button - added Link to return to homepage */}
            <Link href="/">
                <button
                    className="fixed top-4 left-4 z-50 p-3 bg-white/80 backdrop-blur-sm rounded-md shadow-sm hover:shadow hover:bg-white transition-all duration-300 ease-in-out transform hover:scale-[1.05]"
                    aria-label="Return to home"
                >
                    <Bird className="w-5 h-5 text-gray-600" />
                </button>
            </Link>

            {/* 如果是历史模式，显示返回今日按钮 */}
            {isHistoryMode && (
                <button
                    onClick={handleBackToToday}
                    className="fixed top-16 left-4 z-50 p-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 transition-all duration-300 ease-in-out text-sm"
                >
                    返回今天
                </button>
            )}

            {/* 历史模式提示 */}
            {isHistoryMode && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium shadow-md">
                    历史查看模式（只读）
                </div>
            )}

            {/* Add user counter and connection status */}
            <div className="fixed top-4 right-4 z-50 p-3 bg-white/80 backdrop-blur-sm rounded-md shadow-sm flex items-center gap-2">
                <Globe className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? `${connectedUsers} Online` : 'Disconnected'}
                </span>
            </div>

            {/* Display WebSocket error */}
            {wsError && (
                <div className="fixed top-16 right-4 z-50 p-2 px-3 bg-red-50 text-red-600 backdrop-blur-sm rounded-md shadow-sm max-w-xs text-sm">
                    {wsError}
                </div>
            )}

            {/* Share button */}
            {/* <button
                onClick={() => items.length > 0 && setIsShareDialogOpen(true)}
                className="fixed top-4 right-4 z-50 p-3 bg-white/80 backdrop-blur-sm rounded-md shadow-sm hover:shadow hover:bg-white transition-all duration-300 ease-in-out transform hover:scale-[1.05]"
            >
                <Send className={`w-5 h-5 ${items.length > 0 ? 'text-gray-600' : 'text-gray-300'}`} />
            </button> */}

            {/* Share dialog */}
            {/* <ShareDialog
                isOpen={isShareDialogOpen}
                onClose={() => setIsShareDialogOpen(false)}
                items={items}
                backgroundImage={backgroundImage}
                backgroundColor={backgroundColor || undefined}
                showGrid={showGrid}
                canvasScrollable={canvasScrollable}
                canvasScale={canvasScale}
            /> */}

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
                    className="relative w-full"
                    style={{
                        height: canvasScrollable ? '6000px' : '100%',
                        minWidth: '100%'
                    }}
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
                                // Duplicate item and place at random position
                                const position = getRandomPositionInViewport(320, 400)
                                const newZIndex = highestZIndex + 1
                                setHighestZIndex(newZIndex)

                                const newItemId = uuidv4();
                                const newItemCopy = {
                                    ...item,
                                    id: newItemId,
                                    position: position,
                                    zIndex: newZIndex,
                                    rotation: Math.random() * 6 - 3
                                };

                                const newItems = [...items, newItemCopy];
                                setItems(newItems);

                                // Save to history record
                                saveToHistory(newItems, backgroundImage, backgroundColor)

                                // Send addition via WebSocket
                                socketService.addItem(newItemCopy);
                            }}
                        >
                            {item.type === "photo" ? (
                                <div className="relative">
                                    <PolaroidContent
                                        imageUrl={item.data.imageUrl || ""}
                                        dateTaken={item.data.dateTaken}
                                        scale={item.data.scale}
                                        originalBlobUrl={item.data.originalBlobUrl}
                                    />
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
                                />
                            ) : item.type === "media" ? (
                                <MediaContent initialUrl={item.data.spotifyUrl} />
                            ) : item.type === "doodle" ? (
                                <DoodleContent svgData={item.data.svgData || ""} />
                            ) : (
                                <AudioContent
                                    audioUrl={item.data.audioUrl || ""}
                                    waveColor={item.data.waveColor}
                                    isBase64Audio={item.data.isBase64Audio}
                                    originalBlobUrl={item.data.originalBlobUrl}
                                />
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
                    showBrushButton={false}
                />
            </div>

            {/* Doodle canvas - Integrated into Toolbar */}
            {/* {isDoodling && <DoodleCanvas onSave={handleSaveDoodle} onCancel={handleCancelDoodle} />} */}

            {/* Canvas right-click menu */}
            <CanvasContextMenu
                visible={showCanvasContextMenu}
                position={contextMenuPosition}
                onClose={() => setShowCanvasContextMenu(false)}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={initialLoadCompleteAndSaved ? historyIndex > 1 : historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
            />

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