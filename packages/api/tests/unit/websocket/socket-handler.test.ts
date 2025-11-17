/**
 * WebSocket socket handler unit tests
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { setupSocketHandlers, shutdownSocketServer } from '../../../src/websocket/socket-handler';

// Mock socket.io
const mockSocket = {
  id: 'test-socket-id',
  handshake: {
    address: '127.0.0.1',
  },
  on: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
};

const mockIo = {
  on: jest.fn(),
  emit: jest.fn(),
  close: jest.fn(),
} as unknown as SocketIOServer;

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ProgressEmitter
jest.mock('../../../src/websocket/progress-emitter', () => ({
  ProgressEmitter: jest.fn().mockImplementation((io) => ({
    io,
    emitProgress: jest.fn(),
    emitWorkflowCompleted: jest.fn(),
    emitWorkflowFailed: jest.fn(),
  })),
}));

describe('Socket Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('setupSocketHandlers', () => {
    it('should setup connection handler', () => {
      setupSocketHandlers(mockIo);

      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should return ProgressEmitter instance', () => {
      const emitter = setupSocketHandlers(mockIo);

      expect(emitter).toBeDefined();
      expect(emitter.io).toBe(mockIo);
    });

    it('should handle client connection', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('subscribe:project', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe:project', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ping', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle project subscription', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'subscribe:project'
      )[1];

      subscribeHandler('test-project-id');

      expect(mockSocket.join).toHaveBeenCalledWith('project:test-project-id');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        projectId: 'test-project-id',
        room: 'project:test-project-id',
      });
    });

    it('should handle project unsubscription', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const unsubscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'unsubscribe:project'
      )[1];

      unsubscribeHandler('test-project-id');

      expect(mockSocket.leave).toHaveBeenCalledWith('project:test-project-id');
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribed', {
        projectId: 'test-project-id',
        room: 'project:test-project-id',
      });
    });

    it('should handle ping', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const pingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'ping'
      )[1];

      pingHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
        timestamp: expect.any(Date),
      });
    });

    it('should handle disconnect', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnect'
      )[1];

      disconnectHandler('client namespace disconnect');

      // Should log the disconnect (verified through logger mock)
      const { logger } = require('../../../src/config/logger');
      expect(logger.info).toHaveBeenCalledWith('Client disconnected', {
        socketId: 'test-socket-id',
        reason: 'client namespace disconnect',
      });
    });

    it('should handle socket errors', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const errorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'error'
      )[1];

      const testError = new Error('Test error');
      errorHandler(testError);

      const { logger } = require('../../../src/config/logger');
      expect(logger.error).toHaveBeenCalledWith('Socket error', {
        socketId: 'test-socket-id',
        error: testError,
      });
    });

    it('should setup periodic ping', () => {
      jest.useFakeTimers();

      setupSocketHandlers(mockIo);

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      expect(mockIo.emit).toHaveBeenCalledWith('ping', {
        timestamp: expect.any(Date),
      });

      // Fast-forward another 30 seconds
      jest.advanceTimersByTime(30000);

      expect(mockIo.emit).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('shutdownSocketServer', () => {
    it('should close socket server gracefully', async () => {
      (mockIo.close as jest.Mock).mockImplementation((callback) => {
        callback();
      });

      await shutdownSocketServer(mockIo);

      expect(mockIo.close).toHaveBeenCalled();
    });

    it('should resolve when server is closed', async () => {
      (mockIo.close as jest.Mock).mockImplementation((callback) => {
        setTimeout(callback, 100);
      });

      const promise = shutdownSocketServer(mockIo);

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple clients subscribing to same project', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];

      // First client
      const socket1 = { ...mockSocket, id: 'socket-1', join: jest.fn(), emit: jest.fn(), on: jest.fn() };
      connectionHandler(socket1);

      const subscribeHandler1 = (socket1.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'subscribe:project'
      )[1];
      subscribeHandler1('test-project');

      // Second client
      const socket2 = { ...mockSocket, id: 'socket-2', join: jest.fn(), emit: jest.fn(), on: jest.fn() };
      connectionHandler(socket2);

      const subscribeHandler2 = (socket2.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'subscribe:project'
      )[1];
      subscribeHandler2('test-project');

      expect(socket1.join).toHaveBeenCalledWith('project:test-project');
      expect(socket2.join).toHaveBeenCalledWith('project:test-project');
    });

    it('should handle client subscribing to multiple projects', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'subscribe:project'
      )[1];

      subscribeHandler('project-1');
      subscribeHandler('project-2');

      expect(mockSocket.join).toHaveBeenCalledWith('project:project-1');
      expect(mockSocket.join).toHaveBeenCalledWith('project:project-2');
      expect(mockSocket.emit).toHaveBeenCalledTimes(2);
    });

    it('should handle subscribe then unsubscribe', () => {
      setupSocketHandlers(mockIo);

      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const subscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'subscribe:project'
      )[1];

      const unsubscribeHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'unsubscribe:project'
      )[1];

      subscribeHandler('test-project');
      expect(mockSocket.join).toHaveBeenCalledWith('project:test-project');

      unsubscribeHandler('test-project');
      expect(mockSocket.leave).toHaveBeenCalledWith('project:test-project');
    });
  });
});
