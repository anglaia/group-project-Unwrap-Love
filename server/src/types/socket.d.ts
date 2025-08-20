import { Server } from 'socket.io';

declare module './socket' {
  export function setupSocketHandlers(io: Server): void;
} 