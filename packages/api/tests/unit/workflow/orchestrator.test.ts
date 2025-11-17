/**
 * Workflow orchestrator unit tests
 */
import { WorkflowOrchestrator } from '../../../src/workflow/workflow-orchestrator';
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { skillClient } from '../../../src/workflow/skill-client';

// Mock services
const mockStorageService = {
  getProject: jest.fn(),
  updateProject: jest.fn(),
};

const mockSessionService = {
  createSession: jest.fn(),
};

const mockGitService = {
  init: jest.fn(),
  commit: jest.fn(),
};

const mockDeploymentService = {
  deploy: jest.fn(),
};

// Mock skill client
jest.mock('../../../src/workflow/skill-client', () => ({
  skillClient: {
    domainMapping: jest.fn(),
    contentStructuring: jest.fn(),
    designAutomation: jest.fn(),
  },
}));

// Setup
beforeAll(() => {
  container.register(SERVICE_KEYS.STORAGE, mockStorageService);
  container.register(SERVICE_KEYS.SESSION, mockSessionService);
  container.register(SERVICE_KEYS.GIT, mockGitService);
  container.register(SERVICE_KEYS.DEPLOYMENT, mockDeploymentService);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WorkflowOrchestrator', () => {
  describe('execute', () => {
    it('should execute all phases successfully', async () => {
      const mockProject = {
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: {
          contentFiles: [
            {
              id: 'file-1',
              filename: 'test.pdf',
              originalName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 1000,
              uploadedAt: new Date(),
              path: '/uploads/test.pdf',
            },
          ],
          brandingAssets: {},
        },
        status: 'input' as const,
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);
      mockSessionService.createSession.mockResolvedValue('session-id');

      // Mock skill responses
      (skillClient.domainMapping as jest.Mock).mockResolvedValue({
        domainModel: {
          entities: [],
          relationships: [],
          schema: {},
        },
      });

      (skillClient.contentStructuring as jest.Mock).mockResolvedValue({
        structuredContent: {},
      });

      (skillClient.designAutomation as jest.Mock).mockResolvedValue({
        designSystem: {
          tokens: {},
          branding: {},
        },
      });

      mockGitService.init.mockResolvedValue('/git/repo');
      mockGitService.commit.mockResolvedValue(undefined);

      mockDeploymentService.deploy.mockResolvedValue({
        id: 'deployment-id',
        url: 'http://localhost:4000',
        status: 'running',
        deployedAt: new Date(),
      });

      const orchestrator = new WorkflowOrchestrator();
      const progressEvents: any[] = [];

      orchestrator.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      const result = await orchestrator.execute('test-id');

      expect(result.status).toBe('completed');
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].status).toBe('completed');
    });

    it('should handle workflow errors', async () => {
      const mockProject = {
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: {
          contentFiles: [
            {
              id: 'file-1',
              filename: 'test.pdf',
              originalName: 'test.pdf',
              mimeType: 'application/pdf',
              size: 1000,
              uploadedAt: new Date(),
              path: '/uploads/test.pdf',
            },
          ],
          brandingAssets: {},
        },
        status: 'input' as const,
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);
      mockSessionService.createSession.mockResolvedValue('session-id');

      // Mock skill error
      (skillClient.domainMapping as jest.Mock).mockRejectedValue(
        new Error('Domain mapping failed')
      );

      const orchestrator = new WorkflowOrchestrator();

      await expect(orchestrator.execute('test-id')).rejects.toThrow('Domain mapping failed');
    });
  });
});
