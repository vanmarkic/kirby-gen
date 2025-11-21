import {
  ProjectData,
  ConversationTurn,
  ConversationSession,
  GeneratedArtifacts,
  ProjectStatus,
} from '../types/project.types';

/**
 * Storage Service Interface
 * Abstracts file storage operations (local file system, S3, etc.)
 */
export interface IStorageService {
  /**
   * Create a new project
   * @param projectData - Project data
   * @returns Created project
   */
  createProject(projectData: ProjectData): Promise<ProjectData>;

  /**
   * Get a project by ID
   * @param projectId - Project ID
   * @returns Project data or null if not found
   */
  getProject(projectId: string): Promise<ProjectData | null>;

  /**
   * Update a project
   * @param projectId - Project ID
   * @param updates - Partial project data to update
   * @returns Updated project
   */
  updateProject(projectId: string, updates: Partial<ProjectData>): Promise<ProjectData>;

  /**
   * List all projects
   * @returns Array of projects
   */
  listProjects(): Promise<ProjectData[]>;

  /**
   * Upload a file to storage
   * @param projectId - Unique project identifier
   * @param file - File buffer
   * @param filename - Name of the file
   * @returns URL or path to the uploaded file
   */
  uploadFile(projectId: string, file: Buffer, filename: string): Promise<string>;

  /**
   * Download a file from storage
   * @param projectId - Unique project identifier
   * @param filename - Name of the file
   * @returns File buffer
   */
  downloadFile(projectId: string, filename: string): Promise<Buffer>;

  /**
   * List all files for a project
   * @param projectId - Unique project identifier
   * @returns Array of filenames
   */
  listFiles(projectId: string): Promise<string[]>;

  /**
   * Delete a specific file
   * @param projectId - Unique project identifier
   * @param filename - Name of the file
   */
  deleteFile(projectId: string, filename: string): Promise<void>;

  /**
   * Delete all files for a project
   * @param projectId - Unique project identifier
   */
  deleteProject(projectId: string): Promise<void>;

  /**
   * Check if a file exists
   * @param projectId - Unique project identifier
   * @param filename - Name of the file
   * @returns True if file exists
   */
  fileExists(projectId: string, filename: string): Promise<boolean>;

  /**
   * Get file metadata
   * @param projectId - Unique project identifier
   * @param filename - Name of the file
   * @returns File metadata
   */
  getFileMetadata(projectId: string, filename: string): Promise<FileMetadata>;

  /**
   * Save a conversation turn (append-based for active conversations)
   * @param projectId - Unique project identifier
   * @param phase - Workflow phase this conversation belongs to
   * @param turn - Conversation turn to save
   */
  saveConversationTurn(
    projectId: string,
    phase: ProjectStatus,
    turn: ConversationTurn
  ): Promise<void>;

  /**
   * Get conversation by phase
   * @param projectId - Unique project identifier
   * @param phase - Workflow phase
   * @returns Conversation session or null if not found
   */
  getConversation(
    projectId: string,
    phase: ProjectStatus
  ): Promise<ConversationSession | null>;

  /**
   * Save generated artifacts metadata
   * @param projectId - Unique project identifier
   * @param artifacts - Generated artifacts metadata
   */
  saveGeneratedArtifacts(
    projectId: string,
    artifacts: GeneratedArtifacts
  ): Promise<void>;

  /**
   * Get generated artifacts metadata
   * @param projectId - Unique project identifier
   * @returns Generated artifacts or null if not found
   */
  getGeneratedArtifacts(
    projectId: string
  ): Promise<GeneratedArtifacts | null>;
}

export interface FileMetadata {
  filename: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}
