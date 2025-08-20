import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { MoodboardHistory } from './models/MoodboardHistory';

// 定义房间状态接口
interface RoomState {
  items: any[];
  users: Set<string>;
  backgroundImage?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  canvasScrollable?: boolean;
  canvasScale?: number;
  lastActive?: Date; // 添加最后活跃时间
}

// 存储所有房间的状态
const rooms = new Map<string, RoomState>();

// 获取或创建房间
function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      items: [],
      users: new Set<string>(),
      backgroundImage: undefined,
      backgroundColor: undefined,
      showGrid: true,
      canvasScrollable: false,
      canvasScale: 3,
      lastActive: new Date() // 初始化最后活跃时间
    });
  }

  // 更新最后活跃时间
  const room = rooms.get(roomId)!;
  room.lastActive = new Date();

  return room;
}

// 设置每日午夜重置所有房间
function setupDailyReset() {
  // 修改重置函数，先保存历史记录再重置
  async function resetAllRooms() {
    console.log("执行每日重置，保存并清空所有房间数据...");

    try {
      // 获取当前日期（不含时间）作为历史记录日期
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 保存每个非空房间的历史数据
      const savePromises: Promise<any>[] = [];

      rooms.forEach(async (room, roomId) => {
        // 只保存有内容的房间
        if (room.items.length > 0) {
          // 准备存储的数据
          const historyData = {
            date: today,
            roomId,
            backgroundImage: room.backgroundImage,
            backgroundColor: room.backgroundColor,
            showGrid: room.showGrid,
            canvasScrollable: room.canvasScrollable,
            canvasScale: room.canvasScale,
            items: room.items
          };

          // 使用upsert操作，如果已存在同日期同房间的记录则更新
          const savePromise = MoodboardHistory.findOneAndUpdate(
            { date: today, roomId },
            historyData,
            { upsert: true, new: true }
          );

          savePromises.push(savePromise);
          console.log(`准备保存房间历史记录: ${roomId}, 项目数: ${room.items.length}`);
        }
      });

      // 等待所有保存操作完成
      await Promise.all(savePromises);
      console.log(`成功保存所有房间历史数据，日期: ${today.toLocaleDateString()}`);
    } catch (error) {
      console.error("保存历史记录失败:", error);
    }

    // 清空所有房间
    rooms.clear();
    console.log(`已重置所有房间数据，当前时间: ${new Date().toLocaleString()}`);
  }

  // 计算下一个午夜的时间
  function scheduleNextReset() {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // 下一天
      0, 0, 0 // 午夜 00:00:00
    );

    // 计算到下一个午夜的毫秒数
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    console.log(`计划下一次重置时间: ${nextMidnight.toLocaleString()}, ${Math.floor(msUntilMidnight / 1000 / 60)} 分钟后`);

    // 设置定时器
    setTimeout(() => {
      resetAllRooms();
      scheduleNextReset(); // 重新安排下一次
    }, msUntilMidnight);
  }

  // 启动时立即安排第一次重置
  scheduleNextReset();
}

// 设置定期日志，显示房间统计信息
function setupRoomStatsLogging() {
  // 每小时记录一次房间统计信息
  setInterval(() => {
    const now = new Date();
    const totalRooms = rooms.size;
    let activeRooms = 0;
    let totalUsers = 0;
    let totalItems = 0;

    // 统计信息
    rooms.forEach((room, roomId) => {
      if (room.users.size > 0) {
        activeRooms++;
      }
      totalUsers += room.users.size;
      totalItems += room.items.length;

      // 计算房间最后活跃至今的小时数
      const hoursSinceActive = room.lastActive
        ? Math.round((now.getTime() - room.lastActive.getTime()) / (1000 * 60 * 60) * 10) / 10
        : 0;

      // 只记录有内容或有用户的房间
      if (room.items.length > 0 || room.users.size > 0) {
        console.log(`房间ID: ${roomId}, 项目数: ${room.items.length}, 用户数: ${room.users.size}, 最后活跃: ${hoursSinceActive}小时前`);
      }
    });

    console.log(`房间统计 - 总房间: ${totalRooms}, 活跃房间: ${activeRooms}, 总用户: ${totalUsers}, 总项目: ${totalItems}, 时间: ${now.toLocaleString()}`);
  }, 60 * 60 * 1000); // 每小时执行一次
}

// 添加新的Socket事件处理，获取历史记录
export function setupSocketHandlers(io: Server) {
  // 启动每日重置计划
  setupDailyReset();

  // 启动房间统计日志
  setupRoomStatsLogging();

  // 连接事件处理
  io.on('connection', (socket: Socket) => {
    console.log(`用户已连接: ${socket.id}`);
    let currentRoom: string | null = null;

    // 加入房间
    socket.on('join-room', (roomId: string, username: string) => {
      // 先离开之前的房间
      if (currentRoom) {
        leaveRoom(socket, currentRoom);
      }

      // 加入新房间
      currentRoom = roomId;
      joinRoom(socket, roomId, username);
    });

    // 更新画布项目
    socket.on('update-item', (roomId: string, item: any) => {
      const room = getOrCreateRoom(roomId);

      // 查找并更新项目
      const existingItemIndex = room.items.findIndex(i => i.id === item.id);
      if (existingItemIndex !== -1) {
        room.items[existingItemIndex] = item;
      } else {
        room.items.push(item);
      }

      // 更新最后活跃时间
      room.lastActive = new Date();

      // 广播给房间内所有其他用户
      socket.to(roomId).emit('item-updated', item);
    });

    // 添加新项目
    socket.on('add-item', (roomId: string, item: any) => {
      const room = getOrCreateRoom(roomId);
      room.items.push(item);

      // 更新最后活跃时间
      room.lastActive = new Date();

      // 广播给房间内所有其他用户
      socket.to(roomId).emit('item-added', item);
    });

    // 删除项目
    socket.on('delete-item', (roomId: string, itemId: string) => {
      const room = getOrCreateRoom(roomId);
      room.items = room.items.filter(item => item.id !== itemId);

      // 更新最后活跃时间
      room.lastActive = new Date();

      // 广播给房间内所有其他用户
      socket.to(roomId).emit('item-deleted', itemId);
    });

    // 更新背景
    socket.on('update-background', (roomId: string, data: {
      backgroundImage?: string,
      backgroundColor?: string,
      showGrid?: boolean,
      canvasScrollable?: boolean,
      canvasScale?: number
    }) => {
      const room = getOrCreateRoom(roomId);

      if (data.backgroundImage !== undefined) {
        room.backgroundImage = data.backgroundImage;
      }

      if (data.backgroundColor !== undefined) {
        room.backgroundColor = data.backgroundColor;
      }

      if (data.showGrid !== undefined) {
        room.showGrid = data.showGrid;
      }

      if (data.canvasScrollable !== undefined) {
        room.canvasScrollable = data.canvasScrollable;
      }

      if (data.canvasScale !== undefined) {
        room.canvasScale = data.canvasScale;
      }

      // 更新最后活跃时间
      room.lastActive = new Date();

      // 广播给房间内所有其他用户
      socket.to(roomId).emit('background-updated', data);
    });

    // 同步整个画布状态
    socket.on('sync-canvas', (roomId: string, state: {
      items: any[],
      background?: {
        backgroundImage?: string,
        backgroundColor?: string,
        showGrid?: boolean,
        canvasScrollable?: boolean,
        canvasScale?: number
      }
    }) => {
      const room = getOrCreateRoom(roomId);

      // 更新项目列表
      room.items = [...state.items];

      // 更新背景设置（如果提供）
      if (state.background) {
        if (state.background.backgroundImage !== undefined) {
          room.backgroundImage = state.background.backgroundImage;
        }

        if (state.background.backgroundColor !== undefined) {
          room.backgroundColor = state.background.backgroundColor;
        }

        if (state.background.showGrid !== undefined) {
          room.showGrid = state.background.showGrid;
        }

        if (state.background.canvasScrollable !== undefined) {
          room.canvasScrollable = state.background.canvasScrollable;
        }

        if (state.background.canvasScale !== undefined) {
          room.canvasScale = state.background.canvasScale;
        }
      }

      // 更新最后活跃时间
      room.lastActive = new Date();

      console.log(`用户 ${socket.id} 同步了房间 ${roomId} 的画布状态`);

      // 广播同步状态命令
      socket.to(roomId).emit('canvas-synced', {
        items: room.items,
        background: {
          backgroundImage: room.backgroundImage,
          backgroundColor: room.backgroundColor,
          showGrid: room.showGrid,
          canvasScrollable: room.canvasScrollable,
          canvasScale: room.canvasScale
        }
      });
    });

    // 获取指定日期的历史记录
    socket.on('get-moodboard-history', async (roomId: string, dateStr: string) => {
      try {
        // 解析日期字符串为Date对象
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0); // 设置为当天的00:00:00

        // 查询数据库
        const history = await MoodboardHistory.findOne({
          roomId,
          date
        });

        if (history) {
          // 返回历史记录
          socket.emit('moodboard-history-data', {
            success: true,
            date: dateStr,
            data: {
              items: history.items,
              backgroundImage: history.backgroundImage,
              backgroundColor: history.backgroundColor,
              showGrid: history.showGrid,
              canvasScrollable: history.canvasScrollable,
              canvasScale: history.canvasScale
            }
          });
        } else {
          // 未找到记录
          socket.emit('moodboard-history-data', {
            success: false,
            date: dateStr,
            error: "未找到对应日期的历史记录"
          });
        }
      } catch (error) {
        console.error(`获取历史记录失败, roomId: ${roomId}, date: ${dateStr}`, error);
        socket.emit('moodboard-history-data', {
          success: false,
          date: dateStr,
          error: "获取历史记录失败"
        });
      }
    });

    // 获取可用的历史日期列表
    socket.on('get-history-dates', async (roomId: string) => {
      try {
        // 查询该房间所有的历史记录日期
        const histories = await MoodboardHistory.find(
          { roomId },
          { date: 1, _id: 0 }
        ).sort({ date: -1 }); // 按日期降序排列

        // 提取日期列表
        const dates = histories.map(h => h.date.toISOString().split('T')[0]);

        // 返回日期列表
        socket.emit('history-dates', {
          success: true,
          roomId,
          dates
        });
      } catch (error) {
        console.error(`获取历史日期列表失败, roomId: ${roomId}`, error);
        socket.emit('history-dates', {
          success: false,
          roomId,
          error: "获取历史日期列表失败"
        });
      }
    });

    // 断开连接事件
    socket.on('disconnect', () => {
      console.log(`用户已断开连接: ${socket.id}`);

      // 如果用户在某个房间内，则离开该房间
      if (currentRoom) {
        leaveRoom(socket, currentRoom);
      }
    });
  });

  // 加入房间函数
  function joinRoom(socket: Socket, roomId: string, username: string) {
    const room = getOrCreateRoom(roomId);

    // 加入Socket.io房间
    socket.join(roomId);

    // 添加到用户列表
    room.users.add(socket.id);

    // 通知房间内其他用户有新用户加入
    socket.to(roomId).emit('user-joined', { id: socket.id, username });

    // 给新加入的用户发送当前房间状态
    socket.emit('room-state', {
      items: room.items,
      backgroundImage: room.backgroundImage,
      backgroundColor: room.backgroundColor,
      showGrid: room.showGrid,
      canvasScrollable: room.canvasScrollable,
      canvasScale: room.canvasScale,
      users: Array.from(room.users).length
    });

    console.log(`用户 ${username} (${socket.id}) 加入房间 ${roomId}`);
  }

  // 离开房间函数
  function leaveRoom(socket: Socket, roomId: string) {
    const room = getOrCreateRoom(roomId);

    // 从用户列表中移除
    room.users.delete(socket.id);

    // 离开Socket.io房间
    socket.leave(roomId);

    // 通知房间内其他用户此用户已离开
    socket.to(roomId).emit('user-left', socket.id);

    // 不再删除空房间，保留内容直到每日重置
    console.log(`用户 ${socket.id} 离开房间 ${roomId}，房间内剩余 ${room.users.size} 个用户`);
  }
} 