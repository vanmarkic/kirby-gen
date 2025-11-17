import * as fs from 'fs/promises';
import * as path from 'path';
import { nanoid } from 'nanoid';
import type { ISessionService } from '../../../../shared/src/interfaces/session.interface';
import type { ProjectData } from '../../../../shared/src/types/project.types';

/**
 * Local file-based implementation of ISessionService
 * Stores sessions as JSON files in a configurable directory
 */
export class LocalSessionService implements ISessionService {
  private readonly basePath: string;
  private readonly lockMap: Map<string, Promise<void>> = new Map();

  constructor() {
    this.basePath = process.env.SESSION_PATH || path.join(process.cwd(), 'sessions');
    this.initializeBasePath();
  }

  /**
   * Initialize the base directory for sessions
   */
  private async initializeBasePath(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create session directory: ${this.basePath}`, error);
    }
  }

  /**
   * Validate session ID to prevent directory traversal attacks
   */
  private validateSessionId(sessionId: string): void {
    // Check for path traversal attempts
    if (sessionId.includes('..') || sessionId.includes('/') || sessionId.includes('\\')) {
      throw new Error('Invalid session ID');
    }

    // Check for special characters that could be problematic
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      throw new Error('Invalid session ID');
    }

    // Check length (reasonable maximum)
    if (sessionId.length > 100) {
      throw new Error('Invalid session ID');
    }
  }

  /**
   * Get the file path for a session
   */
  private getSessionPath(sessionId: string): string {
    this.validateSessionId(sessionId);
    return path.join(this.basePath, `${sessionId}.json`);
  }

  /**
   * Generate a unique session ID
   */
  private async generateUniqueId(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const id = nanoid(16);
      const sessionPath = this.getSessionPath(id);

      try {
        await fs.access(sessionPath);
        // File exists, try again
        attempts++;
      } catch {
        // File doesn't exist, ID is unique
        return id;
      }
    }

    throw new Error('Failed to generate unique session ID');
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  /**
   * Check if value is an object
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date);
  }

  /**
   * Write file with retry logic for temporary failures
   */
  private async writeFileWithRetry(filePath: string, data: string, maxRetries: number = 3): Promise<void> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await fs.writeFile(filePath, data, 'utf-8');
        return;
      } catch (error: any) {
        lastError = error;

        // Retry on temporary errors
        if (error.code === 'EAGAIN' || error.code === 'EBUSY') {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
        } else {
          // Non-retryable error
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Acquire a lock for a session to handle concurrent updates
   */
  private async acquireLock(sessionId: string): Promise<() => void> {
    while (this.lockMap.has(sessionId)) {
      await this.lockMap.get(sessionId);
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>(resolve => {
      releaseLock = resolve;
    });

    this.lockMap.set(sessionId, lockPromise);

    // Auto-release lock after timeout
    const timeoutId = setTimeout(() => {
      this.lockMap.delete(sessionId);
      releaseLock!();
    }, 5000); // 5 second timeout

    // Return a function to manually release the lock
    return () => {
      clearTimeout(timeoutId);
      this.lockMap.delete(sessionId);
      releaseLock!();
    };
  }


  async create(projectId: string, data: ProjectData): Promise<string> {
    try {
      const sessionId = await this.generateUniqueId();
      const sessionPath = this.getSessionPath(sessionId);

      await this.writeFileWithRetry(sessionPath, JSON.stringify(data, null, 2));

      return sessionId;
    } catch (error: any) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async get(sessionId: string): Promise<ProjectData | null> {
    try {
      this.validateSessionId(sessionId);
      const sessionPath = this.getSessionPath(sessionId);

      const content = await fs.readFile(sessionPath, 'utf-8');

      try {
        return JSON.parse(content);
      } catch {
        throw new Error('Failed to parse session data');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }

      if (error.message === 'Invalid session ID' || error.message === 'Failed to parse session data') {
        throw error;
      }

      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  async update(sessionId: string, data: Partial<ProjectData>): Promise<void> {
    const releaseLock = await this.acquireLock(sessionId);

    try {
      this.validateSessionId(sessionId);
      const sessionPath = this.getSessionPath(sessionId);

      // Read existing data
      let existingData: ProjectData | null;
      try {
        const content = await fs.readFile(sessionPath, 'utf-8');
        existingData = JSON.parse(content);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(`Session not found: ${sessionId}`);
        }
        throw error;
      }

      // Deep merge the data
      const updatedData = this.deepMerge(existingData, data);

      // Write back with retry logic
      await this.writeFileWithRetry(sessionPath, JSON.stringify(updatedData, null, 2));
    } catch (error: any) {
      if (error.message.startsWith('Session not found') || error.message === 'Invalid session ID') {
        throw error;
      }
      throw new Error(`Failed to update session: ${error.message}`);
    } finally {
      releaseLock();
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      this.validateSessionId(sessionId);
      const sessionPath = this.getSessionPath(sessionId);

      await fs.unlink(sessionPath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return;
      }

      if (error.message === 'Invalid session ID') {
        throw error;
      }

      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  async exists(sessionId: string): Promise<boolean> {
    try {
      this.validateSessionId(sessionId);
      const sessionPath = this.getSessionPath(sessionId);

      await fs.access(sessionPath);
      return true;
    } catch {
      return false;
    }
  }

  async listSessions(projectId: string): Promise<string[]> {
    try {
      const files = await fs.readdir(this.basePath);
      const sessionIds: string[] = [];

      for (const file of files) {
        // Only process JSON files
        if (!file.endsWith('.json')) {
          continue;
        }

        const sessionId = file.replace('.json', '');
        const sessionPath = path.join(this.basePath, file);

        try {
          const content = await fs.readFile(sessionPath, 'utf-8');
          const data = JSON.parse(content);

          if (data.id === projectId) {
            sessionIds.push(sessionId);
          }
        } catch {
          // Skip corrupted or invalid files
          console.warn(`Skipping invalid session file: ${file}`);
        }
      }

      return sessionIds;
    } catch (error: any) {
      throw new Error(`Failed to list sessions: ${error.message}`);
    }
  }

  async cleanup(maxAge: number): Promise<number> {
    try {
      const files = await fs.readdir(this.basePath);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        // Only process JSON files
        if (!file.endsWith('.json')) {
          continue;
        }

        const filePath = path.join(this.basePath, file);

        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();

          if (age > maxAge) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          // Skip files that can't be accessed or deleted
          console.warn(`Failed to cleanup session file ${file}:`, error);
        }
      }

      return deletedCount;
    } catch (error: any) {
      throw new Error(`Failed to cleanup sessions: ${error.message}`);
    }
  }
}