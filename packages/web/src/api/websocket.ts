import { io, Socket } from 'socket.io-client';

export interface ProgressUpdate {
  progress: number;
  stage: string;
  message: string;
}

export interface LogEntry {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface WebSocketEvents {
  // Client -> Server
  'join-project': (projectId: string) => void;
  'leave-project': (projectId: string) => void;

  // Server -> Client
  'progress-update': (data: ProgressUpdate) => void;
  'log-entry': (data: LogEntry) => void;
  'generation-complete': (data: { projectId: string }) => void;
  'generation-failed': (data: { projectId: string; error: string }) => void;
  'connection-established': () => void;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();

    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  joinProject(projectId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-project', projectId);
    }
  }

  leaveProject(projectId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave-project', projectId);
    }
  }

  onProgressUpdate(callback: (data: ProgressUpdate) => void) {
    this.socket?.on('progress-update', callback);
  }

  onLogEntry(callback: (data: LogEntry) => void) {
    this.socket?.on('log-entry', callback);
  }

  onGenerationComplete(callback: (data: { projectId: string }) => void) {
    this.socket?.on('generation-complete', callback);
  }

  onGenerationFailed(
    callback: (data: { projectId: string; error: string }) => void
  ) {
    this.socket?.on('generation-failed', callback);
  }

  offProgressUpdate(callback: (data: ProgressUpdate) => void) {
    this.socket?.off('progress-update', callback);
  }

  offLogEntry(callback: (data: LogEntry) => void) {
    this.socket?.off('log-entry', callback);
  }

  offGenerationComplete(callback: (data: { projectId: string }) => void) {
    this.socket?.off('generation-complete', callback);
  }

  offGenerationFailed(
    callback: (data: { projectId: string; error: string }) => void
  ) {
    this.socket?.off('generation-failed', callback);
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClient();

export default websocketClient;
