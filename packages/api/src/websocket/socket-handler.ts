/**
 * Socket.IO event handlers
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { ProgressEmitter } from './progress-emitter';

/**
 * Setup Socket.IO event handlers
 */
export function setupSocketHandlers(io: SocketIOServer): ProgressEmitter {
  const progressEmitter = new ProgressEmitter(io);

  io.on('connection', (socket: Socket) => {
    logger.info('Client connected', {
      socketId: socket.id,
      address: socket.handshake.address,
    });

    // Handle project subscription
    socket.on('subscribe:project', (projectId: string) => {
      const room = `project:${projectId}`;
      socket.join(room);

      logger.info('Client subscribed to project', {
        socketId: socket.id,
        projectId,
        room,
      });

      socket.emit('subscribed', { projectId, room });
    });

    // Handle project unsubscription
    socket.on('unsubscribe:project', (projectId: string) => {
      const room = `project:${projectId}`;
      socket.leave(room);

      logger.info('Client unsubscribed from project', {
        socketId: socket.id,
        projectId,
        room,
      });

      socket.emit('unsubscribed', { projectId, room });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        error,
      });
    });
  });

  // Setup periodic ping
  setInterval(() => {
    io.emit('ping', { timestamp: new Date() });
  }, 30000); // Every 30 seconds

  logger.info('Socket.IO handlers configured');

  return progressEmitter;
}

/**
 * Shutdown Socket.IO server gracefully
 */
export async function shutdownSocketServer(io: SocketIOServer): Promise<void> {
  logger.info('Shutting down Socket.IO server');

  return new Promise((resolve) => {
    io.close(() => {
      logger.info('Socket.IO server closed');
      resolve();
    });
  });
}
