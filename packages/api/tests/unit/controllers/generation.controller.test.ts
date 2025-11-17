/**
 * Generation controller unit tests
 */
import { Request, Response } from 'express';
import {
  startGeneration,
  getGenerationStatus,
  cancelGeneration,
  retryGeneration,
} from '../../../src/controllers/generation.controller';
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { NotFoundError } from '../../../src/utils/errors';
import { WorkflowOrchestrator } from '../../../src/workflow/workflow-orchestrator';
import { ProgressEmitter } from '../../../src/websocket/progress-emitter';

// Mock dependencies
jest.mock('../../../src/workflow/workflow-orchestrator');

const mockStorageService = {
  getProject: jest.fn(),
  updateProject: jest.fn(),
};

const mockProgressEmitter = {
  emitProgress: jest.fn(),
  emitWorkflowCompleted: jest.fn(),
  emitWorkflowFailed: jest.fn(),
} as unknown as ProgressEmitter;

// Setup
beforeAll(() => {
  container.register(SERVICE_KEYS.STORAGE, mockStorageService);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Generation Controller', () => {
  describe('startGeneration', () => {
    it('should start generation process', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'structuring',
        inputs: {
          contentFiles: [
            {
              id: 'file1',
              filename: 'content.txt',
              originalName: 'content.txt',
              mimeType: 'text/plain',
              size: 1000,
              uploadedAt: new Date(),
              path: '/uploads/test-project/content.txt',
            },
          ],
          brandingAssets: {},
        },
        currentStep: 2,
        totalSteps: 5,
        errors: [],
      };

      const mockExecute = jest.fn().mockResolvedValue({
        sitePath: '/sites/test-project',
        deploymentUrl: 'https://preview.example.com',
      });

      const mockOn = jest.fn();

      (WorkflowOrchestrator as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
        on: mockOn,
        removeAllListeners: jest.fn(),
      }));

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await startGeneration(req, res, mockProgressEmitter);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'Generation started',
            projectId: 'test-project',
            status: 'processing',
          }),
        })
      );

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockExecute).toHaveBeenCalledWith('test-project');
    });

    it('should subscribe to progress events when progressEmitter is provided', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'structuring',
        inputs: {
          contentFiles: [{ id: 'file1' }],
          brandingAssets: {},
        },
        errors: [],
      };

      const mockExecute = jest.fn().mockResolvedValue({});
      const mockOn = jest.fn();

      (WorkflowOrchestrator as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
        on: mockOn,
        removeAllListeners: jest.fn(),
      }));

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await startGeneration(req, res, mockProgressEmitter);

      expect(mockOn).toHaveBeenCalledWith('progress', expect.any(Function));
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(startGeneration(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw error if no content files uploaded', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        errors: [],
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(startGeneration(req, res)).rejects.toThrow(
        'No content files uploaded'
      );
    });

    it('should throw error if generation already in progress', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'generating',
        inputs: {
          contentFiles: [{ id: 'file1' }],
          brandingAssets: {},
        },
        errors: [],
      };

      const mockExecute = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      (WorkflowOrchestrator as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      }));

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Start first generation
      await startGeneration(req, res);

      // Try to start another one
      await expect(startGeneration(req, res)).rejects.toThrow(
        'Generation already in progress'
      );
    });
  });

  describe('getGenerationStatus', () => {
    it('should return generation status', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'generating',
        currentStep: 3,
        totalSteps: 5,
        errors: [],
        generated: undefined,
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await getGenerationStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            projectId: 'test-project',
            status: 'generating',
            currentStep: 3,
            totalSteps: 5,
            isInProgress: false,
          }),
        })
      );
    });

    it('should indicate when generation is in progress', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'generating',
        inputs: {
          contentFiles: [{ id: 'file1' }],
          brandingAssets: {},
        },
        currentStep: 3,
        totalSteps: 5,
        errors: [],
      };

      const mockExecute = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      (WorkflowOrchestrator as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      }));

      mockStorageService.getProject.mockResolvedValue(mockProject);

      // Start generation
      const startReq = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const startRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await startGeneration(startReq, startRes);

      // Check status
      const statusReq = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const statusRes = {
        json: jest.fn(),
      } as unknown as Response;

      await getGenerationStatus(statusReq, statusRes);

      const response = (statusRes.json as jest.Mock).mock.calls[0][0];
      expect(response.data.isInProgress).toBe(true);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(getGenerationStatus(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancelGeneration', () => {
    it('should cancel active generation', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'generating',
        inputs: {
          contentFiles: [{ id: 'file1' }],
          brandingAssets: {},
        },
        errors: [],
      };

      const mockExecute = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );

      const mockRemoveAllListeners = jest.fn();

      (WorkflowOrchestrator as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
        on: jest.fn(),
        removeAllListeners: mockRemoveAllListeners,
      }));

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      // Start generation
      const startReq = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const startRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await startGeneration(startReq, startRes);

      // Cancel generation
      const cancelReq = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const cancelRes = {
        json: jest.fn(),
      } as unknown as Response;

      await cancelGeneration(cancelReq, cancelRes);

      expect(mockRemoveAllListeners).toHaveBeenCalled();
      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          status: 'failed',
          errors: expect.arrayContaining([
            expect.objectContaining({
              code: 'GENERATION_CANCELLED',
            }),
          ]),
        })
      );
      expect(cancelRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'Generation cancelled',
          }),
        })
      );
    });

    it('should throw NotFoundError if no active generation', async () => {
      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(cancelGeneration(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('retryGeneration', () => {
    it('should retry failed generation', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'failed',
        inputs: {
          contentFiles: [{ id: 'file1' }],
          brandingAssets: {},
        },
        errors: [
          {
            code: 'SKILL_ERROR',
            message: 'Skill failed',
            timestamp: new Date(),
            phase: 'mapping',
          },
        ],
        updatedAt: new Date(),
      };

      const mockExecute = jest.fn().mockResolvedValue({});

      (WorkflowOrchestrator as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      }));

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await retryGeneration(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          errors: [],
        })
      );
      expect(res.status).toHaveBeenCalledWith(202);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(retryGeneration(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw error if generation is not failed', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'completed',
        inputs: {
          contentFiles: [{ id: 'file1' }],
          brandingAssets: {},
        },
        errors: [],
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(retryGeneration(req, res)).rejects.toThrow(
        'Can only retry failed generations'
      );
    });
  });
});
