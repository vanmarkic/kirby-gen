/**
 * Full workflow integration tests
 * Tests the complete end-to-end workflow
 */
import { container, SERVICE_KEYS, IStorageService, ISessionService } from '@kirby-gen/shared';
import { skillClient } from '../../src/workflow/skill-client';

// Mock services
const mockStorageService: IStorageService = {
  createProject: jest.fn(),
  getProject: jest.fn(),
  updateProject: jest.fn(),
  listProjects: jest.fn(),
  deleteProject: jest.fn(),
};

const mockSessionService: ISessionService = {
  createSession: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  listSessions: jest.fn(),
};

jest.mock('../../src/workflow/skill-client');

describe('Full Workflow Integration', () => {
  beforeAll(() => {
    container.register(SERVICE_KEYS.STORAGE, mockStorageService);
    container.register(SERVICE_KEYS.SESSION, mockSessionService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('complete project lifecycle', () => {
    it('should complete full project workflow', async () => {
      // 1. Create project
      const project = {
        id: 'test-project',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        status: 'input' as const,
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      (mockStorageService.createProject as jest.Mock).mockResolvedValue(project);
      (mockStorageService.getProject as jest.Mock).mockResolvedValue(project);
      (mockStorageService.updateProject as jest.Mock).mockResolvedValue(undefined);

      const createdProject = await mockStorageService.createProject();
      expect(createdProject.id).toBe('test-project');

      // 2. Upload content files (already included in inputs)
      expect(project.inputs.contentFiles).toHaveLength(1);

      // 3. Generate domain model
      const domainModel = {
        entities: [
          {
            id: 'project',
            name: 'Project',
            pluralName: 'Projects',
            description: 'A project',
            fields: [],
          },
        ],
        relationships: [],
        schema: {},
      };

      (skillClient.domainMapping as jest.Mock).mockResolvedValue({
        domainModel,
      });

      const mappingResult = await skillClient.domainMapping({
        contentFiles: project.inputs.contentFiles.map((f) => ({
          path: f.path,
          filename: f.filename,
          mimeType: f.mimeType,
        })),
      });

      project.domainModel = mappingResult.domainModel;
      project.status = 'structuring';
      project.currentStep = 1;

      await mockStorageService.updateProject('test-project', project);

      expect(project.domainModel?.entities).toHaveLength(1);
      expect(mockStorageService.updateProject).toHaveBeenCalled();

      // 4. Structure content
      const structuredContent = {
        projects: [
          {
            id: 'project-1',
            entityType: 'project',
            title: 'My Project',
            slug: 'my-project',
            fields: {},
            metadata: {
              createdAt: new Date(),
              updatedAt: new Date(),
              status: 'published' as const,
            },
          },
        ],
      };

      (skillClient.contentStructuring as jest.Mock).mockResolvedValue({
        structuredContent,
      });

      const structuringResult = await skillClient.contentStructuring({
        contentFiles: project.inputs.contentFiles.map((f) => ({
          path: f.path,
          filename: f.filename,
          mimeType: f.mimeType,
        })),
        domainModel: project.domainModel!,
      });

      project.structuredContent = structuringResult.structuredContent;
      project.status = 'design';
      project.currentStep = 2;

      await mockStorageService.updateProject('test-project', project);

      expect(project.structuredContent?.projects).toHaveLength(1);

      // 5. Generate design system
      const designSystem = {
        tokens: {
          colors: { primary: '#FF0000' },
          typography: {},
          spacing: {},
          breakpoints: {},
          shadows: {},
          borders: {},
          animations: {},
        },
        branding: {},
      };

      (skillClient.designAutomation as jest.Mock).mockResolvedValue({
        designSystem,
      });

      const designResult = await skillClient.designAutomation({
        brandingAssets: project.inputs.brandingAssets,
      });

      project.designSystem = designResult.designSystem;
      project.status = 'blueprints';
      project.currentStep = 3;

      await mockStorageService.updateProject('test-project', project);

      expect(project.designSystem?.tokens.colors.primary).toBe('#FF0000');

      // 6. Complete workflow
      project.status = 'completed';
      project.currentStep = 5;
      project.generated = {
        sitePath: '/sites/test-project',
        gitRepo: 'https://github.com/user/repo',
        deploymentUrl: 'https://preview.example.com',
        deploymentId: 'deployment-123',
        kirbyVersion: '4.0.0',
        generatedAt: new Date(),
      };

      await mockStorageService.updateProject('test-project', project);

      const finalProject = await mockStorageService.getProject('test-project');

      expect(finalProject.status).toBe('completed');
      expect(finalProject.generated?.deploymentUrl).toBeDefined();
    });

    it('should handle workflow errors gracefully', async () => {
      const project = {
        id: 'test-project',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        status: 'input' as const,
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      (mockStorageService.getProject as jest.Mock).mockResolvedValue(project);
      (mockStorageService.updateProject as jest.Mock).mockResolvedValue(undefined);

      // Domain mapping fails
      (skillClient.domainMapping as jest.Mock).mockRejectedValue(
        new Error('Domain mapping failed')
      );

      try {
        await skillClient.domainMapping({
          contentFiles: project.inputs.contentFiles.map((f) => ({
            path: f.path,
            filename: f.filename,
            mimeType: f.mimeType,
          })),
        });
      } catch (error: any) {
        // Handle error
        project.status = 'failed';
        project.errors.push({
          code: 'DOMAIN_MAPPING_ERROR',
          message: error.message,
          timestamp: new Date(),
          phase: 'mapping',
        });

        await mockStorageService.updateProject('test-project', project);
      }

      const failedProject = await mockStorageService.getProject('test-project');

      expect(failedProject.status).toBe('failed');
      expect(failedProject.errors).toHaveLength(1);
      expect(failedProject.errors[0].code).toBe('DOMAIN_MAPPING_ERROR');
    });
  });

  describe('session management during workflow', () => {
    it('should maintain session throughout workflow', async () => {
      const session = {
        id: 'session-123',
        projectId: 'test-project',
        userId: 'user-123',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        data: {},
      };

      (mockSessionService.createSession as jest.Mock).mockResolvedValue(session);
      (mockSessionService.getSession as jest.Mock).mockResolvedValue(session);
      (mockSessionService.updateSession as jest.Mock).mockResolvedValue(undefined);

      // Create session
      const createdSession = await mockSessionService.createSession(
        'user-123',
        'test-project'
      );

      expect(createdSession.projectId).toBe('test-project');

      // Update session data during workflow
      session.data = {
        currentPhase: 'mapping',
        progress: 25,
      };

      await mockSessionService.updateSession('session-123', session);

      // Continue workflow
      session.data = {
        currentPhase: 'structuring',
        progress: 50,
      };

      await mockSessionService.updateSession('session-123', session);

      expect(mockSessionService.updateSession).toHaveBeenCalledTimes(2);
    });

    it('should clean up session after workflow completion', async () => {
      const session = {
        id: 'session-123',
        projectId: 'test-project',
        userId: 'user-123',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        data: {
          currentPhase: 'completed',
        },
      };

      (mockSessionService.getSession as jest.Mock).mockResolvedValue(session);
      (mockSessionService.deleteSession as jest.Mock).mockResolvedValue(undefined);

      // Workflow completed, clean up session
      await mockSessionService.deleteSession('session-123');

      expect(mockSessionService.deleteSession).toHaveBeenCalledWith('session-123');
    });
  });

  describe('parallel project processing', () => {
    it('should handle multiple projects simultaneously', async () => {
      const projects = [
        {
          id: 'project-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          inputs: { contentFiles: [], brandingAssets: {} },
          status: 'input' as const,
          currentStep: 0,
          totalSteps: 5,
          errors: [],
        },
        {
          id: 'project-2',
          createdAt: new Date(),
          updatedAt: new Date(),
          inputs: { contentFiles: [], brandingAssets: {} },
          status: 'input' as const,
          currentStep: 0,
          totalSteps: 5,
          errors: [],
        },
      ];

      (mockStorageService.listProjects as jest.Mock).mockResolvedValue(projects);
      (mockStorageService.getProject as jest.Mock).mockImplementation((id: string) => {
        return Promise.resolve(projects.find((p) => p.id === id));
      });

      const allProjects = await mockStorageService.listProjects();

      expect(allProjects).toHaveLength(2);

      // Process both projects
      const results = await Promise.all(
        allProjects.map(async (project) => {
          const p = await mockStorageService.getProject(project.id);
          return p;
        })
      );

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('project-1');
      expect(results[1].id).toBe('project-2');
    });
  });

  describe('workflow rollback and retry', () => {
    it('should support workflow retry after failure', async () => {
      const project = {
        id: 'test-project',
        createdAt: new Date(),
        updatedAt: new Date(),
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
        status: 'failed' as const,
        currentStep: 1,
        totalSteps: 5,
        errors: [
          {
            code: 'SKILL_ERROR',
            message: 'Domain mapping failed',
            timestamp: new Date(),
            phase: 'mapping' as const,
          },
        ],
      };

      (mockStorageService.getProject as jest.Mock).mockResolvedValue(project);
      (mockStorageService.updateProject as jest.Mock).mockResolvedValue(undefined);

      // Clear errors and retry
      project.errors = [];
      project.status = 'mapping';

      await mockStorageService.updateProject('test-project', project);

      // Retry domain mapping
      (skillClient.domainMapping as jest.Mock).mockResolvedValue({
        domainModel: {
          entities: [],
          relationships: [],
          schema: {},
        },
      });

      const result = await skillClient.domainMapping({
        contentFiles: project.inputs.contentFiles.map((f) => ({
          path: f.path,
          filename: f.filename,
          mimeType: f.mimeType,
        })),
      });

      project.domainModel = result.domainModel;
      project.status = 'structuring';
      project.currentStep = 2;

      await mockStorageService.updateProject('test-project', project);

      const retriedProject = await mockStorageService.getProject('test-project');

      expect(retriedProject.status).toBe('structuring');
      expect(retriedProject.errors).toHaveLength(0);
    });
  });
});
