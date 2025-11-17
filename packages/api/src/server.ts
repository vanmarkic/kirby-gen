/**
 * Server class with Socket.IO integration
 */
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Application } from 'express';
import { logger } from './config/logger';
import { env } from './config/env';
import { setupSocketHandlers, shutdownSocketServer } from './websocket/socket-handler';
import { ProgressEmitter } from './websocket/progress-emitter';

/**
 * Server class
 * Manages HTTP server and Socket.IO
 */
export class Server {
  private httpServer: http.Server;
  private io: SocketIOServer;
  private progressEmitter: ProgressEmitter;

  constructor(private app: Application) {
    // Create HTTP server
    this.httpServer = http.createServer(app);

    // Create Socket.IO server
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: env.CORS_ORIGIN.split(','),
        credentials: env.CORS_CREDENTIALS,
      },
      pingInterval: env.WS_PING_INTERVAL,
      pingTimeout: env.WS_PING_TIMEOUT,
    });

    // Setup socket handlers and get progress emitter
    this.progressEmitter = setupSocketHandlers(this.io);

    // Make progress emitter available to routes via app.locals
    this.app.locals.progressEmitter = this.progressEmitter;

    logger.info('Server initialized');
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(env.PORT, env.HOST, () => {
        logger.info(`Server started on http://${env.HOST}:${env.PORT}`);
        logger.info(`Environment: ${env.NODE_ENV}`);
        logger.info(`WebSocket server ready`);
        resolve();
      });
    });
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    logger.info('Stopping server...');

    // Close Socket.IO connections
    await shutdownSocketServer(this.io);

    // Close HTTP server
    return new Promise((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) {
          logger.error('Error stopping server', { error: err });
          reject(err);
        } else {
          logger.info('Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get the HTTP server instance
   */
  getHttpServer(): http.Server {
    return this.httpServer;
  }

  /**
   * Get the Socket.IO instance
   */
  getSocketServer(): SocketIOServer {
    return this.io;
  }

  /**
   * Get the progress emitter
   */
  getProgressEmitter(): ProgressEmitter {
    return this.progressEmitter;
  }
}
