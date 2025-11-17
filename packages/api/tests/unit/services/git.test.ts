import { LocalGitService } from '../../../src/services/local/git.service';
import { GitStatus, GitCommit } from '../../../../shared/src/interfaces/git.interface';
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock simple-git
jest.mock('simple-git');
jest.mock('fs/promises');

describe('LocalGitService', () => {
  let gitService: LocalGitService;
  let mockGit: jest.Mocked<SimpleGit>;
  let tempBasePath: string;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock git instance
    mockGit = {
      init: jest.fn().mockReturnThis(),
      add: jest.fn().mockReturnThis(),
      commit: jest.fn().mockResolvedValue({ commit: 'abc123' }),
      push: jest.fn().mockReturnThis(),
      status: jest.fn().mockResolvedValue({
        current: 'main',
        ahead: 0,
        behind: 0,
        files: [],
        staged: [],
        renamed: [],
        deleted: [],
        modified: [],
        created: [],
        not_added: [],
        conflicted: [],
        tracking: 'origin/main'
      }),
      log: jest.fn().mockResolvedValue({
        all: [],
        latest: null,
        total: 0
      }),
      addConfig: jest.fn().mockReturnThis(),
      checkIsRepo: jest.fn().mockResolvedValue(true),
      branch: jest.fn().mockReturnThis(),
    } as any;

    (simpleGit as jest.Mock).mockReturnValue(mockGit);

    // Mock fs operations
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.rm as jest.Mock).mockResolvedValue(undefined);
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    // Set test environment
    tempBasePath = path.join(os.tmpdir(), 'kirby-gen-test');
    process.env = { ...originalEnv, GIT_BASE_PATH: tempBasePath };

    gitService = new LocalGitService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use GIT_BASE_PATH from environment', () => {
      expect(gitService['basePath']).toBe(tempBasePath);
    });

    it('should use default path when GIT_BASE_PATH is not set', () => {
      delete process.env.GIT_BASE_PATH;
      const service = new LocalGitService();
      expect(service['basePath']).toContain('kirby-gen-repos');
    });
  });

  describe('createRepo', () => {
    const projectId = 'test-project-123';

    it('should create a new repository with initial commit', async () => {
      const repoPath = path.join(tempBasePath, projectId);
      const result = await gitService.createRepo(projectId, true);

      expect(result).toBe(repoPath);
      expect(fs.mkdir).toHaveBeenCalledWith(repoPath, { recursive: true });
      expect(simpleGit).toHaveBeenCalledWith(repoPath);
      expect(mockGit.init).toHaveBeenCalled();
      expect(mockGit.addConfig).toHaveBeenCalledWith('user.email', 'kirby-gen@local');
      expect(mockGit.addConfig).toHaveBeenCalledWith('user.name', 'Kirby Gen');
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(repoPath, 'README.md'),
        expect.stringContaining(projectId)
      );
      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith('Initial commit');
    });

    it('should create a new repository without initial commit', async () => {
      const repoPath = path.join(tempBasePath, projectId);
      const result = await gitService.createRepo(projectId, false);

      expect(result).toBe(repoPath);
      expect(fs.mkdir).toHaveBeenCalledWith(repoPath, { recursive: true });
      expect(simpleGit).toHaveBeenCalledWith(repoPath);
      expect(mockGit.init).toHaveBeenCalled();
      expect(mockGit.addConfig).toHaveBeenCalledWith('user.email', 'kirby-gen@local');
      expect(mockGit.addConfig).toHaveBeenCalledWith('user.name', 'Kirby Gen');
      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(mockGit.add).not.toHaveBeenCalled();
      expect(mockGit.commit).not.toHaveBeenCalled();
    });

    it('should create a new repository with initial commit by default', async () => {
      const repoPath = path.join(tempBasePath, projectId);
      const result = await gitService.createRepo(projectId);

      expect(result).toBe(repoPath);
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockGit.commit).toHaveBeenCalledWith('Initial commit');
    });

    it('should throw error when repository creation fails', async () => {
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(gitService.createRepo(projectId)).rejects.toThrow('Failed to create repository');
    });

    it('should handle invalid project ID', async () => {
      await expect(gitService.createRepo('')).rejects.toThrow('Project ID is required');
    });

    it('should sanitize project ID to prevent path traversal', async () => {
      const maliciousId = '../../../etc/passwd';
      const sanitizedPath = path.join(tempBasePath, 'etc-passwd');

      const result = await gitService.createRepo(maliciousId);

      expect(result).toBe(sanitizedPath);
      expect(fs.mkdir).toHaveBeenCalledWith(sanitizedPath, { recursive: true });
    });
  });

  describe('commit', () => {
    const projectId = 'test-project-123';
    const message = 'Test commit message';
    const files = ['file1.txt', 'src/file2.js'];

    beforeEach(() => {
      mockGit.commit.mockResolvedValue({
        commit: 'sha123456',
        author: null,
        branch: 'main',
        root: false,
        summary: { changes: 2, insertions: 10, deletions: 5 }
      } as any);
    });

    it('should commit specified files with message', async () => {
      const repoPath = path.join(tempBasePath, projectId);
      const result = await gitService.commit(projectId, message, files);

      expect(result).toBe('sha123456');
      expect(simpleGit).toHaveBeenCalledWith(repoPath);
      expect(mockGit.add).toHaveBeenCalledWith(files);
      expect(mockGit.commit).toHaveBeenCalledWith(message);
    });

    it('should throw error when repository does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(gitService.commit(projectId, message, files))
        .rejects.toThrow('Repository not found');
    });

    it('should throw error when commit message is empty', async () => {
      await expect(gitService.commit(projectId, '', files))
        .rejects.toThrow('Commit message is required');
    });

    it('should throw error when files array is empty', async () => {
      await expect(gitService.commit(projectId, message, []))
        .rejects.toThrow('At least one file is required');
    });

    it('should handle commit failure', async () => {
      mockGit.commit.mockRejectedValue(new Error('Nothing to commit'));

      await expect(gitService.commit(projectId, message, files))
        .rejects.toThrow('Failed to commit');
    });

    it('should handle files with special characters', async () => {
      const specialFiles = ['file with spaces.txt', 'file(with)parens.js'];

      const result = await gitService.commit(projectId, message, specialFiles);

      expect(result).toBe('sha123456');
      expect(mockGit.add).toHaveBeenCalledWith(specialFiles);
    });
  });

  describe('push', () => {
    const projectId = 'test-project-123';

    it('should validate repository exists and has commits', async () => {
      const repoPath = path.join(tempBasePath, projectId);
      mockGit.log.mockResolvedValue({
        all: [{ hash: 'abc123' }],
        latest: { hash: 'abc123' },
        total: 1
      } as any);

      await gitService.push(projectId);

      expect(simpleGit).toHaveBeenCalledWith(repoPath);
      expect(mockGit.log).toHaveBeenCalled();
    });

    it('should use default remote and branch', async () => {
      mockGit.log.mockResolvedValue({
        all: [{ hash: 'abc123' }],
        latest: { hash: 'abc123' },
        total: 1
      } as any);

      await gitService.push(projectId);

      expect(mockGit.log).toHaveBeenCalled();
    });

    it('should use custom remote and branch', async () => {
      mockGit.log.mockResolvedValue({
        all: [{ hash: 'abc123' }],
        latest: { hash: 'abc123' },
        total: 1
      } as any);

      await gitService.push(projectId, 'upstream', 'develop');

      expect(mockGit.log).toHaveBeenCalled();
    });

    it('should throw error when repository does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(gitService.push(projectId))
        .rejects.toThrow('Repository not found');
    });

    it('should throw error when no commits exist', async () => {
      mockGit.log.mockResolvedValue({
        all: [],
        latest: null,
        total: 0
      } as any);

      await expect(gitService.push(projectId))
        .rejects.toThrow('No commits to push');
    });
  });

  describe('getStatus', () => {
    const projectId = 'test-project-123';

    it('should return repository status', async () => {
      const repoPath = path.join(tempBasePath, projectId);
      mockGit.status.mockResolvedValue({
        current: 'main',
        ahead: 2,
        behind: 1,
        files: [
          { path: 'staged.txt', index: 'A', working_dir: ' ' },
          { path: 'modified.txt', index: ' ', working_dir: 'M' },
          { path: 'untracked.txt', index: '?', working_dir: '?' }
        ],
        staged: ['staged.txt'],
        renamed: [],
        deleted: [],
        modified: ['modified.txt'],
        created: [],
        not_added: ['untracked.txt'],
        conflicted: [],
        tracking: 'origin/main'
      } as any);

      const result = await gitService.getStatus(projectId);

      expect(result).toEqual<GitStatus>({
        branch: 'main',
        ahead: 2,
        behind: 1,
        staged: ['staged.txt'],
        unstaged: ['modified.txt'],
        untracked: ['untracked.txt']
      });
      expect(simpleGit).toHaveBeenCalledWith(repoPath);
      expect(mockGit.status).toHaveBeenCalled();
    });

    it('should handle repository without tracking branch', async () => {
      mockGit.status.mockResolvedValue({
        current: 'feature',
        ahead: 0,
        behind: 0,
        files: [],
        staged: [],
        renamed: [],
        deleted: [],
        modified: [],
        created: [],
        not_added: [],
        conflicted: [],
        tracking: null
      } as any);

      const result = await gitService.getStatus(projectId);

      expect(result).toEqual<GitStatus>({
        branch: 'feature',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        untracked: []
      });
    });

    it('should throw error when repository does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(gitService.getStatus(projectId))
        .rejects.toThrow('Repository not found');
    });

    it('should handle status check failure', async () => {
      mockGit.status.mockRejectedValue(new Error('Not a git repository'));

      await expect(gitService.getStatus(projectId))
        .rejects.toThrow('Failed to get status');
    });
  });

  describe('getHistory', () => {
    const projectId = 'test-project-123';

    it('should return commit history with default limit', async () => {
      const repoPath = path.join(tempBasePath, projectId);
      const mockCommits = [
        {
          hash: 'abc123',
          message: 'Latest commit',
          author_name: 'John Doe',
          author_email: 'john@example.com',
          date: '2024-01-20 10:00:00'
        },
        {
          hash: 'def456',
          message: 'Previous commit',
          author_name: 'Jane Smith',
          author_email: 'jane@example.com',
          date: '2024-01-19 15:30:00'
        }
      ];

      mockGit.log.mockResolvedValue({
        all: mockCommits,
        latest: mockCommits[0],
        total: 2
      } as any);

      const result = await gitService.getHistory(projectId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual<GitCommit>({
        sha: 'abc123',
        message: 'Latest commit',
        author: 'John Doe',
        email: 'john@example.com',
        date: new Date('2024-01-20 10:00:00')
      });
      expect(simpleGit).toHaveBeenCalledWith(repoPath);
      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 10 });
    });

    it('should return commit history with custom limit', async () => {
      mockGit.log.mockResolvedValue({
        all: [],
        latest: null,
        total: 0
      } as any);

      const result = await gitService.getHistory(projectId, 5);

      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 5 });
      expect(result).toEqual([]);
    });

    it('should handle empty repository', async () => {
      mockGit.log.mockResolvedValue({
        all: [],
        latest: null,
        total: 0
      } as any);

      const result = await gitService.getHistory(projectId);

      expect(result).toEqual([]);
    });

    it('should throw error when repository does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(gitService.getHistory(projectId))
        .rejects.toThrow('Repository not found');
    });

    it('should handle history retrieval failure', async () => {
      mockGit.log.mockRejectedValue(new Error('Not a git repository'));

      await expect(gitService.getHistory(projectId))
        .rejects.toThrow('Failed to get history');
    });

    it('should handle commits with multiline messages', async () => {
      const mockCommits = [
        {
          hash: 'abc123',
          message: 'Feature: Add new functionality\n\nThis is a detailed description\nwith multiple lines',
          author_name: 'Developer',
          author_email: 'dev@example.com',
          date: '2024-01-20 10:00:00'
        }
      ];

      mockGit.log.mockResolvedValue({
        all: mockCommits,
        latest: mockCommits[0],
        total: 1
      } as any);

      const result = await gitService.getHistory(projectId);

      expect(result[0].message).toBe('Feature: Add new functionality\n\nThis is a detailed description\nwith multiple lines');
    });
  });

  describe('deleteRepo', () => {
    const projectId = 'test-project-123';

    it('should delete repository directory', async () => {
      const repoPath = path.join(tempBasePath, projectId);
      await gitService.deleteRepo(projectId);

      expect(fs.rm).toHaveBeenCalledWith(repoPath, { recursive: true, force: true });
    });

    it('should not throw error when repository does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(gitService.deleteRepo(projectId)).resolves.toBeUndefined();
      expect(fs.rm).not.toHaveBeenCalled();
    });

    it('should handle deletion failure', async () => {
      (fs.rm as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(gitService.deleteRepo(projectId))
        .rejects.toThrow('Failed to delete repository');
    });

    it('should handle empty project ID', async () => {
      await expect(gitService.deleteRepo('')).rejects.toThrow('Project ID is required');
    });
  });

  describe('edge cases', () => {
    it('should handle project IDs with special characters', async () => {
      const specialId = 'project@#$%^&*()';
      const sanitizedId = 'project'; // Special chars are replaced with - and trailing dashes are removed
      const expectedPath = path.join(tempBasePath, sanitizedId);

      const result = await gitService.createRepo(specialId);

      expect(result).toBe(expectedPath);
      expect(fs.mkdir).toHaveBeenCalledWith(expectedPath, { recursive: true });
    });

    it('should handle very long project IDs', async () => {
      const longId = 'a'.repeat(300);
      const truncatedId = 'a'.repeat(255); // Max filename length
      const expectedPath = path.join(tempBasePath, truncatedId);

      const result = await gitService.createRepo(longId);

      expect(result).toBe(expectedPath);
    });

    it('should handle concurrent operations on same repository', async () => {
      const projectId = 'concurrent-test';

      // Simulate concurrent operations
      const operations = [
        gitService.getStatus(projectId),
        gitService.getHistory(projectId),
        gitService.getStatus(projectId)
      ];

      await Promise.all(operations);

      expect(simpleGit).toHaveBeenCalledTimes(3);
    });

    it('should handle repository with no remote configured', async () => {
      const projectId = 'no-remote';

      mockGit.status.mockResolvedValue({
        current: 'main',
        ahead: 0,
        behind: 0,
        files: [],
        staged: [],
        renamed: [],
        deleted: [],
        modified: [],
        created: [],
        not_added: [],
        conflicted: [],
        tracking: null
      } as any);

      const status = await gitService.getStatus(projectId);

      expect(status.ahead).toBe(0);
      expect(status.behind).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages', async () => {
      const projectId = 'error-test';

      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      try {
        await gitService.commit(projectId, 'test', ['file.txt']);
      } catch (error: any) {
        expect(error.message).toContain('Repository not found');
        expect(error.message).toContain(projectId);
      }
    });

    it('should handle network errors gracefully', async () => {
      const projectId = 'network-test';

      mockGit.log.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(gitService.getHistory(projectId))
        .rejects.toThrow('Failed to get history');
    });

    it('should handle corrupted repository', async () => {
      const projectId = 'corrupted-repo';

      mockGit.status.mockRejectedValue(new Error('fatal: not a git repository'));

      await expect(gitService.getStatus(projectId))
        .rejects.toThrow('Failed to get status');
    });
  });
});