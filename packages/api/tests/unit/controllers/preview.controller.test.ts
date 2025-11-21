/**
 * Preview controller unit tests
 */
import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import archiver from 'archiver';
import {
  getPreviewUrl,
  downloadSite,
  downloadProjectData,
  getDeploymentLogs,
  restartDeployment,
} from '../../../src/controllers/preview.controller';
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { NotFoundError } from '../../../src/utils/errors';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
  },
}));

jest.mock('archiver');

const mockStorageService = {
  getProject: jest.fn(),
  updateProject: jest.fn(),
};

const mockDeploymentService = {
  getDeployment: jest.fn(),
  getLogs: jest.fn(),
  stopDeployment: jest.fn(),
  deploy: jest.fn(),
};

// Setup
beforeAll(() => {
  container.register(SERVICE_KEYS.STORAGE, mockStorageService);
  container.register(SERVICE_KEYS.DEPLOYMENT, mockDeploymentService);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Preview Controller', () => {
  describe('getPreviewUrl', () => {
    it('should return preview URL', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        url: 'https://preview.example.com',
        status: 'running',
        deployedAt: new Date(),
      };

      const mockProject = {
        id: 'test-project',
        status: 'completed',
        generated: {
          sitePath: '/sites/test-project',
          deploymentId: 'deployment-123',
          deploymentUrl: 'https://preview.example.com',
          gitRepo: 'https://github.com/user/repo',
          kirbyVersion: '4.0.0',
          generatedAt: new Date(),
        },
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockDeploymentService.getDeployment.mockResolvedValue(mockDeployment);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await getPreviewUrl(req, res);

      expect(mockDeploymentService.getDeployment).toHaveBeenCalledWith('deployment-123');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            url: 'https://preview.example.com',
            status: 'running',
          }),
        })
      );
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(getPreviewUrl(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if site not generated', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        generated: undefined,
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(getPreviewUrl(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if deployment does not exist', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        generated: {
          deploymentId: 'deployment-123',
        },
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockDeploymentService.getDeployment.mockResolvedValue(null);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(getPreviewUrl(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('downloadSite', () => {
    it('should download site as zip', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        generated: {
          sitePath: '/sites/test-project',
          deploymentId: 'deployment-123',
        },
      };

      const mockArchive = {
        pipe: jest.fn(),
        directory: jest.fn(),
        finalize: jest.fn().mockResolvedValue(undefined),
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);

      const req = {
        params: { projectId: 'test-project' },
        query: { format: 'zip' },
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;

      await downloadSite(req, res);

      expect(fs.access).toHaveBeenCalledWith('/sites/test-project');
      expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="portfolio-test-project.zip"'
      );
      expect(mockArchive.directory).toHaveBeenCalledWith('/sites/test-project', false);
      expect(mockArchive.finalize).toHaveBeenCalled();
    });

    it('should default to zip format', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        generated: {
          sitePath: '/sites/test-project',
        },
      };

      const mockArchive = {
        pipe: jest.fn(),
        directory: jest.fn(),
        finalize: jest.fn().mockResolvedValue(undefined),
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);

      const req = {
        params: { projectId: 'test-project' },
        query: {},
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;

      await downloadSite(req, res);

      expect(archiver).toHaveBeenCalledWith('zip', expect.any(Object));
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
        query: {},
      } as unknown as Request;

      const res = {} as Response;

      await expect(downloadSite(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if site not generated', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        generated: undefined,
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
        query: {},
      } as unknown as Request;

      const res = {} as Response;

      await expect(downloadSite(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if site files do not exist', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        generated: {
          sitePath: '/sites/test-project',
        },
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const req = {
        params: { projectId: 'test-project' },
        query: {},
      } as unknown as Request;

      const res = {} as Response;

      await expect(downloadSite(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('downloadProjectData', () => {
    it('should download project data as JSON', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
        json: jest.fn(),
      } as unknown as Response;

      await downloadProjectData(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="project-test-project.json"'
      );
      expect(res.json).toHaveBeenCalledWith(mockProject);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(downloadProjectData(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getDeploymentLogs', () => {
    it('should return deployment logs', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        generated: {
          deploymentId: 'deployment-123',
        },
      };

      const mockLogs = [
        'Starting deployment...',
        'Installing dependencies...',
        'Deployment successful!',
      ];

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockDeploymentService.getLogs.mockResolvedValue(mockLogs);

      const req = {
        params: { projectId: 'test-project' },
        query: { lines: '100' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await getDeploymentLogs(req, res);

      expect(mockDeploymentService.getLogs).toHaveBeenCalledWith('deployment-123', 100);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            logs: mockLogs,
          }),
        })
      );
    });

    it('should default to 100 lines', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        generated: {
          deploymentId: 'deployment-123',
        },
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockDeploymentService.getLogs.mockResolvedValue([]);

      const req = {
        params: { projectId: 'test-project' },
        query: {},
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await getDeploymentLogs(req, res);

      expect(mockDeploymentService.getLogs).toHaveBeenCalledWith('deployment-123', 100);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
        query: {},
      } as unknown as Request;

      const res = {} as Response;

      await expect(getDeploymentLogs(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if deployment does not exist', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        generated: undefined,
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
        query: {},
      } as unknown as Request;

      const res = {} as Response;

      await expect(getDeploymentLogs(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('restartDeployment', () => {
    it('should restart deployment', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        generated: {
          sitePath: '/sites/test-project',
          deploymentId: 'old-deployment',
          deploymentUrl: 'https://old.example.com',
        },
      };

      const mockNewDeployment = {
        id: 'new-deployment',
        url: 'https://new.example.com',
        status: 'running',
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);
      mockDeploymentService.stopDeployment.mockResolvedValue(undefined);
      mockDeploymentService.deploy.mockResolvedValue(mockNewDeployment);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await restartDeployment(req, res);

      expect(mockDeploymentService.stopDeployment).toHaveBeenCalledWith('old-deployment');
      expect(mockDeploymentService.deploy).toHaveBeenCalledWith(
        '/sites/test-project',
        expect.objectContaining({
          name: 'portfolio-test-project',
        })
      );
      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          generated: expect.objectContaining({
            deploymentId: 'new-deployment',
            deploymentUrl: 'https://new.example.com',
          }),
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            deployment: mockNewDeployment,
          }),
        })
      );
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(restartDeployment(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if deployment does not exist', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        generated: undefined,
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(restartDeployment(req, res)).rejects.toThrow(NotFoundError);
    });
  });
});
