/**
 * Domain mapping controller unit tests
 */
import { Request, Response } from 'express';
import {
  generateDomainModel,
  updateDomainModel,
  getDomainModel,
  validateDomainModel,
} from '../../../src/controllers/domain-mapping.controller';
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { NotFoundError } from '../../../src/utils/errors';
import { skillClient } from '../../../src/workflow/skill-client';

// Mock dependencies
jest.mock('../../../src/workflow/skill-client');

const mockStorageService = {
  getProject: jest.fn(),
  updateProject: jest.fn(),
};

// Setup
beforeAll(() => {
  container.register(SERVICE_KEYS.STORAGE, mockStorageService);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Domain Mapping Controller', () => {
  describe('generateDomainModel', () => {
    it('should generate domain model from content files', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
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
        currentStep: 0,
        totalSteps: 5,
        updatedAt: new Date(),
      };

      const mockDomainModel = {
        entities: [
          {
            id: 'project',
            name: 'Project',
            pluralName: 'Projects',
            description: 'A project entity',
            fields: [],
          },
        ],
        relationships: [],
        schema: {},
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);
      (skillClient.domainMapping as jest.Mock).mockResolvedValue({
        domainModel: mockDomainModel,
      });

      const req = {
        params: { projectId: 'test-project' },
        body: { existingModel: undefined },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await generateDomainModel(req, res);

      expect(skillClient.domainMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          contentFiles: expect.arrayContaining([
            expect.objectContaining({
              filename: 'content.txt',
            }),
          ]),
        })
      );

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          domainModel: mockDomainModel,
          status: 'structuring',
          currentStep: 1,
        })
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            domainModel: mockDomainModel,
          }),
        })
      );
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
        body: {},
      } as unknown as Request;

      const res = {} as Response;

      await expect(generateDomainModel(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if project has no content files', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
        body: {},
      } as unknown as Request;

      const res = {} as Response;

      await expect(generateDomainModel(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should pass existing model to skill client', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'mapping',
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
        domainModel: {
          entities: [],
          relationships: [],
          schema: {},
        },
        currentStep: 1,
        totalSteps: 5,
        updatedAt: new Date(),
      };

      const existingModel = mockProject.domainModel;

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);
      (skillClient.domainMapping as jest.Mock).mockResolvedValue({
        domainModel: existingModel,
      });

      const req = {
        params: { projectId: 'test-project' },
        body: { existingModel },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await generateDomainModel(req, res);

      expect(skillClient.domainMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          existingModel,
        })
      );
    });
  });

  describe('updateDomainModel', () => {
    it('should update domain model', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'structuring',
        domainModel: {
          entities: [],
          relationships: [],
          schema: {},
        },
        updatedAt: new Date(),
      };

      const updatedDomainModel = {
        entities: [
          {
            id: 'page',
            name: 'Page',
            pluralName: 'Pages',
            description: 'A page',
            fields: [],
          },
        ],
        relationships: [],
        schema: {},
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-project' },
        body: { domainModel: updatedDomainModel },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await updateDomainModel(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          domainModel: updatedDomainModel,
        })
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            domainModel: updatedDomainModel,
          }),
        })
      );
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
        body: { domainModel: {} },
      } as unknown as Request;

      const res = {} as Response;

      await expect(updateDomainModel(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getDomainModel', () => {
    it('should return domain model', async () => {
      const mockDomainModel = {
        entities: [
          {
            id: 'project',
            name: 'Project',
            pluralName: 'Projects',
            description: 'A project entity',
            fields: [],
          },
        ],
        relationships: [],
        schema: {},
      };

      const mockProject = {
        id: 'test-project',
        status: 'structuring',
        domainModel: mockDomainModel,
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await getDomainModel(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            domainModel: mockDomainModel,
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

      await expect(getDomainModel(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if domain model does not exist', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        domainModel: undefined,
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(getDomainModel(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe('validateDomainModel', () => {
    it('should validate a correct domain model', async () => {
      const validModel = {
        entities: [
          {
            id: 'page',
            name: 'Page',
            fields: [
              { id: 'title', name: 'title', type: 'text' },
            ],
          },
        ],
        relationships: [
          {
            id: 'rel1',
            from: 'page',
            to: 'category',
            type: 'many-to-many',
          },
        ],
        schema: {},
      };

      const req = {
        body: { domainModel: validModel },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await validateDomainModel(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            valid: true,
            issues: [],
          }),
        })
      );
    });

    it('should detect missing entities array', async () => {
      const invalidModel = {
        relationships: [],
        schema: {},
      };

      const req = {
        body: { domainModel: invalidModel },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await validateDomainModel(req, res);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.data.valid).toBe(false);
      expect(response.data.issues).toContain('Missing or invalid entities array');
    });

    it('should detect missing relationships array', async () => {
      const invalidModel = {
        entities: [],
        schema: {},
      };

      const req = {
        body: { domainModel: invalidModel },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await validateDomainModel(req, res);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.data.valid).toBe(false);
      expect(response.data.issues).toContain('Missing or invalid relationships array');
    });

    it('should detect missing schema', async () => {
      const invalidModel = {
        entities: [],
        relationships: [],
      };

      const req = {
        body: { domainModel: invalidModel },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await validateDomainModel(req, res);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.data.valid).toBe(false);
      expect(response.data.issues).toContain('Missing schema');
    });

    it('should detect entity validation errors', async () => {
      const invalidModel = {
        entities: [
          { id: 'page' }, // Missing name
          { name: 'Category' }, // Missing id
          { id: 'post', name: 'Post' }, // Missing fields
        ],
        relationships: [],
        schema: {},
      };

      const req = {
        body: { domainModel: invalidModel },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await validateDomainModel(req, res);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.data.valid).toBe(false);
      expect(response.data.issues.length).toBeGreaterThan(0);
    });

    it('should detect relationship validation errors', async () => {
      const invalidModel = {
        entities: [],
        relationships: [
          { id: 'rel1' }, // Missing from/to
          { from: 'page', to: 'category', type: 'invalid-type' }, // Invalid type
          { id: 'rel3', from: 'page', to: 'post', type: 'one-to-many' }, // Valid
        ],
        schema: {},
      };

      const req = {
        body: { domainModel: invalidModel },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await validateDomainModel(req, res);

      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.data.valid).toBe(false);
      expect(response.data.issues.length).toBeGreaterThan(0);
    });
  });
});
