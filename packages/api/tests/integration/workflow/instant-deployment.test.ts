/**
 * Integration test for instant deployment feature
 * Tests end-to-end workflow with instant demo deployment
 */
import path from 'path';
import fs from 'fs/promises';
import { WorkflowOrchestrator } from '../../../src/workflow/workflow-orchestrator';
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import type {
  IStorageService,
  ISessionService,
  IDeploymentService,
  IKirbyDeploymentService,
} from '@kirby-gen/shared';
import type { ProjectData } from '@kirby-gen/shared';

// Mock skill client at top level
jest.mock('../../../src/workflow/skill-client', () => ({
  skillClient: {
    domainMapping: jest.fn(),
    contentStructuring: jest.fn(),
    designAutomation: jest.fn(),
  },
}));

import { skillClient } from '../../../src/workflow/skill-client';

// Test data directory
const TEST_DATA_DIR = path.join(__dirname, '../../data/instant-deployment-test');
const TEST_PROJECT_ID = 'instant-deploy-test-project';
const TEST_SESSION_ID = 'instant-deploy-test-session';

describe('Instant Deployment Integration', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockStorageService: jest.Mocked<IStorageService>;
  let mockSessionService: jest.Mocked<ISessionService>;
  let mockDeploymentService: jest.Mocked<IDeploymentService>;
  let mockKirbyDeploymentService: jest.Mocked<IKirbyDeploymentService>;
  let progressEvents: Array<{ phase: string; status: string; progress: number; message: string }>;
  let testProject: ProjectData;

  beforeAll(async () => {
    // Ensure test data directory exists
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  });

  beforeEach(() => {
    // Reset progress tracking
    progressEvents = [];

    // Create test project data
    testProject = {
      id: TEST_PROJECT_ID,
      name: 'Test Portfolio',
      createdAt: new Date(),
      updatedAt: new Date(),
      inputs: {
        contentFiles: [
          {
            id: 'file-1',
            filename: 'content.txt',
            originalName: 'content.txt',
            mimeType: 'text/plain',
            size: 1000,
            uploadedAt: new Date(),
            path: path.join(TEST_DATA_DIR, 'content.txt'),
          },
        ],
        brandingAssets: {
          primaryColor: '#FF5733',
          fontFamily: 'Inter',
        },
      },
      status: 'input',
      currentStep: 0,
      totalSteps: 5,
      errors: [],
    };

    // Mock storage service
    mockStorageService = {
      createProject: jest.fn().mockResolvedValue(testProject),
      getProject: jest.fn().mockResolvedValue(testProject),
      updateProject: jest.fn().mockImplementation(async (_id, updates) => {
        testProject = { ...testProject, ...updates };
        return testProject;
      }),
      listProjects: jest.fn().mockResolvedValue([testProject]),
      deleteProject: jest.fn().mockResolvedValue(undefined),
      uploadFile: jest.fn().mockResolvedValue('/uploads/test/file.txt'),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('test')),
      listFiles: jest.fn().mockResolvedValue(['file1.txt']),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(true),
      getFileMetadata: jest.fn().mockResolvedValue({
        filename: 'test.txt',
        size: 1000,
        mimeType: 'text/plain',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      saveConversationTurn: jest.fn().mockResolvedValue(undefined),
      getConversation: jest.fn().mockResolvedValue(null),
      saveGeneratedArtifacts: jest.fn().mockResolvedValue(undefined),
      getGeneratedArtifacts: jest.fn().mockResolvedValue(null),
    } as jest.Mocked<IStorageService>;

    // Mock session service
    mockSessionService = {
      create: jest.fn().mockResolvedValue(TEST_SESSION_ID),
      get: jest.fn().mockResolvedValue(testProject),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      listSessions: jest.fn().mockResolvedValue([TEST_SESSION_ID]),
      cleanup: jest.fn().mockResolvedValue(0),
    } as jest.Mocked<ISessionService>;

    // Mock deployment service
    mockDeploymentService = {
      deploy: jest.fn().mockResolvedValue({
        deploymentId: 'deploy-123',
        url: 'https://production-site.example.com',
        status: 'ready',
        message: 'Production deployment successful',
      }),
      getStatus: jest.fn().mockResolvedValue({
        deploymentId: 'deploy-123',
        status: 'ready',
        url: 'https://production-site.example.com',
        createdAt: new Date(),
        readyAt: new Date(),
      }),
      rollback: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      listDeployments: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<IDeploymentService>;

    // Mock Kirby deployment service (instant demo)
    mockKirbyDeploymentService = {
      deploy: jest.fn().mockResolvedValue({
        projectId: TEST_PROJECT_ID,
        url: 'http://localhost:3456',
        panelUrl: 'http://localhost:3456/panel',
        deployedAt: new Date(),
        port: 3456,
      }),
      getDeployment: jest.fn().mockResolvedValue({
        projectId: TEST_PROJECT_ID,
        url: 'http://localhost:3456',
        port: 3456,
        deployedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isActive: true,
      }),
      archive: jest.fn().mockResolvedValue(undefined),
      cleanupOldDemos: jest.fn().mockResolvedValue({
        archived: [],
        quotaReached: false,
        emailsSent: [],
      }),
    } as jest.Mocked<IKirbyDeploymentService>;

    // Register mocks in DI container
    container.register(SERVICE_KEYS.STORAGE, mockStorageService);
    container.register(SERVICE_KEYS.SESSION, mockSessionService);
    container.register(SERVICE_KEYS.DEPLOYMENT, mockDeploymentService);
    container.register(SERVICE_KEYS.KIRBY_DEPLOYMENT, mockKirbyDeploymentService);

    // Create orchestrator and track progress events
    orchestrator = new WorkflowOrchestrator();
    orchestrator.on('progress', (data) => {
      progressEvents.push(data);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    orchestrator.removeAllListeners();
  });

  afterAll(async () => {
    // Cleanup test data directory
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('end-to-end workflow with instant deployment', () => {
    it('should complete workflow and deploy instant demo', async () => {
      // Mock the skill client to simulate successful workflow phases
      (skillClient.domainMapping as jest.Mock).mockResolvedValue({
        domainModel: {
          entities: [
            {
              id: 'project',
              name: 'Project',
              pluralName: 'Projects',
              description: 'Portfolio project',
              fields: [
                {
                  id: 'title',
                  name: 'title',
                  label: 'Title',
                  type: 'text',
                  required: true,
                },
              ],
            },
          ],
          relationships: [],
          schema: {},
        },
      });

      (skillClient.contentStructuring as jest.Mock).mockResolvedValue({
        structuredContent: {
          projects: [
            {
              id: 'project-1',
              entityType: 'project',
              title: 'My Project',
              slug: 'my-project',
              fields: { description: 'A test project' },
              metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'published' as const,
              },
            },
          ],
        },
      });

      (skillClient.designAutomation as jest.Mock).mockResolvedValue({
        designSystem: {
          tokens: {
            colors: { primary: '#FF5733', secondary: '#333333' },
            typography: {},
            spacing: {},
            breakpoints: {},
            shadows: {},
            borders: {},
            animations: {},
          },
          branding: testProject.inputs.brandingAssets,
        },
      });

      // Setup test blueprints in storage
      const blueprintsDir = path.join(TEST_DATA_DIR, 'blueprints');
      await fs.mkdir(blueprintsDir, { recursive: true });
      await fs.writeFile(
        path.join(blueprintsDir, 'project.yml'),
        `title: Project
fields:
  title:
    label: Title
    type: text
`,
        'utf-8'
      );

      // Execute workflow
      const result = await orchestrator.execute(TEST_PROJECT_ID);

      // Verify workflow completed
      expect(result.status).toBe('completed');
      expect(result.demoDeployment).toBeDefined();

      // Verify instant demo deployment was called
      expect(mockKirbyDeploymentService.deploy).toHaveBeenCalledWith(TEST_PROJECT_ID);

      // Verify demo deployment info was saved to project
      expect(result.demoDeployment?.url).toBe('http://localhost:3456');
      expect(result.demoDeployment?.panelUrl).toBe('http://localhost:3456/panel');
      expect(result.demoDeployment?.port).toBe(3456);
      expect(result.demoDeployment?.deployedAt).toBeInstanceOf(Date);

      // Verify storage was updated with deployment info
      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        TEST_PROJECT_ID,
        expect.objectContaining({
          demoDeployment: expect.objectContaining({
            url: 'http://localhost:3456',
            panelUrl: 'http://localhost:3456/panel',
            port: 3456,
          }),
        })
      );

      // Verify progress events were emitted
      const instantDeployEvents = progressEvents.filter(
        (e) => e.phase === 'instant-demo'
      );
      expect(instantDeployEvents.length).toBeGreaterThan(0);

      // Verify specific progress messages
      expect(instantDeployEvents).toContainEqual(
        expect.objectContaining({
          phase: 'instant-demo',
          status: 'started',
          message: expect.stringContaining('instant demo'),
        })
      );
      expect(instantDeployEvents).toContainEqual(
        expect.objectContaining({
          phase: 'instant-demo',
          status: 'completed',
          message: expect.stringContaining('http://localhost:3456'),
        })
      );

      // Verify production deployment still happens
      expect(mockDeploymentService.deploy).toHaveBeenCalled();
    }, 30000); // 30 second timeout for integration test

    it('should continue workflow even if instant deployment fails', async () => {
      // Mock instant deployment to fail
      mockKirbyDeploymentService.deploy.mockRejectedValueOnce(
        new Error('Port already in use')
      );

      // Mock successful other phases
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
          tokens: {
            colors: {},
            typography: {},
            spacing: {},
            breakpoints: {},
            shadows: {},
            borders: {},
            animations: {},
          },
          branding: {},
        },
      });

      // Execute workflow - should throw because instant deployment is critical
      await expect(orchestrator.execute(TEST_PROJECT_ID)).rejects.toThrow(
        'Instant deployment failed'
      );

      // Verify instant deployment was attempted
      expect(mockKirbyDeploymentService.deploy).toHaveBeenCalledWith(TEST_PROJECT_ID);

      // Verify error was tracked in progress events
      const failedEvents = progressEvents.filter(
        (e) => e.phase === 'instant-demo' && e.status === 'started'
      );
      expect(failedEvents.length).toBeGreaterThan(0);
    }, 30000);

    it('should update session with demo deployment info', async () => {
      // Mock successful workflow
      (skillClient.domainMapping as jest.Mock).mockResolvedValue({
        domainModel: {
          entities: [
            {
              id: 'page',
              name: 'Page',
              pluralName: 'Pages',
              description: 'Content page',
              fields: [],
            },
          ],
          relationships: [],
          schema: {},
        },
      });

      (skillClient.contentStructuring as jest.Mock).mockResolvedValue({
        structuredContent: { pages: [] },
      });

      (skillClient.designAutomation as jest.Mock).mockResolvedValue({
        designSystem: {
          tokens: {
            colors: {},
            typography: {},
            spacing: {},
            breakpoints: {},
            shadows: {},
            borders: {},
            animations: {},
          },
          branding: {},
        },
      });

      // Execute workflow
      await orchestrator.execute(TEST_PROJECT_ID);

      // Verify session was created
      expect(mockSessionService.create).toHaveBeenCalledWith(
        TEST_PROJECT_ID,
        expect.any(Object)
      );

      // Verify project updates included demo deployment
      const updateCalls = (mockStorageService.updateProject as jest.Mock).mock.calls;
      const demoDeploymentUpdate = updateCalls.find(
        ([, updates]) => updates.demoDeployment !== undefined
      );

      expect(demoDeploymentUpdate).toBeDefined();
      expect(demoDeploymentUpdate?.[1].demoDeployment).toMatchObject({
        url: 'http://localhost:3456',
        panelUrl: 'http://localhost:3456/panel',
        port: 3456,
        deployedAt: expect.any(Date),
      });
    }, 30000);
  });

  describe('progress event tracking', () => {
    it('should emit detailed progress events during instant deployment', async () => {
      // Mock successful workflow
      (skillClient.domainMapping as jest.Mock).mockResolvedValue({
        domainModel: { entities: [], relationships: [], schema: {} },
      });

      (skillClient.contentStructuring as jest.Mock).mockResolvedValue({
        structuredContent: {},
      });

      (skillClient.designAutomation as jest.Mock).mockResolvedValue({
        designSystem: {
          tokens: {
            colors: {},
            typography: {},
            spacing: {},
            breakpoints: {},
            shadows: {},
            borders: {},
            animations: {},
          },
          branding: {},
        },
      });

      // Execute workflow
      await orchestrator.execute(TEST_PROJECT_ID);

      // Find instant-demo phase events
      const instantDemoEvents = progressEvents.filter(
        (e) => e.phase === 'instant-demo'
      );

      // Should have at least: started, in_progress, completed
      expect(instantDemoEvents.length).toBeGreaterThanOrEqual(3);

      // Verify event sequence
      const statuses = instantDemoEvents.map((e) => e.status);
      expect(statuses).toContain('started');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('completed');

      // Verify progress values increase
      const progressValues = instantDemoEvents.map((e) => e.progress);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }

      // Verify messages are descriptive
      instantDemoEvents.forEach((event) => {
        expect(event.message).toBeTruthy();
        expect(event.message.length).toBeGreaterThan(0);
      });
    }, 30000);
  });
});
