/**
 * Storage Service Interface
 * Abstracts file storage operations (local file system, S3, etc.)
 */
export interface IStorageService {
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
}

export interface FileMetadata {
  filename: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}
