import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalStorageService } from '../../../src/services/local/storage.service';
import { FileMetadata } from '../../../../shared/src/interfaces/storage.interface';

// Mock fs/promises
jest.mock('fs/promises');

describe('LocalStorageService', () => {
  let storageService: LocalStorageService;
  const basePath = '/tmp/test-storage';
  const projectId = 'test-project-123';
  const filename = 'test-file.txt';
  const fileContent = Buffer.from('Hello, World!');

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set environment variable
    process.env.STORAGE_PATH = basePath;

    // Create service instance
    storageService = new LocalStorageService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default storage path if STORAGE_PATH is not set', () => {
      delete process.env.STORAGE_PATH;
      const service = new LocalStorageService();
      expect(service).toBeDefined();
    });

    it('should use STORAGE_PATH from environment variable', () => {
      process.env.STORAGE_PATH = '/custom/path';
      const service = new LocalStorageService();
      expect(service).toBeDefined();
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const expectedPath = path.join(basePath, projectId, filename);
      const expectedMetaPath = `${expectedPath}.meta.json`;

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await storageService.uploadFile(projectId, fileContent, filename);

      expect(result).toBe(expectedPath);
      expect(fs.mkdir as jest.Mock).toHaveBeenCalledWith(
        path.join(basePath, projectId),
        { recursive: true }
      );
      expect(fs.writeFile as jest.Mock).toHaveBeenCalledWith(expectedPath, fileContent);
      expect(fs.writeFile as jest.Mock).toHaveBeenCalledWith(
        expectedMetaPath,
        expect.any(String),
        'utf-8'
      );
    });

    it('should handle invalid project ID', async () => {
      await expect(
        storageService.uploadFile('', fileContent, filename)
      ).rejects.toThrow('Invalid project ID');

      await expect(
        storageService.uploadFile('../malicious', fileContent, filename)
      ).rejects.toThrow('Invalid project ID');
    });

    it('should handle invalid filename', async () => {
      await expect(
        storageService.uploadFile(projectId, fileContent, '')
      ).rejects.toThrow('Invalid filename');

      await expect(
        storageService.uploadFile(projectId, fileContent, '../malicious.txt')
      ).rejects.toThrow('Invalid filename');
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (fs.mkdir as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.uploadFile(projectId, fileContent, filename)
      ).rejects.toThrow('Failed to upload file');
    });

    it('should handle concurrent uploads safely', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const promises = Array(10).fill(null).map((_, i) =>
        storageService.uploadFile(projectId, fileContent, `file-${i}.txt`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toBe(path.join(basePath, projectId, `file-${i}.txt`));
      });
    });
  });

  describe('downloadFile', () => {
    it('should download a file successfully', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(fileContent);

      const result = await storageService.downloadFile(projectId, filename);

      expect(result).toEqual(fileContent);
      expect(fs.readFile as jest.Mock).toHaveBeenCalledWith(
        path.join(basePath, projectId, filename)
      );
    });

    it('should handle file not found', async () => {
      const error = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT'
      });
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.downloadFile(projectId, 'nonexistent.txt')
      ).rejects.toThrow('File not found');
    });

    it('should handle invalid project ID', async () => {
      await expect(
        storageService.downloadFile('', filename)
      ).rejects.toThrow('Invalid project ID');

      await expect(
        storageService.downloadFile('../../etc', filename)
      ).rejects.toThrow('Invalid project ID');
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.downloadFile(projectId, filename)
      ).rejects.toThrow('Failed to download file');
    });
  });

  describe('listFiles', () => {
    it('should list files in a project directory', async () => {
      const files = ['file1.txt', 'file2.pdf', 'file1.txt.meta.json', 'file2.pdf.meta.json'];
      const dirents = files.map(name => ({
        name,
        isFile: () => true,
        isDirectory: () => false
      })) as any;

      (fs.readdir as jest.Mock).mockResolvedValue(dirents);

      const result = await storageService.listFiles(projectId);

      expect(result).toEqual(['file1.txt', 'file2.pdf']);
      expect(fs.readdir as jest.Mock).toHaveBeenCalledWith(
        path.join(basePath, projectId),
        { withFileTypes: true }
      );
    });

    it('should return empty array for non-existent project', async () => {
      const error = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT'
      });
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      const result = await storageService.listFiles('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.listFiles(projectId)
      ).rejects.toThrow('Failed to list files');
    });

    it('should exclude metadata files from listing', async () => {
      const files = ['data.json', 'data.json.meta.json', 'image.png', 'image.png.meta.json'];
      const dirents = files.map(name => ({
        name,
        isFile: () => true,
        isDirectory: () => false
      })) as any;

      (fs.readdir as jest.Mock).mockResolvedValue(dirents);

      const result = await storageService.listFiles(projectId);

      expect(result).toEqual(['data.json', 'image.png']);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file and its metadata successfully', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await storageService.deleteFile(projectId, filename);

      expect(fs.unlink as jest.Mock).toHaveBeenCalledWith(
        path.join(basePath, projectId, filename)
      );
      expect(fs.unlink as jest.Mock).toHaveBeenCalledWith(
        path.join(basePath, projectId, `${filename}.meta.json`)
      );
    });

    it('should handle file not found', async () => {
      const error = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT'
      });
      (fs.unlink as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.deleteFile(projectId, 'nonexistent.txt')
      ).rejects.toThrow('File not found');
    });

    it('should handle invalid project ID', async () => {
      await expect(
        storageService.deleteFile('', filename)
      ).rejects.toThrow('Invalid project ID');
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (fs.unlink as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.deleteFile(projectId, filename)
      ).rejects.toThrow('Failed to delete file');
    });

    it('should ignore missing metadata file', async () => {
      const fileError = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT'
      });

      (fs.unlink as jest.Mock)
        .mockResolvedValueOnce(undefined) // Main file deletion succeeds
        .mockRejectedValueOnce(fileError); // Metadata file doesn't exist

      await expect(
        storageService.deleteFile(projectId, filename)
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteProject', () => {
    it('should delete entire project directory', async () => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      await storageService.deleteProject(projectId);

      expect(fs.rm as jest.Mock).toHaveBeenCalledWith(
        path.join(basePath, projectId),
        { recursive: true, force: true }
      );
    });

    it('should handle non-existent project gracefully', async () => {
      const error = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT'
      });
      (fs.rm as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.deleteProject('nonexistent')
      ).resolves.toBeUndefined();
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (fs.rm as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.deleteProject(projectId)
      ).rejects.toThrow('Failed to delete project');
    });

    it('should handle invalid project ID', async () => {
      await expect(
        storageService.deleteProject('')
      ).rejects.toThrow('Invalid project ID');

      await expect(
        storageService.deleteProject('../malicious')
      ).rejects.toThrow('Invalid project ID');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      const result = await storageService.fileExists(projectId, filename);

      expect(result).toBe(true);
      expect(fs.access as jest.Mock).toHaveBeenCalledWith(
        path.join(basePath, projectId, filename),
        expect.any(Number)
      );
    });

    it('should return false when file does not exist', async () => {
      const error = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT'
      });
      (fs.access as jest.Mock).mockRejectedValue(error);

      const result = await storageService.fileExists(projectId, 'nonexistent.txt');

      expect(result).toBe(false);
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (fs.access as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.fileExists(projectId, filename)
      ).rejects.toThrow('Failed to check file existence');
    });

    it('should handle invalid project ID', async () => {
      await expect(
        storageService.fileExists('', filename)
      ).rejects.toThrow('Invalid project ID');
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata successfully', async () => {
      const metadata: FileMetadata = {
        filename,
        size: 1024,
        mimeType: 'text/plain',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };

      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(JSON.stringify(metadata)));

      const result = await storageService.getFileMetadata(projectId, filename);

      expect(result).toEqual(metadata);
      expect(fs.readFile as jest.Mock).toHaveBeenCalledWith(
        path.join(basePath, projectId, `${filename}.meta.json`),
        'utf-8'
      );
    });

    it('should handle missing metadata file', async () => {
      const error = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT'
      });
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.getFileMetadata(projectId, filename)
      ).rejects.toThrow('Metadata not found');
    });

    it('should handle corrupted metadata file', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('invalid json'));

      await expect(
        storageService.getFileMetadata(projectId, filename)
      ).rejects.toThrow('Invalid metadata format');
    });

    it('should handle invalid project ID', async () => {
      await expect(
        storageService.getFileMetadata('', filename)
      ).rejects.toThrow('Invalid project ID');
    });

    it('should handle permission errors', async () => {
      const error = new Error('EACCES: permission denied');
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(
        storageService.getFileMetadata(projectId, filename)
      ).rejects.toThrow('Failed to get file metadata');
    });
  });

  describe('validation', () => {
    it('should reject path traversal attempts in project ID', async () => {
      const maliciousIds = [
        '../etc',
        '../../passwd',
        'valid/../../etc',
        'project/../../../etc'
      ];

      for (const id of maliciousIds) {
        await expect(
          storageService.uploadFile(id, fileContent, filename)
        ).rejects.toThrow('Invalid project ID');
      }
    });

    it('should reject path traversal attempts in filename', async () => {
      const maliciousFilenames = [
        '../secret.txt',
        '../../etc/passwd',
        'file/../../../etc/passwd',
        'valid/../../../secret.txt'
      ];

      for (const name of maliciousFilenames) {
        await expect(
          storageService.uploadFile(projectId, fileContent, name)
        ).rejects.toThrow('Invalid filename');
      }
    });

    it('should accept valid project IDs', async () => {
      const validIds = [
        'project-123',
        'user_456',
        'test.project',
        'PROJECT-789'
      ];

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      for (const id of validIds) {
        await expect(
          storageService.uploadFile(id, fileContent, filename)
        ).resolves.toBeDefined();
      }
    });

    it('should accept valid filenames', async () => {
      const validFilenames = [
        'document.pdf',
        'report-2024.xlsx',
        'image_001.png',
        'data.json'
      ];

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      for (const name of validFilenames) {
        await expect(
          storageService.uploadFile(projectId, fileContent, name)
        ).resolves.toBeDefined();
      }
    });
  });

  describe('thread safety', () => {
    it('should handle concurrent operations on same file', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(fileContent);

      const operations = [
        storageService.uploadFile(projectId, fileContent, 'concurrent.txt'),
        storageService.downloadFile(projectId, 'concurrent.txt'),
        storageService.fileExists(projectId, 'concurrent.txt')
      ];

      const results = await Promise.allSettled(operations);

      // At least upload should succeed
      expect(results[0].status).toBe('fulfilled');
    });

    it('should handle concurrent uploads to different files', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const uploads = Array(5).fill(null).map((_, i) =>
        storageService.uploadFile(projectId, Buffer.from(`content-${i}`), `file-${i}.txt`)
      );

      const results = await Promise.all(uploads);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result).toBe(path.join(basePath, projectId, `file-${i}.txt`));
      });
    });

    it('should handle concurrent project deletions safely', async () => {
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      const deletions = [
        storageService.deleteProject('project-1'),
        storageService.deleteProject('project-2'),
        storageService.deleteProject('project-3')
      ];

      await expect(Promise.all(deletions)).resolves.toBeDefined();

      expect(fs.rm as jest.Mock).toHaveBeenCalledTimes(3);
    });
  });
});