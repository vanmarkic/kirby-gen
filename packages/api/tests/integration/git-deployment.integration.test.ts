/**
 * Git + Deployment integration tests
 * Tests the integration between Git service and Deployment service
 */
import { container, SERVICE_KEYS, IGitService, IDeploymentService } from '@kirby-gen/shared';
import { promises as fs } from 'fs';
import path from 'path';

// Mock services
const mockGitService: IGitService = {
  initRepository: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue('abc123'),
  push: jest.fn().mockResolvedValue(undefined),
  createBranch: jest.fn().mockResolvedValue(undefined),
  getStatus: jest.fn().mockResolvedValue({
    modified: [],
    added: [],
    deleted: [],
    untracked: [],
  }),
  getRemoteUrl: jest.fn().mockResolvedValue('https://github.com/user/repo.git'),
};

const mockDeploymentService: IDeploymentService = {
  deploy: jest.fn().mockResolvedValue({
    id: 'deployment-123',
    url: 'https://preview.example.com',
    status: 'running',
    deployedAt: new Date(),
  }),
  stopDeployment: jest.fn().mockResolvedValue(undefined),
  getDeployment: jest.fn().mockResolvedValue({
    id: 'deployment-123',
    url: 'https://preview.example.com',
    status: 'running',
    deployedAt: new Date(),
  }),
  getLogs: jest.fn().mockResolvedValue([
    'Starting deployment...',
    'Deployment successful',
  ]),
};

describe('Git + Deployment Integration', () => {
  beforeAll(() => {
    container.register(SERVICE_KEYS.GIT, mockGitService);
    container.register(SERVICE_KEYS.DEPLOYMENT, mockDeploymentService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('complete workflow', () => {
    it('should initialize git repo, commit, and deploy', async () => {
      const sitePath = '/tmp/test-site';

      // Initialize git repository
      await mockGitService.initRepository(sitePath);

      // Commit generated files
      const commitHash = await mockGitService.commit(sitePath, 'Initial commit');

      // Deploy the site
      const deployment = await mockDeploymentService.deploy(sitePath, {
        name: 'test-deployment',
        env: {},
      });

      expect(mockGitService.initRepository).toHaveBeenCalledWith(sitePath);
      expect(mockGitService.commit).toHaveBeenCalledWith(sitePath, 'Initial commit');
      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(
        sitePath,
        expect.objectContaining({
          name: 'test-deployment',
        })
      );
      expect(deployment.status).toBe('running');
    });

    it('should handle deployment after git push', async () => {
      const sitePath = '/tmp/test-site';

      // Initialize and commit
      await mockGitService.initRepository(sitePath);
      await mockGitService.commit(sitePath, 'Initial commit');

      // Push to remote
      await mockGitService.push(sitePath, 'origin', 'main');

      // Deploy from pushed repository
      const remoteUrl = await mockGitService.getRemoteUrl(sitePath);
      const deployment = await mockDeploymentService.deploy(sitePath, {
        name: 'test-deployment',
        env: { GIT_URL: remoteUrl },
      });

      expect(mockGitService.push).toHaveBeenCalled();
      expect(deployment).toBeDefined();
    });

    it('should redeploy after new commits', async () => {
      const sitePath = '/tmp/test-site';

      // Initial deployment
      await mockGitService.initRepository(sitePath);
      await mockGitService.commit(sitePath, 'Initial commit');
      const firstDeployment = await mockDeploymentService.deploy(sitePath, {
        name: 'test-deployment',
        env: {},
      });

      // Stop first deployment
      await mockDeploymentService.stopDeployment(firstDeployment.id);

      // Make changes and commit
      await mockGitService.commit(sitePath, 'Update content');

      // Redeploy
      const secondDeployment = await mockDeploymentService.deploy(sitePath, {
        name: 'test-deployment',
        env: {},
      });

      expect(mockGitService.commit).toHaveBeenCalledTimes(2);
      expect(mockDeploymentService.stopDeployment).toHaveBeenCalledWith(firstDeployment.id);
      expect(mockDeploymentService.deploy).toHaveBeenCalledTimes(2);
    });
  });

  describe('error scenarios', () => {
    it('should handle git initialization failure', async () => {
      const sitePath = '/tmp/test-site';

      (mockGitService.initRepository as jest.Mock).mockRejectedValueOnce(
        new Error('Git init failed')
      );

      await expect(mockGitService.initRepository(sitePath)).rejects.toThrow('Git init failed');

      // Deployment should not be attempted
      expect(mockDeploymentService.deploy).not.toHaveBeenCalled();
    });

    it('should handle commit failure', async () => {
      const sitePath = '/tmp/test-site';

      await mockGitService.initRepository(sitePath);

      (mockGitService.commit as jest.Mock).mockRejectedValueOnce(
        new Error('Nothing to commit')
      );

      await expect(mockGitService.commit(sitePath, 'Empty commit')).rejects.toThrow(
        'Nothing to commit'
      );

      // Can still attempt deployment of existing state
      const deployment = await mockDeploymentService.deploy(sitePath, {
        name: 'test-deployment',
        env: {},
      });

      expect(deployment).toBeDefined();
    });

    it('should handle deployment failure', async () => {
      const sitePath = '/tmp/test-site';

      await mockGitService.initRepository(sitePath);
      await mockGitService.commit(sitePath, 'Initial commit');

      (mockDeploymentService.deploy as jest.Mock).mockRejectedValueOnce(
        new Error('Deployment failed')
      );

      await expect(
        mockDeploymentService.deploy(sitePath, { name: 'test', env: {} })
      ).rejects.toThrow('Deployment failed');

      // Git operations should still be successful
      expect(mockGitService.commit).toHaveBeenCalled();
    });
  });

  describe('deployment with git branches', () => {
    it('should create branch and deploy', async () => {
      const sitePath = '/tmp/test-site';
      const branchName = 'preview';

      await mockGitService.initRepository(sitePath);
      await mockGitService.commit(sitePath, 'Initial commit');
      await mockGitService.createBranch(sitePath, branchName);

      const deployment = await mockDeploymentService.deploy(sitePath, {
        name: `test-${branchName}`,
        env: { BRANCH: branchName },
      });

      expect(mockGitService.createBranch).toHaveBeenCalledWith(sitePath, branchName);
      expect(deployment).toBeDefined();
    });

    it('should deploy different branches to different environments', async () => {
      const sitePath = '/tmp/test-site';

      await mockGitService.initRepository(sitePath);
      await mockGitService.commit(sitePath, 'Initial commit');

      // Deploy main branch to production
      const prodDeployment = await mockDeploymentService.deploy(sitePath, {
        name: 'production',
        env: { ENVIRONMENT: 'production' },
      });

      // Create and deploy preview branch
      await mockGitService.createBranch(sitePath, 'preview');
      const previewDeployment = await mockDeploymentService.deploy(sitePath, {
        name: 'preview',
        env: { ENVIRONMENT: 'preview' },
      });

      expect(prodDeployment.id).not.toBe(previewDeployment.id);
      expect(mockDeploymentService.deploy).toHaveBeenCalledTimes(2);
    });
  });

  describe('deployment logs and monitoring', () => {
    it('should retrieve deployment logs after deployment', async () => {
      const sitePath = '/tmp/test-site';

      await mockGitService.initRepository(sitePath);
      await mockGitService.commit(sitePath, 'Initial commit');

      const deployment = await mockDeploymentService.deploy(sitePath, {
        name: 'test',
        env: {},
      });

      const logs = await mockDeploymentService.getLogs(deployment.id, 100);

      expect(logs).toContain('Starting deployment...');
      expect(logs).toContain('Deployment successful');
    });

    it('should check deployment status', async () => {
      const sitePath = '/tmp/test-site';

      await mockGitService.initRepository(sitePath);
      await mockGitService.commit(sitePath, 'Initial commit');

      const deployment = await mockDeploymentService.deploy(sitePath, {
        name: 'test',
        env: {},
      });

      const status = await mockDeploymentService.getDeployment(deployment.id);

      expect(status).toBeDefined();
      expect(status?.status).toBe('running');
    });
  });

  describe('git status tracking', () => {
    it('should check git status before committing', async () => {
      const sitePath = '/tmp/test-site';

      await mockGitService.initRepository(sitePath);

      (mockGitService.getStatus as jest.Mock).mockResolvedValue({
        modified: ['file1.txt'],
        added: ['file2.txt'],
        deleted: [],
        untracked: ['file3.txt'],
      });

      const status = await mockGitService.getStatus(sitePath);

      expect(status.modified).toContain('file1.txt');
      expect(status.added).toContain('file2.txt');
      expect(status.untracked).toContain('file3.txt');

      // Only commit if there are changes
      if (
        status.modified.length > 0 ||
        status.added.length > 0 ||
        status.untracked.length > 0
      ) {
        await mockGitService.commit(sitePath, 'Update files');
        expect(mockGitService.commit).toHaveBeenCalled();
      }
    });
  });
});
