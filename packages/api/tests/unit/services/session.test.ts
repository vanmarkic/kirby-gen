import { describe, it, expect, jest, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalSessionService } from '../../../src/services/local/session.service';
import type { ProjectData, ProjectStatus } from '../../../../shared/src/types/project.types';
import { nanoid } from 'nanoid';

// Mock fs/promises
jest.mock('fs/promises');
jest.mock('nanoid');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('LocalSessionService', () => {
  let service: LocalSessionService;
  const mockBasePath = '/tmp/test-sessions';
  const originalEnv = process.env;

  // Helper function to create mock ProjectData
  const createMockProjectData = (id: string = 'test-project'): ProjectData => ({
    id,
    name: 'Test Project',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    inputs: {
      contentFiles: [],
      brandingAssets: {}
    },
    status: 'input' as ProjectStatus,
    currentStep: 1,
    totalSteps: 6,
    errors: []
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set up environment
    process.env = { ...originalEnv, SESSION_PATH: mockBasePath };

    // Mock fs methods
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockRejectedValue(new Error('File does not exist'));
    mockFs.readdir.mockResolvedValue([] as any);
    mockFs.stat.mockResolvedValue({ mtime: new Date() } as any);

    // Mock nanoid - reset counter for each test
    (nanoid as jest.Mock).mockImplementation((length?: any) => {
      const len = length || 21;
      return 'mock-session-id-test'.padEnd(len, '0').slice(0, len);
    });

    // Create service instance
    service = new LocalSessionService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use SESSION_PATH from environment', () => {
      expect(service['basePath']).toBe(mockBasePath);
    });

    it('should use default path when SESSION_PATH is not set', () => {
      delete process.env.SESSION_PATH;
      const serviceWithDefault = new LocalSessionService();
      expect(serviceWithDefault['basePath']).toContain('sessions');
    });

    it('should create base directory on initialization', async () => {
      // Allow constructor to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockFs.mkdir).toHaveBeenCalledWith(mockBasePath, { recursive: true });
    });
  });

  describe('create', () => {
    it('should create a new session with unique ID', async () => {
      const projectData = createMockProjectData('project-1');
      mockFs.writeFile.mockResolvedValue(undefined);

      const sessionId = await service.create('project-1', projectData);

      expect(sessionId).toHaveLength(16);
      expect(sessionId).toMatch(/^m/);
      expect(nanoid).toHaveBeenCalledWith(16);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockBasePath, `${sessionId}.json`),
        JSON.stringify(projectData, null, 2),
        'utf-8'
      );
    });

    it('should handle write errors gracefully', async () => {
      const projectData = createMockProjectData();
      const error = new Error('Disk full');
      mockFs.writeFile.mockRejectedValue(error);

      await expect(service.create('project-1', projectData)).rejects.toThrow('Failed to create session: Disk full');
    });

    it('should ensure unique session IDs', async () => {
      const projectData = createMockProjectData();
      mockFs.access
        .mockResolvedValueOnce(undefined) // First ID exists
        .mockRejectedValueOnce(new Error('Not found')); // Second ID doesn't exist

      let callCount = 0;
      (nanoid as jest.Mock).mockImplementation((length?: any) => {
        callCount++;
        const len = length || 21;
        const id = callCount === 1 ? 'existing-id' : 'unique-id0000000';
        return id.slice(0, len);
      });

      mockFs.writeFile.mockResolvedValue(undefined);

      const sessionId = await service.create('project-1', projectData);

      expect(sessionId).toBe('unique-id0000000');
      expect(nanoid).toHaveBeenCalledTimes(2);
    });
  });

  describe('get', () => {
    it('should retrieve existing session data', async () => {
      const projectData = createMockProjectData();
      const jsonData = JSON.stringify(projectData);
      mockFs.readFile.mockResolvedValue(jsonData);

      const result = await service.get('session-123');

      // Dates get converted to strings when serialized/deserialized via JSON
      const expectedData = JSON.parse(JSON.stringify(projectData));
      expect(result).toEqual(expectedData);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(mockBasePath, 'session-123.json'),
        'utf-8'
      );
    });

    it('should return null for non-existent session', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error for invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      await expect(service.get('session-123')).rejects.toThrow('Failed to parse session data');
    });

    it('should handle file read errors', async () => {
      const error = new Error('Permission denied');
      mockFs.readFile.mockRejectedValue(error);

      await expect(service.get('session-123')).rejects.toThrow('Failed to get session: Permission denied');
    });

    it('should validate session ID format', async () => {
      await expect(service.get('../malicious')).rejects.toThrow('Invalid session ID');
      await expect(service.get('../../etc/passwd')).rejects.toThrow('Invalid session ID');
      await expect(service.get('session/../../evil')).rejects.toThrow('Invalid session ID');
    });
  });

  describe('update', () => {
    it('should update existing session data', async () => {
      const originalData = createMockProjectData();
      const updates = { status: 'completed' as ProjectStatus, currentStep: 6 };
      const updatedData = { ...originalData, ...updates };

      mockFs.readFile.mockResolvedValue(JSON.stringify(originalData));
      mockFs.writeFile.mockResolvedValue(undefined);

      await service.update('session-123', updates);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockBasePath, 'session-123.json'),
        JSON.stringify(updatedData, null, 2),
        'utf-8'
      );
    });

    it('should throw error when session does not exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      await expect(service.update('non-existent', {})).rejects.toThrow('Session not found: non-existent');
    });

    it('should handle concurrent updates with file locking', async () => {
      const originalData = createMockProjectData();
      mockFs.readFile.mockResolvedValue(JSON.stringify(originalData));

      let writeCallCount = 0;
      mockFs.writeFile.mockImplementation(() => {
        writeCallCount++;
        if (writeCallCount === 1) {
          return Promise.reject({ code: 'EBUSY' });
        }
        return Promise.resolve();
      });

      await service.update('session-123', { status: 'completed' as ProjectStatus });

      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
    });

    it('should deep merge nested objects', async () => {
      const originalData = createMockProjectData();
      originalData.inputs.brandingAssets = {
        colors: {
          primary: '#000000',
          secondary: '#ffffff'
        }
      };

      const updates: Partial<ProjectData> = {
        inputs: {
          ...originalData.inputs,
          brandingAssets: {
            colors: {
              primary: '#ff0000'
            }
          }
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(originalData));
      mockFs.writeFile.mockResolvedValue(undefined);

      await service.update('session-123', updates);

      const writtenData = JSON.parse(mockFs.writeFile.mock.calls[0][1] as string);
      expect(writtenData.inputs.brandingAssets.colors.primary).toBe('#ff0000');
      expect(writtenData.inputs.brandingAssets.colors.secondary).toBe('#ffffff');
    });
  });

  describe('delete', () => {
    it('should delete existing session', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await service.delete('session-123');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockBasePath, 'session-123.json')
      );
    });

    it('should not throw error when deleting non-existent session', async () => {
      mockFs.unlink.mockRejectedValue({ code: 'ENOENT' });

      await expect(service.delete('non-existent')).resolves.not.toThrow();
    });

    it('should throw error for other deletion failures', async () => {
      const error = new Error('Permission denied');
      mockFs.unlink.mockRejectedValue(error);

      await expect(service.delete('session-123')).rejects.toThrow('Failed to delete session: Permission denied');
    });
  });

  describe('exists', () => {
    it('should return true for existing session', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const exists = await service.exists('session-123');

      expect(exists).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(
        path.join(mockBasePath, 'session-123.json')
      );
    });

    it('should return false for non-existent session', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const exists = await service.exists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('listSessions', () => {
    it('should return all sessions for a project', async () => {
      const sessions = [
        { id: 'session-1', data: createMockProjectData('project-1') },
        { id: 'session-2', data: createMockProjectData('project-1') },
        { id: 'session-3', data: createMockProjectData('project-2') },
      ];

      mockFs.readdir.mockResolvedValue(['session-1.json', 'session-2.json', 'session-3.json', 'not-json.txt'] as any);

      sessions.forEach(session => {
        mockFs.readFile.mockResolvedValueOnce(JSON.stringify(session.data));
      });

      const result = await service.listSessions('project-1');

      expect(result).toEqual(['session-1', 'session-2']);
    });

    it('should return empty array when no sessions exist', async () => {
      mockFs.readdir.mockResolvedValue([] as any);

      const result = await service.listSessions('project-1');

      expect(result).toEqual([]);
    });

    it('should handle corrupted session files gracefully', async () => {
      mockFs.readdir.mockResolvedValue(['session-1.json', 'corrupted.json'] as any);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(createMockProjectData('project-1')))
        .mockResolvedValueOnce('invalid json');

      const result = await service.listSessions('project-1');

      expect(result).toEqual(['session-1']);
    });

    it('should handle directory read errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      await expect(service.listSessions('project-1')).rejects.toThrow('Failed to list sessions: Permission denied');
    });
  });

  describe('cleanup', () => {
    it('should delete sessions older than maxAge', async () => {
      const now = Date.now();
      const oldDate = new Date(now - 3600000); // 1 hour ago
      const newDate = new Date(now - 1000); // 1 second ago

      mockFs.readdir.mockResolvedValue(['old-session.json', 'new-session.json'] as any);
      mockFs.stat
        .mockResolvedValueOnce({ mtime: oldDate } as any)
        .mockResolvedValueOnce({ mtime: newDate } as any);
      mockFs.unlink.mockResolvedValue(undefined);

      const deletedCount = await service.cleanup(1800000); // 30 minutes

      expect(deletedCount).toBe(1);
      expect(mockFs.unlink).toHaveBeenCalledTimes(1);
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockBasePath, 'old-session.json')
      );
    });

    it('should handle empty directory', async () => {
      mockFs.readdir.mockResolvedValue([] as any);

      const deletedCount = await service.cleanup(3600000);

      expect(deletedCount).toBe(0);
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it('should continue cleanup even if some deletions fail', async () => {
      const oldDate = new Date(Date.now() - 3600000);

      mockFs.readdir.mockResolvedValue(['session-1.json', 'session-2.json'] as any);
      mockFs.stat.mockResolvedValue({ mtime: oldDate } as any);
      mockFs.unlink
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(undefined);

      const deletedCount = await service.cleanup(1800000);

      expect(deletedCount).toBe(1);
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should skip non-JSON files', async () => {
      const oldDate = new Date(Date.now() - 3600000);

      mockFs.readdir.mockResolvedValue(['session.json', 'readme.txt', '.gitignore'] as any);
      mockFs.stat.mockResolvedValue({ mtime: oldDate } as any);
      mockFs.unlink.mockResolvedValue(undefined);

      const deletedCount = await service.cleanup(1800000);

      expect(deletedCount).toBe(1);
      expect(mockFs.stat).toHaveBeenCalledTimes(1);
      expect(mockFs.unlink).toHaveBeenCalledTimes(1);
    });

    it('should handle stat errors gracefully', async () => {
      mockFs.readdir.mockResolvedValue(['session-1.json', 'session-2.json'] as any);
      mockFs.stat
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce({ mtime: new Date(Date.now() - 3600000) } as any);
      mockFs.unlink.mockResolvedValue(undefined);

      const deletedCount = await service.cleanup(1800000);

      expect(deletedCount).toBe(1);
      expect(mockFs.unlink).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle extremely long session IDs', async () => {
      const longId = 'a'.repeat(1000);
      await expect(service.get(longId)).rejects.toThrow('Invalid session ID');
    });

    it('should handle special characters in session IDs', async () => {
      const specialChars = ['!@#$%^&*()', 'session..id', 'session\\id', 'session|id'];

      for (const id of specialChars) {
        await expect(service.get(id)).rejects.toThrow('Invalid session ID');
      }
    });

    it('should handle large ProjectData objects', async () => {
      const largeData = createMockProjectData();
      // Add a large array to test memory handling
      largeData.errors = Array(10000).fill(null).map((_, i) => ({
        code: `ERROR_${i}`,
        message: `Error message ${i}`,
        timestamp: new Date(),
        phase: 'input' as ProjectStatus
      }));

      mockFs.writeFile.mockResolvedValue(undefined);

      await expect(service.create('large-project', largeData)).resolves.toBeDefined();
    });

    it('should handle rapid sequential operations', async () => {
      const projectData = createMockProjectData();
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(projectData));

      const operations = Array(10).fill(null).map((_, i) =>
        service.create(`project-${i}`, projectData)
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(10);
    });

    it('should recover from temporary file system errors', async () => {
      const projectData = createMockProjectData();
      let attempts = 0;

      mockFs.writeFile.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject({ code: 'EAGAIN' });
        }
        return Promise.resolve();
      });

      await service.create('retry-project', projectData);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
    });
  });
});