import { CleanupScheduler } from '../../../src/services/cleanup-scheduler';
import { IKirbyDeploymentService } from '@kirby-gen/shared';

describe('CleanupScheduler', () => {
  let scheduler: CleanupScheduler;
  let mockKirbyDeployment: jest.Mocked<IKirbyDeploymentService>;

  beforeEach(() => {
    mockKirbyDeployment = {
      deploy: jest.fn(),
      getDeployment: jest.fn(),
      archive: jest.fn(),
      cleanupOldDemos: jest.fn().mockResolvedValue({
        archived: ['test-1'],
        quotaReached: false,
        emailsSent: ['test-1']
      })
    };

    scheduler = new CleanupScheduler(mockKirbyDeployment);
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('start', () => {
    it('should create cron task', () => {
      scheduler.start();
      expect((scheduler as any).task).toBeDefined();
    });
  });

  describe('runNow', () => {
    it('should trigger cleanup immediately', async () => {
      const result = await scheduler.runNow();

      expect(mockKirbyDeployment.cleanupOldDemos).toHaveBeenCalled();
      expect(result.archived).toContain('test-1');
    });
  });

  describe('stop', () => {
    it('should stop cron task', () => {
      scheduler.start();
      scheduler.stop();
      expect((scheduler as any).task).toBeNull();
    });
  });
});
