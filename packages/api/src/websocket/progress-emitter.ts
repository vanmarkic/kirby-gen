/**
 * Progress update utilities for WebSocket
 */
import { Server as SocketIOServer } from 'socket.io';
import { WorkflowProgress } from '../workflow/workflow-types';
import { logger } from '../config/logger';

/**
 * Progress emitter class
 * Manages WebSocket progress updates for projects
 */
export class ProgressEmitter {
  constructor(private io: SocketIOServer) {}

  /**
   * Emit progress update for a project
   */
  emitProgress(projectId: string, progress: WorkflowProgress): void {
    const room = `project:${projectId}`;

    logger.debug('Emitting progress update', {
      room,
      phase: progress.phase,
      status: progress.status,
      progress: progress.progress,
    });

    this.io.to(room).emit('workflow:progress', progress);
  }

  /**
   * Emit phase started event
   */
  emitPhaseStarted(projectId: string, phase: string, message: string): void {
    const progress: WorkflowProgress = {
      projectId,
      phase,
      status: 'started',
      progress: 0,
      message,
      timestamp: new Date(),
    };

    this.emitProgress(projectId, progress);
  }

  /**
   * Emit phase in progress event
   */
  emitPhaseProgress(
    projectId: string,
    phase: string,
    progress: number,
    message: string,
    data?: any
  ): void {
    const progressEvent: WorkflowProgress = {
      projectId,
      phase,
      status: 'in_progress',
      progress,
      message,
      timestamp: new Date(),
      data,
    };

    this.emitProgress(projectId, progressEvent);
  }

  /**
   * Emit phase completed event
   */
  emitPhaseCompleted(
    projectId: string,
    phase: string,
    message: string,
    data?: any
  ): void {
    const progress: WorkflowProgress = {
      projectId,
      phase,
      status: 'completed',
      progress: 100,
      message,
      timestamp: new Date(),
      data,
    };

    this.emitProgress(projectId, progress);
  }

  /**
   * Emit phase failed event
   */
  emitPhaseFailed(
    projectId: string,
    phase: string,
    error: { code: string; message: string; details?: any }
  ): void {
    const progress: WorkflowProgress = {
      projectId,
      phase,
      status: 'failed',
      progress: 0,
      message: error.message,
      timestamp: new Date(),
      error: {
        code: error.code,
        message: error.message,
        phase,
        details: error.details,
        timestamp: new Date(),
      },
    };

    this.emitProgress(projectId, progress);
  }

  /**
   * Emit workflow completed event
   */
  emitWorkflowCompleted(projectId: string, data: any): void {
    const room = `project:${projectId}`;

    logger.info('Workflow completed', { projectId });

    this.io.to(room).emit('workflow:completed', {
      projectId,
      timestamp: new Date(),
      data,
    });
  }

  /**
   * Emit workflow failed event
   */
  emitWorkflowFailed(
    projectId: string,
    error: { code: string; message: string; phase: string; details?: any }
  ): void {
    const room = `project:${projectId}`;

    logger.error('Workflow failed', { projectId, error });

    this.io.to(room).emit('workflow:failed', {
      projectId,
      timestamp: new Date(),
      error,
    });
  }

  /**
   * Emit custom event to project room
   */
  emitToProject(projectId: string, event: string, data: any): void {
    const room = `project:${projectId}`;
    this.io.to(room).emit(event, data);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }
}
