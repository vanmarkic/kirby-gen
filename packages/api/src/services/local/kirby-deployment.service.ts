import path from 'path';
import fs from 'fs-extra';
import { logger } from '../../config/logger';
import {
  IKirbyDeploymentService,
  KirbyDeploymentResult,
  KirbyDeploymentInfo,
  KirbyCleanupResult,
  IStorageService,
  IEmailService
} from '@kirby-gen/shared';

interface KirbyDeploymentConfig {
  demosDir?: string;
  basePort?: number;
  ttlDays?: number;
  maxDemos?: number;
}

export class KirbyDeploymentService implements IKirbyDeploymentService {
  private readonly demosDir: string;
  private readonly basePort: number;
  private readonly ttlDays: number;
  private readonly maxDemos: number;
  private deployments: Map<string, KirbyDeploymentInfo> = new Map();

  constructor(
    private storage: IStorageService,
    private email: IEmailService,
    config: KirbyDeploymentConfig = {}
  ) {
    this.demosDir = config.demosDir || path.join(process.cwd(), 'kirby-demos');
    this.basePort = config.basePort || 8080;
    this.ttlDays = config.ttlDays || 7;
    this.maxDemos = config.maxDemos || 10;

    fs.ensureDirSync(this.demosDir);
    this.loadDeployments();
  }

  async deploy(projectId: string): Promise<KirbyDeploymentResult> {
    logger.info(`Deploying Kirby demo for project: ${projectId}`);

    // Create demo directory
    const demoPath = path.join(this.demosDir, `demo-${projectId}`);
    await fs.ensureDir(demoPath);

    // Download Kirby (stub for now)
    await this.downloadKirby(demoPath);

    // Copy blueprints
    await this.copyBlueprints(projectId, demoPath);

    // Start PHP server (stub for now)
    const port = await this.startPHPServer(projectId, demoPath);

    // Save deployment metadata
    const deployedAt = new Date();
    const deployment: KirbyDeploymentInfo = {
      projectId,
      url: `http://localhost:${port}/demo-${projectId}`,
      port,
      deployedAt,
      expiresAt: new Date(deployedAt.getTime() + this.ttlDays * 24 * 60 * 60 * 1000),
      isActive: true
    };

    await this.saveDeploymentMetadata(demoPath, deployment);
    this.deployments.set(projectId, deployment);

    logger.info(`Demo deployed: ${deployment.url}`);

    return {
      projectId,
      url: deployment.url,
      port,
      deployedAt,
      panelUrl: `${deployment.url}/panel`
    };
  }

  private async downloadKirby(demoPath: string): Promise<void> {
    // Stub - will implement in next task
    logger.info('Downloading Kirby (stub)');
  }

  private async startPHPServer(projectId: string, demoPath: string): Promise<number> {
    // Stub - will implement in next task
    return this.basePort;
  }

  private async copyBlueprints(projectId: string, demoPath: string): Promise<void> {
    logger.info(`Copying blueprints for project: ${projectId}`);

    const blueprintsDir = path.join(demoPath, 'site', 'blueprints', 'pages');
    await fs.ensureDir(blueprintsDir);

    // Get all files and filter for blueprints
    const allFiles = await this.storage.listFiles(projectId);
    const blueprintFiles = allFiles.filter(file => file.startsWith('blueprints/'));

    for (const file of blueprintFiles) {
      const content = await this.storage.downloadFile(projectId, file);
      // Extract just the filename (remove 'blueprints/' prefix)
      const filename = path.basename(file);
      await fs.writeFile(path.join(blueprintsDir, filename), content);
      logger.info(`  Copied blueprint: ${filename}`);
    }
  }

  private async saveDeploymentMetadata(demoPath: string, info: KirbyDeploymentInfo): Promise<void> {
    const metadataPath = path.join(demoPath, '.deployed-at.json');
    await fs.writeJson(metadataPath, info, { spaces: 2 });
  }

  private loadDeployments(): void {
    // Stub - will implement later
  }

  async getDeployment(projectId: string): Promise<KirbyDeploymentInfo | null> {
    return this.deployments.get(projectId) || null;
  }

  async archive(projectId: string): Promise<void> {
    logger.info(`Archiving demo: ${projectId}`);

    const demoPath = path.join(this.demosDir, `demo-${projectId}`);

    if (!await fs.pathExists(demoPath)) {
      logger.warn(`Demo path not found: ${demoPath}`);
      return;
    }

    // Stop PHP server
    const deployment = this.deployments.get(projectId);
    if (deployment) {
      await this.stopPHPServer(deployment.port);
    }

    // Remove demo directory
    await fs.remove(demoPath);

    // Update metadata
    if (deployment) {
      deployment.isActive = false;
      this.deployments.set(projectId, deployment);
    }

    logger.info(`Demo archived: ${projectId}`);
  }

  private async stopPHPServer(port: number): Promise<void> {
    // Stub - in real implementation, would kill process
    logger.info(`Stopped PHP server on port ${port} (stub)`);
  }

  async cleanupOldDemos(): Promise<KirbyCleanupResult> {
    // Stub - will implement in next task
    return {
      archived: [],
      quotaReached: false,
      emailsSent: []
    };
  }
}
