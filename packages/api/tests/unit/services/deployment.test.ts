import * as fs from 'fs/promises';
import * as path from 'path';
import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import { LocalDeploymentService } from '../../../src/services/local/deployment.service';
import { DeploymentResult, DeploymentStatus, Deployment } from '../../../../shared/src/interfaces/deployment.interface';

// Mock modules
jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'test-deployment-id-123')
}));

describe('LocalDeploymentService', () => {
  let deploymentService: LocalDeploymentService;
  const basePath = '/tmp/test-deployments';
  const basePort = 8000;
  const projectId = 'test-project-123';
  const buildPath = '/path/to/build';
  const deploymentId = 'test-deployment-id-123';

  // Mock child process
  class MockChildProcess extends EventEmitter {
    pid = 12345;
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    kill = jest.fn(() => true);
    unref = jest.fn();
  }

  beforeEach(() => {
    jest.clearAllMocks();

    // Set environment variables
    process.env.DEPLOY_BASE_PATH = basePath;
    process.env.DEPLOY_BASE_PORT = String(basePort);

    // Mock fs.access to check if paths exist
    (fs.access as jest.Mock).mockResolvedValue(undefined);

    // Mock fs.mkdir
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

    // Mock fs.writeFile
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    // Mock fs.readFile
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({
      deploymentId,
      projectId,
      port: 8000,
      pid: 12345,
      url: 'http://localhost:8000',
      status: 'ready',
      buildPath,
      createdAt: new Date().toISOString(),
      readyAt: new Date().toISOString()
    }));

    // Mock fs.readdir - empty by default (no existing deployments)
    (fs.readdir as jest.Mock).mockResolvedValue([]);

    // Mock fs.unlink
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    deploymentService = new LocalDeploymentService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default paths if environment variables are not set', () => {
      delete process.env.DEPLOY_BASE_PATH;
      delete process.env.DEPLOY_BASE_PORT;
      const service = new LocalDeploymentService();
      expect(service).toBeDefined();
    });

    it('should use custom paths from environment variables', () => {
      process.env.DEPLOY_BASE_PATH = '/custom/deploy/path';
      process.env.DEPLOY_BASE_PORT = '9000';
      const service = new LocalDeploymentService();
      expect(service).toBeDefined();
    });
  });

  describe('deploy', () => {
    it('should deploy a project successfully', async () => {
      const mockProcess = new MockChildProcess();
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const deployPromise = deploymentService.deploy(projectId, buildPath);

      // Simulate server ready
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Development Server'));
      }, 10);

      const result = await deployPromise;

      expect(result).toEqual({
        deploymentId: 'test-deployment-id-123',
        url: 'http://localhost:8000',
        status: 'ready',
        message: 'Deployment successful'
      });

      expect(child_process.spawn).toHaveBeenCalledWith(
        'php',
        ['-S', '0.0.0.0:8000', '-t', buildPath],
        expect.objectContaining({
          cwd: buildPath,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        })
      );

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle build path not found', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(deploymentService.deploy(projectId, '/invalid/path'))
        .rejects
        .toThrow('Build path does not exist: /invalid/path');
    });

    it('should handle PHP not available', async () => {
      const mockProcess = new MockChildProcess();
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const deployPromise = deploymentService.deploy(projectId, buildPath);

      // Simulate PHP error
      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn php ENOENT'));
      }, 10);

      await expect(deployPromise).rejects.toThrow('PHP is not installed or not in PATH');
    });

    it('should handle port already in use', async () => {
      const mockProcess = new MockChildProcess();
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const deployPromise = deploymentService.deploy(projectId, buildPath);

      // Simulate port in use error
      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('Address already in use'));
      }, 10);

      await expect(deployPromise).rejects.toThrow(/Port \d+ is already in use/);
    });

    it('should find next available port when current is in use', async () => {
      // Mock first port as occupied, second as available
      (fs.readdir as jest.Mock).mockResolvedValue([
        'existing-deployment-8000.json'
      ]);

      (fs.readFile as jest.Mock).mockImplementation((path) => {
        if (path.includes('existing-deployment-8000')) {
          return Promise.resolve(JSON.stringify({
            deploymentId: 'existing-deployment',
            port: 8000,
            pid: 9999,
            status: 'ready'
          }));
        }
        return Promise.resolve(JSON.stringify({
          deploymentId,
          port: 8001,
          pid: 12345,
          status: 'ready'
        }));
      });

      const mockProcess = new MockChildProcess();
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const deployPromise = deploymentService.deploy(projectId, buildPath);

      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Development Server'));
      }, 10);

      const result = await deployPromise;

      expect(result.url).toBe('http://localhost:8001');
    });
  });

  describe('getStatus', () => {
    it('should return deployment status for existing deployment', async () => {
      // Mock process.kill to check if process exists
      const originalKill = process.kill;
      process.kill = jest.fn(); // Process exists

      const status = await deploymentService.getStatus(deploymentId);

      expect(status).toMatchObject({
        deploymentId,
        status: 'ready',
        url: 'http://localhost:8000',
        createdAt: expect.any(Date)
      });

      process.kill = originalKill;
    });

    it('should throw error for non-existent deployment', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(deploymentService.getStatus('non-existent'))
        .rejects
        .toThrow('Deployment not found: non-existent');
    });

    it('should detect stopped deployments by checking PID', async () => {
      // Mock process.kill to check if process exists
      const originalKill = process.kill;
      process.kill = jest.fn(() => {
        throw new Error('ESRCH');
      }) as any;

      const status = await deploymentService.getStatus(deploymentId);

      expect(status.status).toBe('stopped');

      process.kill = originalKill;
    });
  });

  describe('stop', () => {
    it('should stop a running deployment', async () => {
      const originalKill = process.kill;
      process.kill = jest.fn();

      await deploymentService.stop(deploymentId);

      expect(process.kill).toHaveBeenCalledWith(12345, 'SIGTERM');
      expect(fs.writeFile).toHaveBeenCalled();

      process.kill = originalKill;
    });

    it('should handle already stopped deployment gracefully', async () => {
      const originalKill = process.kill;
      process.kill = jest.fn(() => {
        const error = new Error('ESRCH');
        (error as any).code = 'ESRCH';
        throw error;
      }) as any;

      await deploymentService.stop(deploymentId);

      expect(fs.writeFile).toHaveBeenCalled();

      process.kill = originalKill;
    });

    it('should throw error for non-existent deployment', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(deploymentService.stop('non-existent'))
        .rejects
        .toThrow('Deployment not found: non-existent');
    });
  });

  describe('delete', () => {
    it('should delete a deployment and its metadata', async () => {
      const originalKill = process.kill;
      process.kill = jest.fn();

      await deploymentService.delete(deploymentId);

      expect(process.kill).toHaveBeenCalledWith(12345, 'SIGTERM');
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(basePath, `${deploymentId}.json`)
      );

      process.kill = originalKill;
    });

    it('should delete even if process is already stopped', async () => {
      const originalKill = process.kill;
      process.kill = jest.fn(() => {
        throw new Error('ESRCH');
      }) as any;

      await deploymentService.delete(deploymentId);

      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(basePath, `${deploymentId}.json`)
      );

      process.kill = originalKill;
    });

    it('should throw error for non-existent deployment', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(deploymentService.delete('non-existent'))
        .rejects
        .toThrow('Deployment not found: non-existent');
    });
  });

  describe('rollback', () => {
    it('should rollback to a previous deployment', async () => {
      // Mock the deployment as stopped
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({
        deploymentId,
        projectId,
        port: 8000,
        pid: 12345,
        url: 'http://localhost:8000',
        status: 'stopped', // Deployment is stopped
        buildPath,
        createdAt: new Date().toISOString()
      }));

      // Mock multiple deployments
      (fs.readdir as jest.Mock).mockResolvedValue([
        'deployment-1.json',
        'deployment-2.json',
        'deployment-3.json'
      ]);

      const mockProcess = new MockChildProcess();
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const rollbackPromise = deploymentService.rollback(deploymentId);

      // Simulate server ready
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Development Server'));
      }, 10);

      await rollbackPromise;

      expect(child_process.spawn).toHaveBeenCalled();
    });

    it('should throw error if deployment to rollback to does not exist', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      await expect(deploymentService.rollback('non-existent'))
        .rejects
        .toThrow('Deployment not found: non-existent');
    });
  });

  describe('listDeployments', () => {
    it('should list all deployments for a project', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        'deployment-1.json',
        'deployment-2.json',
        'other-project-deployment.json'
      ]);

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('deployment-1')) {
          return Promise.resolve(JSON.stringify({
            deploymentId: 'deployment-1',
            projectId,
            url: 'http://localhost:8000',
            status: 'ready',
            createdAt: new Date('2024-01-01').toISOString()
          }));
        } else if (filePath.includes('deployment-2')) {
          return Promise.resolve(JSON.stringify({
            deploymentId: 'deployment-2',
            projectId,
            url: 'http://localhost:8001',
            status: 'stopped',
            createdAt: new Date('2024-01-02').toISOString()
          }));
        } else {
          return Promise.resolve(JSON.stringify({
            deploymentId: 'other-project-deployment',
            projectId: 'other-project',
            url: 'http://localhost:8002',
            status: 'ready',
            createdAt: new Date('2024-01-03').toISOString()
          }));
        }
      });

      const deployments = await deploymentService.listDeployments(projectId);

      expect(deployments).toHaveLength(2);
      expect(deployments[0].projectId).toBe(projectId);
      expect(deployments[1].projectId).toBe(projectId);
      expect(deployments.map(d => d.deploymentId))
        .toEqual(['deployment-2', 'deployment-1']); // Should be sorted by date desc
    });

    it('should return empty array if no deployments exist', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const deployments = await deploymentService.listDeployments(projectId);

      expect(deployments).toEqual([]);
    });

    it('should handle missing deployments directory gracefully', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      const deployments = await deploymentService.listDeployments(projectId);

      expect(deployments).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('EACCES: Permission denied'));

      const mockProcess = new MockChildProcess();
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const deployPromise = deploymentService.deploy(projectId, buildPath);

      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Development Server'));
      }, 10);

      await expect(deployPromise).rejects.toThrow('EACCES: Permission denied');
    });

    it('should timeout if deployment takes too long', async () => {
      const mockProcess = new MockChildProcess();
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      // Don't emit any events to simulate timeout
      await expect(deploymentService.deploy(projectId, buildPath))
        .rejects
        .toThrow('Deployment timeout: Server failed to start within 30 seconds');
    }, 35000); // Increase test timeout

    it('should handle malformed metadata JSON', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json');

      await expect(deploymentService.getStatus(deploymentId))
        .rejects
        .toThrow();
    });
  });

  describe('port management', () => {
    it('should correctly track used ports', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        'deployment-8000.json',
        'deployment-8001.json',
        'deployment-8003.json' // Gap in port sequence
      ]);

      const mockMetadata = (port: number) => JSON.stringify({
        deploymentId: `deployment-${port}`,
        port,
        status: 'ready'
      });

      (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('8000')) return Promise.resolve(mockMetadata(8000));
        if (filePath.includes('8001')) return Promise.resolve(mockMetadata(8001));
        if (filePath.includes('8003')) return Promise.resolve(mockMetadata(8003));
        return Promise.resolve(mockMetadata(8002)); // Should use the gap
      });

      const mockProcess = new MockChildProcess();
      (child_process.spawn as jest.Mock).mockReturnValue(mockProcess);

      const deployPromise = deploymentService.deploy(projectId, buildPath);

      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Development Server'));
      }, 10);

      const result = await deployPromise;

      // Should use port 8002 (the gap in sequence)
      expect(result.url).toBe('http://localhost:8002');
    });

    it('should handle maximum port limit', async () => {
      // Mock all ports from 8000-8099 as occupied
      const occupiedDeployments = Array.from({ length: 100 }, (_, i) =>
        `deployment-${8000 + i}.json`
      );

      (fs.readdir as jest.Mock).mockResolvedValue(occupiedDeployments);

      (fs.readFile as jest.Mock).mockImplementation((path) => {
        // Extract port number from filename
        const match = path.match(/deployment-(\d+)\.json/);
        const port = match ? parseInt(match[1]) : 8000;

        return Promise.resolve(JSON.stringify({
          deploymentId: `deployment-${port}`,
          port: port,
          status: 'ready'
        }));
      });

      await expect(deploymentService.deploy(projectId, buildPath))
        .rejects
        .toThrow('No available ports in range 8000-8099');
    });
  });
});