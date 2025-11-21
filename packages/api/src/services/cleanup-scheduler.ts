import cron from 'node-cron';
import { IKirbyDeploymentService, KirbyCleanupResult } from '@kirby-gen/shared';
import { logger } from '../config/logger';

export class CleanupScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(private kirbyDeployment: IKirbyDeploymentService) {}

  start(): void {
    // Run cleanup every day at 2 AM
    this.task = cron.schedule('0 2 * * *', async () => {
      logger.info('Running scheduled demo cleanup...');

      try {
        const result = await this.kirbyDeployment.cleanupOldDemos();

        logger.info('Cleanup completed', {
          archived: result.archived.length,
          emailsSent: result.emailsSent.length
        });
      } catch (error) {
        logger.error('Cleanup failed', { error });
      }
    });

    logger.info('Cleanup scheduler started (runs daily at 2 AM)');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Cleanup scheduler stopped');
    }
  }

  async runNow(): Promise<KirbyCleanupResult> {
    logger.info('Running manual cleanup...');
    const result = await this.kirbyDeployment.cleanupOldDemos();
    logger.info('Manual cleanup completed', result);
    return result;
  }
}
