import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/apiConfig';

// WebSocket连接实例
let socket: Socket | null = null;

// 连接状态
let connected = false;

// 当前房间ID
let currentRoomId: string | null = null;

// 重连次数
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// 创建连接
export const createSocketConnection = () => {
  if (!socket) {
    const socketUrl = API_BASE_URL;
    console.log(`开始连接WebSocket服务器: ${socketUrl}`);

    try {
      socket = io(socketUrl, {
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        timeout: 20000, // 增加至20秒连接超时
        transports: ['websocket', 'polling'], // 明确指定传输方式，先尝试 WebSocket
        path: '/socket.io/', // 确保使用默认路径
        autoConnect: true, // 自动连接
        forceNew: true, // 强制创建新连接
        withCredentials: true // 跨域请求时携带凭证
      });

      // 连接事件
      socket.on('connect', () => {
        console.log('WebSocket已连接，ID:', socket?.id);
        connected = true;
        reconnectAttempts = 0; // 重置重连计数
      });

      // 断开连接事件
      socket.on('disconnect', (reason) => {
        console.log(`WebSocket已断开连接: ${reason}`);
        connected = false;
      });

      // 连接错误事件
      socket.on('connect_error', (error) => {
        reconnectAttempts++;
        console.error(`WebSocket连接错误 (尝试 ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, error);

        // 输出更详细的错误信息
        if (error.message) {
          console.error('错误消息:', error.message);
        }

        // 输出任何可能的附加信息（使用类型安全的方式）
        const anyError = error as any;
        if (anyError.description) {
          console.error('错误描述:', anyError.description);
        }
        if (anyError.context) {
          console.error('错误上下文:', anyError.context);
        }

        connected = false;

        // 如果错误与传输方式相关，尝试切换传输方式
        if (reconnectAttempts === 2 && socket?.io?.opts) {
          console.log('尝试仅使用 polling 传输方式重连...');
          socket.io.opts.transports = ['polling'];
        }

        // 如果达到最大重试次数，停止重试
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('WebSocket连接失败，已达到最大重试次数');
          socket?.disconnect();
        }
      });

      // 重连尝试事件
      socket.io.on("reconnect_attempt", (attempt) => {
        console.log(`尝试重新连接 (${attempt}/${MAX_RECONNECT_ATTEMPTS})...`);
      });

      // 重连错误事件
      socket.io.on("reconnect_error", (error) => {
        console.error('重连过程中出错:', error);
      });

      // 重连失败事件
      socket.io.on("reconnect_failed", () => {
        console.error('WebSocket重连失败，已达到最大重试次数');
      });

      // 添加轮询错误处理（使用类型安全的方式）
      if (socket.io && socket.io.engine) {
        (socket.io.engine as any).on("transport_error", (err: any) => {
          console.error('传输错误:', err);
        });
      }

      // 重连成功事件
      socket.on('reconnect', (attemptNumber) => {
        console.log(`WebSocket重连成功，尝试次数: ${attemptNumber}`);
        connected = true;

        // 如果有房间ID，重新加入房间
        if (currentRoomId) {
          console.log(`重新加入房间: ${currentRoomId}`);
          socket?.emit('join-room', currentRoomId, '重连用户');
        }
      });
    } catch (err) {
      console.error('创建WebSocket连接时出错:', err);
      return null;
    }
  }

  return socket;
};

// 加入房间
export const joinRoom = (roomId: string, username: string = '匿名用户') => {
  if (!socket) {
    socket = createSocketConnection();
  }

  if (socket && socket.connected) {
    currentRoomId = roomId;
    socket.emit('join-room', roomId, username);
    return true;
  } else {
    console.warn('无法加入房间: WebSocket未连接');
    // 如果socket存在但未连接，添加连接成功后的回调
    if (socket) {
      socket.once('connect', () => {
        console.log('连接成功后重新加入房间');
        currentRoomId = roomId;
        socket?.emit('join-room', roomId, username);
      });
    }
    return false;
  }
};

// 更新项目
export const updateItem = (item: any) => {
  if (socket && socket.connected && currentRoomId) {
    try {
      // 添加更多日志，帮助调试层级问题
      if (item && item.zIndex !== undefined) {
        console.log(`WebSocket: 更新项目 ${item.id} 的 zIndex 为 ${item.zIndex}`);
      }

      // 发送更新事件
      const success = socket.emit('update-item', currentRoomId, item);

      // 添加重试逻辑
      if (!success) {
        console.warn('第一次发送更新失败，尝试重试...');
        setTimeout(() => {
          socket?.emit('update-item', currentRoomId, item);
        }, 100);
      }

      return true;
    } catch (err) {
      console.error('发送项目更新时出错:', err);

      // 出错时仍尝试重新发送
      setTimeout(() => {
        try {
          socket?.emit('update-item', currentRoomId, item);
        } catch (e) {
          console.error('重试更新项目失败:', e);
        }
      }, 200);

      return false;
    }
  }

  console.warn('无法更新项目: WebSocket未连接或未加入房间');
  return false;
};

// 添加项目
export const addItem = (item: any) => {
  if (socket && socket.connected && currentRoomId) {
    try {
      // 特殊处理音频项目
      if (item.type === 'audio' && item.data && item.data.audioUrl) {
        console.log('发送音频项目，URL类型:', item.data.audioUrl.substring(0, 15) + '...');

        // 确保音频项目具有波形颜色
        if (!item.data.waveColor) {
          const colors = [
            "#ec4899", // Pink
            "#3b82f6", // Blue
            "#10b981", // Green
            "#f59e0b", // Amber
            "#8b5cf6", // Purple
            "#ef4444", // Red
            "#06b6d4", // Cyan
          ];
          item.data.waveColor = colors[Math.floor(Math.random() * colors.length)];
        }

        // 确保base64音频数据被标记
        if (item.data.audioUrl.startsWith('data:audio/')) {
          item.data.isBase64Audio = true;
        }
      }

      socket.emit('add-item', currentRoomId, item);
      return true;
    } catch (error) {
      console.error('发送项目时出错:', error);
      return false;
    }
  }

  console.warn('无法添加项目: WebSocket未连接或未加入房间');
  return false;
};

// 删除项目
export const deleteItem = (itemId: string) => {
  if (socket && socket.connected && currentRoomId) {
    socket.emit('delete-item', currentRoomId, itemId);
    return true;
  }

  console.warn('无法删除项目: WebSocket未连接或未加入房间');
  return false;
};

// 更新背景
export const updateBackground = (backgroundData: {
  backgroundImage?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  canvasScrollable?: boolean;
  canvasScale?: number;
}) => {
  if (socket && socket.connected && currentRoomId) {
    socket.emit('update-background', currentRoomId, backgroundData);
    return true;
  }

  console.warn('无法更新背景: WebSocket未连接或未加入房间');
  return false;
};

// 同步整个画布状态（批量更新项目和背景）
export const syncCanvasState = (items: any[], backgroundData?: {
  backgroundImage?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  canvasScrollable?: boolean;
  canvasScale?: number;
}) => {
  if (socket && socket.connected && currentRoomId) {
    // 创建完整状态对象
    const fullState = {
      items: items,
      background: backgroundData
    };

    // 发送整个状态
    socket.emit('sync-canvas', currentRoomId, fullState);
    console.log('已同步整个画布状态');
    return true;
  }

  console.warn('无法同步画布状态: WebSocket未连接或未加入房间');
  return false;
};

// 断开连接
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connected = false;
    currentRoomId = null;
    reconnectAttempts = 0;
  }
};

// 注册事件监听
export const onEvent = (event: string, callback: (...args: any[]) => void) => {
  if (socket) {
    socket.on(event, callback);
  } else {
    console.warn(`无法注册事件 ${event}: WebSocket未初始化`);
  }
};

// 取消事件监听
export const offEvent = (event: string, callback?: (...args: any[]) => void) => {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
};

// 获取连接状态
export const isConnected = () => connected;

// 获取当前房间ID
export const getCurrentRoomId = () => currentRoomId;

// 获取历史日期列表
export const getHistoryDates = () => {
  if (socket && socket.connected && currentRoomId) {
    socket.emit('get-history-dates', currentRoomId);
    return true;
  }

  console.warn('无法获取历史日期列表: WebSocket未连接或未加入房间');
  return false;
};

// 获取指定日期的历史记录
export const getMoodboardHistory = (dateStr: string) => {
  if (socket && socket.connected && currentRoomId) {
    socket.emit('get-moodboard-history', currentRoomId, dateStr);
    return true;
  }

  console.warn('无法获取历史记录: WebSocket未连接或未加入房间');
  return false;
};

// 重新连接
export const reconnect = () => {
  // 先断开已有连接
  if (socket) {
    socket.disconnect();
  }

  // 重置状态
  socket = null;
  connected = false;
  reconnectAttempts = 0;

  // 创建新连接
  const newSocket = createSocketConnection();

  // 如果之前有房间ID，在连接后自动重新加入
  if (newSocket && currentRoomId) {
    newSocket.once('connect', () => {
      if (currentRoomId) {
        joinRoom(currentRoomId, '重连用户');
      }
    });
  }

  return !!newSocket;
}; 