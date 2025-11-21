/**
 * Project controller unit tests
 */
import { Request, Response } from 'express';
import { createProject, getProject, listProjects, updateProject, deleteProject } from '../../../src/controllers/project.controller';
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { NotFoundError } from '../../../src/utils/errors';

// Mock storage service
const mockStorageService = {
  createProject: jest.fn(),
  getProject: jest.fn(),
  listProjects: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
};

// Setup
beforeAll(() => {
  container.register(SERVICE_KEYS.STORAGE, mockStorageService);
});

// Reset mocks
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Project Controller', () => {
  describe('createProject', () => {
    it('should create a new project', async () => {
      const mockProject = {
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: { contentFiles: [], brandingAssets: {} },
        status: 'input',
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      mockStorageService.createProject.mockResolvedValue(mockProject);

      const req = {
        body: { name: 'Test Project' }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await createProject(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProject,
        })
      );
    });
  });

  describe('getProject', () => {
    it('should return a project by ID', async () => {
      const mockProject = {
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: { contentFiles: [], brandingAssets: {} },
        status: 'input',
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-id' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await getProject(req, res);

      expect(mockStorageService.getProject).toHaveBeenCalledWith('test-id');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProject,
        })
      );
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(getProject(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('listProjects', () => {
    it('should return paginated projects', async () => {
      const mockProjects = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'input' },
      ];

      mockStorageService.listProjects.mockResolvedValue(mockProjects);

      const req = {
        query: { page: '1', limit: '10' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await listProjects(req, res);

      expect(mockStorageService.listProjects).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProjects,
        })
      );
    });

    it('should filter projects by status', async () => {
      const mockProjects = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
      ];

      mockStorageService.listProjects.mockResolvedValue(mockProjects);

      const req = {
        query: { page: '1', limit: '10', status: 'completed' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await listProjects(req, res);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.data).toHaveLength(2);
      expect(response.data.every((p: any) => p.status === 'completed')).toBe(true);
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      const mockProject = {
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: { contentFiles: [], brandingAssets: {} },
        status: 'input',
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-id' },
        body: { status: 'mapping' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await updateProject(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({ status: 'mapping' })
      );
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const mockProject = { id: 'test-id' };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.deleteProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-id' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await deleteProject(req, res);

      expect(mockStorageService.deleteProject).toHaveBeenCalledWith('test-id');
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
