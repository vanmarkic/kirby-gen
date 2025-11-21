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
  });
});
