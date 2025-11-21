import { KirbyDeploymentService } from '../../../src/services/local/kirby-deployment.service';
import { IStorageService, IEmailService } from '@kirby-gen/shared';
import path from 'path';
import fs from 'fs-extra';

describe('KirbyDeploymentService', () => {
  let service: KirbyDeploymentService;
  let mockStorage: jest.Mocked<IStorageService>;
  let mockEmail: jest.Mocked<IEmailService>;
  let testDemosDir: string;

  beforeEach(() => {
    testDemosDir = path.join(__dirname, '../../tmp/test-kirby-demos');

    mockStorage = {
      listFiles: jest.fn(),
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
      deleteProject: jest.fn()
    } as any;

    mockEmail = {
      send: jest.fn()
    };

    service = new KirbyDeploymentService(
      mockStorage,
      mockEmail,
      {
        demosDir: testDemosDir,
        basePort: 9000,
        ttlDays: 7,
        maxDemos: 3
      }
    );
  });

  afterEach(async () => {
    await fs.remove(testDemosDir);
  });

  describe('deploy', () => {
    it('should create demo directory', async () => {
      const projectId = 'test-123';

      mockStorage.listFiles.mockResolvedValue([]);

      // Mock Kirby download (we'll skip actual download in tests)
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

      await service.deploy(projectId);

      const demoPath = path.join(testDemosDir, `demo-${projectId}`);
      const exists = await fs.pathExists(demoPath);

      expect(exists).toBe(true);
    });

    it('should return deployment result with URL and port', async () => {
      const projectId = 'test-456';

      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

      const result = await service.deploy(projectId);

      expect(result.projectId).toBe(projectId);
      expect(result.url).toBe('http://localhost:9000/demo-test-456');
      expect(result.panelUrl).toBe('http://localhost:9000/demo-test-456/panel');
      expect(result.port).toBe(9000);
      expect(result.deployedAt).toBeInstanceOf(Date);
    });

    it('should copy blueprints from storage', async () => {
      const projectId = 'test-blueprints';
      const allFiles = ['blueprints/gig.yml', 'blueprints/artist.yml', 'blueprints/release.yml', 'other-file.txt'];

      mockStorage.listFiles.mockResolvedValue(allFiles);
      mockStorage.downloadFile.mockResolvedValue(Buffer.from('title: Test'));

      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

      await service.deploy(projectId);

      expect(mockStorage.listFiles).toHaveBeenCalledWith(projectId);
      // Should only download blueprint files (3 files, not 4)
      expect(mockStorage.downloadFile).toHaveBeenCalledTimes(3);
      expect(mockStorage.downloadFile).toHaveBeenCalledWith(projectId, 'blueprints/gig.yml');
      expect(mockStorage.downloadFile).toHaveBeenCalledWith(projectId, 'blueprints/artist.yml');
      expect(mockStorage.downloadFile).toHaveBeenCalledWith(projectId, 'blueprints/release.yml');

      // Verify blueprints are written
      const demoPath = path.join(testDemosDir, `demo-${projectId}`);
      const blueprintPath = path.join(demoPath, 'site', 'blueprints', 'pages');

      const files = await fs.readdir(blueprintPath);
      expect(files).toHaveLength(3);
      expect(files).toContain('gig.yml');
      expect(files).toContain('artist.yml');
      expect(files).toContain('release.yml');
    });

    it('should enforce quota when max demos reached', async () => {
      // Deploy maxDemos (3) projects
      for (let i = 0; i < 3; i++) {
        mockStorage.listFiles.mockResolvedValue([]);
        jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
        jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000 + i);

        await service.deploy(`project-${i}`);
      }

      // Deploy 4th project (should trigger quota)
      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9003);
      jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

      await service.deploy('project-4');

      // Should have sent archive notification email
      expect(mockEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Demo Site Will Be Archived'
        })
      );

      // Oldest demo should be archived
      const oldestDeployment = await service.getDeployment('project-0');
      expect(oldestDeployment?.isActive).toBe(false);
    });
  });

  describe('archive', () => {
    it('should mark deployment as inactive', async () => {
      const projectId = 'test-archive';

      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);
      jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

      await service.deploy(projectId);
      await service.archive(projectId);

      const deployment = await service.getDeployment(projectId);
      expect(deployment?.isActive).toBe(false);
    });

    it('should remove demo directory', async () => {
      const projectId = 'test-remove';

      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);
      jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

      await service.deploy(projectId);

      const demoPath = path.join(testDemosDir, `demo-${projectId}`);
      expect(await fs.pathExists(demoPath)).toBe(true);

      await service.archive(projectId);
      expect(await fs.pathExists(demoPath)).toBe(false);
    });
  });

  describe('cleanupOldDemos', () => {
    it('should archive demos older than TTL', async () => {
      jest.useFakeTimers();

      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);
      jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

      await service.deploy('old-project');

      // Fast forward 8 days (past TTL of 7 days)
      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      const result = await service.cleanupOldDemos();

      expect(result.archived).toContain('old-project');
      expect(mockEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Demo Site Archived (TTL Expired)'
        })
      );

      jest.useRealTimers();
    });

    it('should not archive demos within TTL', async () => {
      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

      await service.deploy('new-project');

      const result = await service.cleanupOldDemos();

      expect(result.archived).not.toContain('new-project');
    });
  });

  describe('error handling', () => {
    it('should handle storage failure gracefully when listing files fails', async () => {
      const projectId = 'test-storage-fail';

      // Mock storage to throw error
      mockStorage.listFiles.mockRejectedValue(new Error('Storage unavailable'));
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

      // Should throw the error (not swallow it)
      await expect(service.deploy(projectId)).rejects.toThrow('Storage unavailable');

      // Should not have created demo directory
      const demoPath = path.join(testDemosDir, `demo-${projectId}`);
      const exists = await fs.pathExists(demoPath);
      expect(exists).toBe(false);
    });

    it('should handle concurrent deployments at quota limit', async () => {
      // Deploy maxDemos (3) projects first
      // Add small delays to ensure distinct timestamps
      for (let i = 0; i < 3; i++) {
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 10));
        mockStorage.listFiles.mockResolvedValue([]);
        jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
        jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000 + i);
        await service.deploy(`project-${i}`);
      }

      // Small delay to ensure concurrent deployments have later timestamps
      await new Promise(resolve => setTimeout(resolve, 20));

      // Try to deploy 2 projects concurrently
      // The mutex will make them execute sequentially, but both should succeed
      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9003);
      jest.spyOn(service as any, 'stopPHPServer').mockResolvedValue(undefined);

      const deploy1 = service.deploy('concurrent-1');

      // Small delay to ensure concurrent-2 gets a later timestamp when it actually deploys
      await new Promise(resolve => setTimeout(resolve, 10));

      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9004);
      const deploy2 = service.deploy('concurrent-2');

      await Promise.all([deploy1, deploy2]);

      // Both new deployments should be active
      expect((await service.getDeployment('concurrent-1'))?.isActive).toBe(true);
      expect((await service.getDeployment('concurrent-2'))?.isActive).toBe(true);

      // Should have archived 2 oldest demos (one per deployment)
      expect((await service.getDeployment('project-0'))?.isActive).toBe(false);
      expect((await service.getDeployment('project-1'))?.isActive).toBe(false);
    });

    it('should load existing deployments on service restart', async () => {
      // Deploy a demo
      const projectId = 'test-restart';
      mockStorage.listFiles.mockResolvedValue([]);
      jest.spyOn(service as any, 'downloadKirby').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'startPHPServer').mockResolvedValue(9000);

      await service.deploy(projectId);

      // Create new service instance (simulates restart)
      const newService = new KirbyDeploymentService(
        mockStorage,
        mockEmail,
        {
          demosDir: testDemosDir,
          basePort: 9000,
          ttlDays: 7,
          maxDemos: 3
        }
      );

      // Should have loaded the existing deployment
      const deployment = await newService.getDeployment(projectId);
      expect(deployment).toBeDefined();
      expect(deployment?.projectId).toBe(projectId);
      expect(deployment?.isActive).toBe(true);
    });
  });
});
