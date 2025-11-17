import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalStorageService } from '../../src/services/local/storage.service';
import { FileMetadata } from '../../../shared/src/interfaces/storage.interface';

describe('LocalStorageService Integration Tests', () => {
  let storageService: LocalStorageService;
  const testBasePath = '/tmp/kirby-gen-test-storage';
  const projectId = 'integration-test-project';
  const testFile = 'test-document.txt';
  const testContent = Buffer.from('This is integration test content');

  beforeAll(async () => {
    // Set up test environment
    process.env.STORAGE_PATH = testBasePath;
    storageService = new LocalStorageService();

    // Ensure test directory exists
    await fs.mkdir(testBasePath, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testBasePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clean project directory before each test
    try {
      await fs.rm(path.join(testBasePath, projectId), { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
  });

  describe('Full workflow', () => {
    it('should handle complete file lifecycle', async () => {
      // 1. Upload a file
      const uploadedPath = await storageService.uploadFile(projectId, testContent, testFile);
      expect(uploadedPath).toBe(path.join(testBasePath, projectId, testFile));

      // Verify file exists on disk
      const fileExists = await fs.access(uploadedPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 2. Check if file exists
      const exists = await storageService.fileExists(projectId, testFile);
      expect(exists).toBe(true);

      // 3. Download the file
      const downloadedContent = await storageService.downloadFile(projectId, testFile);
      expect(downloadedContent.toString()).toBe(testContent.toString());

      // 4. Get file metadata
      const metadata = await storageService.getFileMetadata(projectId, testFile);
      expect(metadata.filename).toBe(testFile);
      expect(metadata.size).toBe(testContent.length);
      expect(metadata.mimeType).toBe('text/plain');
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.updatedAt).toBeInstanceOf(Date);

      // 5. List files
      const files = await storageService.listFiles(projectId);
      expect(files).toContain(testFile);

      // 6. Delete the file
      await storageService.deleteFile(projectId, testFile);

      // Verify file is deleted
      const existsAfterDelete = await storageService.fileExists(projectId, testFile);
      expect(existsAfterDelete).toBe(false);

      // List should be empty
      const filesAfterDelete = await storageService.listFiles(projectId);
      expect(filesAfterDelete).toEqual([]);
    });

    it('should handle multiple files in a project', async () => {
      const files = [
        { name: 'doc1.pdf', content: Buffer.from('PDF content 1') },
        { name: 'doc2.docx', content: Buffer.from('Word content') },
        { name: 'image.png', content: Buffer.from('PNG data') },
      ];

      // Upload all files
      for (const file of files) {
        await storageService.uploadFile(projectId, file.content, file.name);
      }

      // List should contain all files
      const listedFiles = await storageService.listFiles(projectId);
      expect(listedFiles.length).toBe(3);
      expect(listedFiles).toContain('doc1.pdf');
      expect(listedFiles).toContain('doc2.docx');
      expect(listedFiles).toContain('image.png');

      // Delete one file
      await storageService.deleteFile(projectId, 'doc1.pdf');

      // List should have 2 files
      const remainingFiles = await storageService.listFiles(projectId);
      expect(remainingFiles.length).toBe(2);
      expect(remainingFiles).not.toContain('doc1.pdf');

      // Delete entire project
      await storageService.deleteProject(projectId);

      // List should be empty (project doesn't exist)
      const finalFiles = await storageService.listFiles(projectId);
      expect(finalFiles).toEqual([]);
    });

    it('should handle concurrent operations', async () => {
      const operations = [];

      // Upload 5 files concurrently
      for (let i = 0; i < 5; i++) {
        operations.push(
          storageService.uploadFile(
            projectId,
            Buffer.from(`Content ${i}`),
            `file-${i}.txt`
          )
        );
      }

      const results = await Promise.all(operations);
      expect(results).toHaveLength(5);

      // Verify all files exist
      const files = await storageService.listFiles(projectId);
      expect(files).toHaveLength(5);

      // Download all files concurrently
      const downloads = [];
      for (let i = 0; i < 5; i++) {
        downloads.push(
          storageService.downloadFile(projectId, `file-${i}.txt`)
        );
      }

      const contents = await Promise.all(downloads);
      contents.forEach((content, i) => {
        expect(content.toString()).toBe(`Content ${i}`);
      });
    });

    it('should correctly detect MIME types', async () => {
      const testFiles = [
        { name: 'document.pdf', expectedMime: 'application/pdf' },
        { name: 'image.jpg', expectedMime: 'image/jpeg' },
        { name: 'script.js', expectedMime: 'application/javascript' },
        { name: 'data.json', expectedMime: 'application/json' },
        { name: 'unknown.xyz', expectedMime: 'application/octet-stream' },
      ];

      for (const testFile of testFiles) {
        await storageService.uploadFile(
          projectId,
          Buffer.from('test'),
          testFile.name
        );

        const metadata = await storageService.getFileMetadata(projectId, testFile.name);
        expect(metadata.mimeType).toBe(testFile.expectedMime);
      }
    });

    it('should maintain separate projects', async () => {
      const project1 = 'project-alpha';
      const project2 = 'project-beta';

      // Upload to project 1
      await storageService.uploadFile(project1, Buffer.from('Alpha content'), 'alpha.txt');

      // Upload to project 2
      await storageService.uploadFile(project2, Buffer.from('Beta content'), 'beta.txt');

      // Each project should have only its own files
      const project1Files = await storageService.listFiles(project1);
      const project2Files = await storageService.listFiles(project2);

      expect(project1Files).toEqual(['alpha.txt']);
      expect(project2Files).toEqual(['beta.txt']);

      // Delete project 1 should not affect project 2
      await storageService.deleteProject(project1);

      const project1AfterDelete = await storageService.listFiles(project1);
      const project2AfterDelete = await storageService.listFiles(project2);

      expect(project1AfterDelete).toEqual([]);
      expect(project2AfterDelete).toEqual(['beta.txt']);

      // Clean up project 2
      await storageService.deleteProject(project2);
    });
  });

  describe('Error handling', () => {
    it('should reject invalid characters in project IDs and filenames', async () => {
      await expect(
        storageService.uploadFile('../etc', testContent, testFile)
      ).rejects.toThrow('Invalid project ID');

      await expect(
        storageService.uploadFile(projectId, testContent, '../passwd')
      ).rejects.toThrow('Invalid filename');
    });

    it('should handle non-existent files gracefully', async () => {
      await expect(
        storageService.downloadFile(projectId, 'non-existent.txt')
      ).rejects.toThrow('File not found');

      const exists = await storageService.fileExists(projectId, 'non-existent.txt');
      expect(exists).toBe(false);

      await expect(
        storageService.getFileMetadata(projectId, 'non-existent.txt')
      ).rejects.toThrow('Metadata not found');
    });
  });
});