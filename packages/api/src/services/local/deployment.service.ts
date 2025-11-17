import * as fs from 'fs/promises';
import * as path from 'path';
import * as child_process from 'child_process';
import { nanoid } from 'nanoid';
import {
  IDeploymentService,
  DeploymentResult,
  DeploymentStatus,
  Deployment
} from '../../../../shared/src/interfaces/deployment.interface';

interface DeploymentMetadata {
  deploymentId: string;
  projectId: string;
  port: number;
  pid: number;
  url: string;
  status: 'deploying' | 'ready' | 'error' | 'stopped';
  buildPath: string;
  createdAt: string;
  readyAt?: string;
  error?: string;
}

export interface LocalDeploymentConfig {
  basePath: string;
  portStart?: number;
  createDirectories?: boolean;
}

export class LocalDeploymentService implements IDeploymentService {
  private basePath: string;
  private basePort: number;
  private maxPort: number;
  private deploymentTimeout: number;

  constructor(config?: LocalDeploymentConfig) {
    this.basePath = config?.basePath || process.env.DEPLOY_BASE_PATH || '/var/lib/kirby-gen/deployments';
    this.basePort = config?.portStart || parseInt(process.env.DEPLOY_BASE_PORT || '8000', 10);
    this.maxPort = this.basePort + 99; // Allow 100 concurrent deployments
    this.deploymentTimeout = parseInt(process.env.DEPLOY_TIMEOUT || '30000', 10);

    if (config?.createDirectories) {
      this.ensureBasePath();
    }
  }

  private async ensureBasePath(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create base deployment path:', error);
    }
  }

  async deploy(projectId: string, buildPath: string): Promise<DeploymentResult> {
    // Validate build path exists
    try {
      await fs.access(buildPath);
    } catch {
      throw new Error(`Build path does not exist: ${buildPath}`);
    }

    // Generate deployment ID
    const deploymentId = nanoid();

    // Find available port
    const port = await this.findAvailablePort();
    if (!port) {
      throw new Error(`No available ports in range ${this.basePort}-${this.maxPort}`);
    }

    // Prepare deployment metadata
    const metadata: DeploymentMetadata = {
      deploymentId,
      projectId,
      port,
      pid: 0,
      url: `http://localhost:${port}`,
      status: 'deploying',
      buildPath,
      createdAt: new Date().toISOString()
    };

    // Save initial metadata
    await this.saveMetadata(deploymentId, metadata);

    try {
      // Start PHP server
      const phpProcess = await this.startPhpServer(buildPath, port);

      // Update metadata with PID
      metadata.pid = phpProcess.pid!;
      metadata.status = 'ready';
      metadata.readyAt = new Date().toISOString();

      await this.saveMetadata(deploymentId, metadata);

      return {
        deploymentId,
        url: metadata.url,
        status: 'ready',
        message: 'Deployment successful'
      };
    } catch (error) {
      // Update metadata with error
      metadata.status = 'error';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';

      await this.saveMetadata(deploymentId, metadata);

      throw error;
    }
  }

  async getStatus(deploymentId: string): Promise<DeploymentStatus> {
    const metadata = await this.loadMetadata(deploymentId);

    // Check if process is still running
    if (metadata.status === 'ready' && metadata.pid) {
      if (!this.isProcessRunning(metadata.pid)) {
        metadata.status = 'stopped';
        await this.saveMetadata(deploymentId, metadata);
      }
    }

    return {
      deploymentId: metadata.deploymentId,
      status: metadata.status,
      url: metadata.url,
      error: metadata.error,
      createdAt: new Date(metadata.createdAt),
      readyAt: metadata.readyAt ? new Date(metadata.readyAt) : undefined
    };
  }

  async rollback(deploymentId: string): Promise<void> {
    // Get deployment metadata
    const metadata = await this.loadMetadata(deploymentId);

    // Stop all current deployments for this project
    const allDeployments = await this.listDeployments(metadata.projectId);
    for (const deployment of allDeployments) {
      if (deployment.status === 'ready' && deployment.deploymentId !== deploymentId) {
        await this.stop(deployment.deploymentId);
      }
    }

    // If the target deployment is stopped, restart it
    if (metadata.status === 'stopped') {
      const phpProcess = await this.startPhpServer(metadata.buildPath, metadata.port);
      metadata.pid = phpProcess.pid!;
      metadata.status = 'ready';
      await this.saveMetadata(deploymentId, metadata);
    }
  }

  async stop(deploymentId: string): Promise<void> {
    const metadata = await this.loadMetadata(deploymentId);

    // Stop the PHP process if running
    if (metadata.pid) {
      try {
        process.kill(metadata.pid, 'SIGTERM');
      } catch (error: any) {
        if (error.code !== 'ESRCH') {
          throw error;
        }
        // Process already stopped
      }
    }

    // Update metadata
    metadata.status = 'stopped';
    await this.saveMetadata(deploymentId, metadata);
  }

  async delete(deploymentId: string): Promise<void> {
    const metadata = await this.loadMetadata(deploymentId);

    // Stop the deployment first
    if (metadata.pid) {
      try {
        process.kill(metadata.pid, 'SIGTERM');
      } catch {
        // Process might already be stopped
      }
    }

    // Delete metadata file
    const metadataPath = path.join(this.basePath, `${deploymentId}.json`);
    await fs.unlink(metadataPath);
  }

  async listDeployments(projectId: string): Promise<Deployment[]> {
    const deployments: Deployment[] = [];

    try {
      const files = await fs.readdir(this.basePath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.basePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const metadata: DeploymentMetadata = JSON.parse(content);

          if (metadata.projectId === projectId) {
            // Check if process is still running
            if (metadata.status === 'ready' && metadata.pid) {
              if (!this.isProcessRunning(metadata.pid)) {
                metadata.status = 'stopped';
              }
            }

            deployments.push({
              deploymentId: metadata.deploymentId,
              projectId: metadata.projectId,
              url: metadata.url,
              status: metadata.status,
              createdAt: new Date(metadata.createdAt),
              readyAt: metadata.readyAt ? new Date(metadata.readyAt) : undefined
            });
          }
        } catch {
          // Skip invalid metadata files
          continue;
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist, return empty array
    }

    // Sort by creation date (newest first)
    return deployments.sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  private async findAvailablePort(): Promise<number | null> {
    const usedPorts = new Set<number>();

    try {
      const files = await fs.readdir(this.basePath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.basePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const metadata: DeploymentMetadata = JSON.parse(content);

          if (metadata.status === 'ready' && metadata.port) {
            usedPorts.add(metadata.port);
          }
        } catch {
          // Skip invalid files
          continue;
        }
      }
    } catch {
      // Directory doesn't exist yet, all ports are available
    }

    // Find first available port
    for (let port = this.basePort; port <= this.maxPort; port++) {
      if (!usedPorts.has(port)) {
        return port;
      }
    }

    return null;
  }

  private async startPhpServer(buildPath: string, port: number): Promise<child_process.ChildProcess> {
    return new Promise((resolve, reject) => {
      const phpProcess = child_process.spawn(
        'php',
        ['-S', `0.0.0.0:${port}`, '-t', buildPath],
        {
          cwd: buildPath,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );

      let serverReady = false;
      let errorOccurred = false;

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!serverReady && !errorOccurred) {
          phpProcess.kill('SIGTERM');
          reject(new Error('Deployment timeout: Server failed to start within 30 seconds'));
        }
      }, this.deploymentTimeout);

      // Handle process errors
      phpProcess.on('error', (error: any) => {
        errorOccurred = true;
        clearTimeout(timeout);

        if (error.code === 'ENOENT' || error.message?.includes('ENOENT')) {
          reject(new Error('PHP is not installed or not in PATH'));
        } else {
          reject(error);
        }
      });

      // Listen to stdout for server ready message
      phpProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();

        if (output.includes('Development Server') || output.includes('started')) {
          serverReady = true;
          clearTimeout(timeout);
          phpProcess.unref();
          resolve(phpProcess);
        }
      });

      // Listen to stderr for errors
      phpProcess.stderr?.on('data', (data: Buffer) => {
        const error = data.toString();

        if (error.includes('Address already in use')) {
          errorOccurred = true;
          clearTimeout(timeout);
          phpProcess.kill('SIGTERM');
          reject(new Error(`Port ${port} is already in use`));
        } else if (error.includes('Failed') || error.includes('Error')) {
          errorOccurred = true;
          clearTimeout(timeout);
          phpProcess.kill('SIGTERM');
          reject(new Error(`PHP server error: ${error}`));
        }
      });

      // Handle unexpected exit
      phpProcess.on('exit', (code) => {
        if (!serverReady && !errorOccurred) {
          clearTimeout(timeout);
          reject(new Error(`PHP server exited with code ${code}`));
        }
      });
    });
  }

  private async saveMetadata(deploymentId: string, metadata: DeploymentMetadata): Promise<void> {
    const metadataPath = path.join(this.basePath, `${deploymentId}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  private async loadMetadata(deploymentId: string): Promise<DeploymentMetadata> {
    const metadataPath = path.join(this.basePath, `${deploymentId}.json`);

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }
      throw error;
    }
  }

  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}