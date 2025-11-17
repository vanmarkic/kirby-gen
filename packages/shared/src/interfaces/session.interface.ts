import { ProjectData } from '../types/project.types';

/**
 * Session Service Interface
 * Abstracts session storage operations (local JSON, Redis, etc.)
 */
export interface ISessionService {
  /**
   * Create a new session
   * @param projectId - Unique project identifier
   * @param data - Initial project data
   * @returns Session ID
   */
  create(projectId: string, data: ProjectData): Promise<string>;

  /**
   * Get session data
   * @param sessionId - Unique session identifier
   * @returns Project data or null if not found
   */
  get(sessionId: string): Promise<ProjectData | null>;

  /**
   * Update session data
   * @param sessionId - Unique session identifier
   * @param data - Partial project data to update
   */
  update(sessionId: string, data: Partial<ProjectData>): Promise<void>;

  /**
   * Delete a session
   * @param sessionId - Unique session identifier
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Check if a session exists
   * @param sessionId - Unique session identifier
   * @returns True if session exists
   */
  exists(sessionId: string): Promise<boolean>;

  /**
   * List all sessions for a project
   * @param projectId - Unique project identifier
   * @returns Array of session IDs
   */
  listSessions(projectId: string): Promise<string[]>;

  /**
   * Cleanup expired sessions
   * @param maxAge - Maximum age in milliseconds
   * @returns Number of sessions deleted
   */
  cleanup(maxAge: number): Promise<number>;
}
