import * as fs from 'fs/promises';
import * as path from 'path';
import { constants } from 'fs';
import { IStorageService, FileMetadata } from '../../../../shared/src/interfaces/storage.interface';
import {
  ProjectData,
  ConversationTurn,
  ConversationSession,
  GeneratedArtifacts,
  ProjectStatus,
} from '../../../../shared/src/types/project.types';
import * as crypto from 'crypto';

/**
 * Local file system implementation of IStorageService
 * Stores files in a directory structure: {basePath}/{projectId}/{filename}
 * Metadata is stored alongside files as {filename}.meta.json
 */
export interface LocalStorageConfig {
  basePath: string;
  createDirectories?: boolean;
}

export class LocalStorageService implements IStorageService {
  private readonly basePath: string;
  private readonly uploadLocks: Map<string, Promise<void>> = new Map();

  constructor(config?: LocalStorageConfig) {
    this.basePath = config?.basePath || process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');

    // Create base directory if requested
    if (config?.createDirectories) {
      fs.mkdir(this.basePath, { recursive: true }).catch(err => {
        console.error(`Failed to create storage directory: ${err.message}`);
      });
    }
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

  /**
   * Get the project metadata file path
   */
  private getProjectMetadataPath(projectId: string): string {
    this.validateProjectId(projectId);
    return path.join(this.basePath, projectId, '_project.json');
  }

  /**
   * Create a new project
   */
  async createProject(projectData: ProjectData): Promise<ProjectData> {
    this.validateProjectId(projectData.id);

    const projectPath = path.join(this.basePath, projectData.id);
    const metadataPath = this.getProjectMetadataPath(projectData.id);

    try {
      // Create project directory
      await fs.mkdir(projectPath, { recursive: true });

      // Save project metadata
      await fs.writeFile(metadataPath, JSON.stringify(projectData, null, 2), 'utf-8');

      return projectData;
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Get project metadata
   */
  async getProject(projectId: string): Promise<ProjectData | null> {
    this.validateProjectId(projectId);

    const metadataPath = this.getProjectMetadataPath(projectId);

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const projectData = JSON.parse(content);

      // Convert date strings back to Date objects
      projectData.createdAt = new Date(projectData.createdAt);
      projectData.updatedAt = new Date(projectData.updatedAt);

      return projectData as ProjectData;
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to get project: ${error.message}`);
    }
  }

  /**
   * Update project metadata
   */
  async updateProject(projectId: string, updates: Partial<ProjectData>): Promise<ProjectData> {
    this.validateProjectId(projectId);

    const existingProject = await this.getProject(projectId);

    if (!existingProject) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Merge updates
    const updatedProject: ProjectData = {
      ...existingProject,
      ...updates,
      id: existingProject.id, // Prevent ID change
      createdAt: existingProject.createdAt, // Prevent creation date change
      updatedAt: new Date(),
    };

    const metadataPath = this.getProjectMetadataPath(projectId);

    try {
      await fs.writeFile(metadataPath, JSON.stringify(updatedProject, null, 2), 'utf-8');
      return updatedProject;
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<ProjectData[]> {
    const projects: ProjectData[] = [];

    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const project = await this.getProject(entry.name);
            if (project) {
              projects.push(project);
            }
          } catch {
            // Skip directories without valid project metadata
            continue;
          }
        }
      }

      // Sort by creation date (newest first)
      return projects.sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Base directory doesn't exist, return empty array
        return [];
      }
      throw new Error(`Failed to list projects: ${error.message}`);
    }
  }

  /**
   * Get conversation file path for a project phase
   */
  private getConversationPath(projectId: string, phase: ProjectStatus): string {
    this.validateProjectId(projectId);
    return path.join(this.basePath, projectId, 'conversations', `${phase}.json`);
  }

  /**
   * Save a conversation turn (append-based for active conversations)
   */
  async saveConversationTurn(
    projectId: string,
    phase: ProjectStatus,
    turn: ConversationTurn
  ): Promise<void> {
    this.validateProjectId(projectId);

    // Verify project exists
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const conversationPath = this.getConversationPath(projectId, phase);
    const conversationDir = path.dirname(conversationPath);

    try {
      // Ensure conversations directory exists
      await fs.mkdir(conversationDir, { recursive: true });

      // Load existing conversation or create new
      let session: ConversationSession;
      try {
        const content = await fs.readFile(conversationPath, 'utf-8');
        session = JSON.parse(content);
        // Convert date strings back to Date objects
        session.startedAt = new Date(session.startedAt);
        if (session.completedAt) {
          session.completedAt = new Date(session.completedAt);
        }
        session.turns = session.turns.map(t => ({
          ...t,
          timestamp: new Date(t.timestamp),
        }));
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Create new session
          session = {
            projectId,
            phase,
            sessionId: crypto.randomUUID(),
            startedAt: new Date(),
            turns: [],
            status: 'active',
          };
        } else {
          throw error;
        }
      }

      // Append new turn
      session.turns.push(turn);

      // Write atomically (tmp file + rename)
      const tmpPath = `${conversationPath}.tmp`;
      await fs.writeFile(tmpPath, JSON.stringify(session, null, 2), 'utf-8');
      await fs.rename(tmpPath, conversationPath);
    } catch (error: any) {
      if (error.message?.includes('Invalid') || error.message?.includes('not found')) {
        throw error;
      }
      throw new Error(`Failed to save conversation turn: ${error.message}`);
    }
  }

  /**
   * Get conversation by phase
   */
  async getConversation(
    projectId: string,
    phase: ProjectStatus
  ): Promise<ConversationSession | null> {
    this.validateProjectId(projectId);

    const conversationPath = this.getConversationPath(projectId, phase);

    try {
      const content = await fs.readFile(conversationPath, 'utf-8');
      const session: ConversationSession = JSON.parse(content);

      // Convert date strings back to Date objects
      session.startedAt = new Date(session.startedAt);
      if (session.completedAt) {
        session.completedAt = new Date(session.completedAt);
      }
      session.turns = session.turns.map(t => ({
        ...t,
        timestamp: new Date(t.timestamp),
      }));

      return session;
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  /**
   * Save generated artifacts metadata
   */
  async saveGeneratedArtifacts(
    projectId: string,
    artifacts: GeneratedArtifacts
  ): Promise<void> {
    this.validateProjectId(projectId);

    // Update project metadata with artifacts reference
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    await this.updateProject(projectId, {
      generatedArtifacts: artifacts,
    });
  }

  /**
   * Get generated artifacts metadata
   */
  async getGeneratedArtifacts(
    projectId: string
  ): Promise<GeneratedArtifacts | null> {
    this.validateProjectId(projectId);

    const project = await this.getProject(projectId);
    return project?.generatedArtifacts || null;
  }
}