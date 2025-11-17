import * as fs from 'fs/promises';
import * as path from 'path';
import { constants } from 'fs';
import { IStorageService, FileMetadata } from '../../../../shared/src/interfaces/storage.interface';
import * as crypto from 'crypto';

/**
 * Local file system implementation of IStorageService
 * Stores files in a directory structure: {basePath}/{projectId}/{filename}
 * Metadata is stored alongside files as {filename}.meta.json
 */
export class LocalStorageService implements IStorageService {
  private readonly basePath: string;
  private readonly uploadLocks: Map<string, Promise<void>> = new Map();

  constructor() {
    this.basePath = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
  }

  /**
   * Validates project ID to prevent path traversal attacks
   */
  private validateProjectId(projectId: string): void {
    if (!projectId || projectId.length === 0) {
      throw new Error('Invalid project ID');
    }

    // Check for path traversal attempts
    if (projectId.includes('..') || projectId.includes('/') || projectId.includes('\\')) {
      throw new Error('Invalid project ID');
    }

    // Normalize and check if it escapes the base directory
    const normalized = path.normalize(projectId);
    if (normalized !== projectId || normalized.startsWith('..')) {
      throw new Error('Invalid project ID');
    }
  }

  /**
   * Validates filename to prevent path traversal attacks
   */
  private validateFilename(filename: string): void {
    if (!filename || filename.length === 0) {
      throw new Error('Invalid filename');
    }

    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Invalid filename');
    }

    // Normalize and check if it's trying to escape
    const normalized = path.normalize(filename);
    if (normalized !== filename || normalized.startsWith('..')) {
      throw new Error('Invalid filename');
    }
  }

  /**
   * Gets the full path for a file
   */
  private getFilePath(projectId: string, filename: string): string {
    this.validateProjectId(projectId);
    this.validateFilename(filename);
    return path.join(this.basePath, projectId, filename);
  }

  /**
   * Gets the metadata file path
   */
  private getMetadataPath(projectId: string, filename: string): string {
    const filePath = this.getFilePath(projectId, filename);
    return `${filePath}.meta.json`;
  }

  /**
   * Detects MIME type based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'text/typescript',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.zip': 'application/zip',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Creates and saves metadata for a file
   */
  private async saveMetadata(
    projectId: string,
    filename: string,
    size: number
  ): Promise<void> {
    const metadata: FileMetadata = {
      filename,
      size,
      mimeType: this.getMimeType(filename),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const metadataPath = this.getMetadataPath(projectId, filename);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    projectId: string,
    file: Buffer,
    filename: string
  ): Promise<string> {
    this.validateProjectId(projectId);
    this.validateFilename(filename);

    const filePath = this.getFilePath(projectId, filename);
    const dirPath = path.dirname(filePath);

    // Create a unique key for this upload operation
    const uploadKey = `${projectId}:${filename}:${crypto.randomBytes(8).toString('hex')}`;

    try {
      // Use a lock to ensure thread-safe operations
      const uploadPromise = (async () => {
        try {
          // Create directory structure if it doesn't exist
          await fs.mkdir(dirPath, { recursive: true });

          // Write file to disk
          await fs.writeFile(filePath, file);

          // Save metadata
          await this.saveMetadata(projectId, filename, file.length);
        } finally {
          // Clean up the lock after operation completes
          this.uploadLocks.delete(uploadKey);
        }
      })();

      this.uploadLocks.set(uploadKey, uploadPromise);
      await uploadPromise;

      return filePath;
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download a file from storage
   */
  async downloadFile(projectId: string, filename: string): Promise<Buffer> {
    this.validateProjectId(projectId);
    this.validateFilename(filename);

    const filePath = this.getFilePath(projectId, filename);

    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * List all files for a project
   */
  async listFiles(projectId: string): Promise<string[]> {
    this.validateProjectId(projectId);

    const dirPath = path.join(this.basePath, projectId);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // Filter out directories and metadata files
      const files = entries
        .filter(entry => entry.isFile() && !entry.name.endsWith('.meta.json'))
        .map(entry => entry.name);

      return files;
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        // Project directory doesn't exist, return empty array
        return [];
      }
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Delete a specific file
   */
  async deleteFile(projectId: string, filename: string): Promise<void> {
    this.validateProjectId(projectId);
    this.validateFilename(filename);

    const filePath = this.getFilePath(projectId, filename);
    const metadataPath = this.getMetadataPath(projectId, filename);

    try {
      // Delete the main file
      await fs.unlink(filePath);

      // Try to delete metadata file (ignore if it doesn't exist)
      try {
        await fs.unlink(metadataPath);
      } catch (metaError: any) {
        if (metaError.code !== 'ENOENT') {
          throw metaError;
        }
        // Ignore if metadata file doesn't exist
      }
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete all files for a project
   */
  async deleteProject(projectId: string): Promise<void> {
    this.validateProjectId(projectId);

    const projectPath = path.join(this.basePath, projectId);

    try {
      await fs.rm(projectPath, { recursive: true, force: true });
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        // Project doesn't exist, that's okay
        return;
      }
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(projectId: string, filename: string): Promise<boolean> {
    this.validateProjectId(projectId);
    this.validateFilename(filename);

    const filePath = this.getFilePath(projectId, filename);

    try {
      await fs.access(filePath, constants.F_OK);
      return true;
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        return false;
      }
      throw new Error(`Failed to check file existence: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(projectId: string, filename: string): Promise<FileMetadata> {
    this.validateProjectId(projectId);
    this.validateFilename(filename);

    const metadataPath = this.getMetadataPath(projectId, filename);

    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');

      try {
        const metadata = JSON.parse(metadataContent);

        // Convert date strings back to Date objects
        metadata.createdAt = new Date(metadata.createdAt);
        metadata.updatedAt = new Date(metadata.updatedAt);

        return metadata as FileMetadata;
      } catch (parseError) {
        throw new Error('Invalid metadata format');
      }
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        throw new Error('Metadata not found');
      }
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }
}