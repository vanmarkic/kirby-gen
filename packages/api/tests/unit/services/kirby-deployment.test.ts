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
});
