/**
 * Skill client unit tests
 */
import { SkillClient } from '../../../src/workflow/skill-client';
import { SkillError } from '../../../src/utils/errors';

// Mock fetch
global.fetch = jest.fn();

// Mock env
const mockEnv = {
  SKILLS_SERVER_URL: 'http://localhost:8001',
  SKILLS_TIMEOUT_MS: 30000,
};

jest.mock('../../../src/config/env', () => ({
  env: mockEnv,
}));

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SkillClient', () => {
  let client: SkillClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    client = new SkillClient();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should use default baseUrl and timeout', () => {
      const defaultClient = new SkillClient();
      expect(defaultClient['baseUrl']).toBe('http://localhost:8001');
      expect(defaultClient['timeout']).toBe(30000);
    });

    it('should accept custom baseUrl and timeout', () => {
      const customClient = new SkillClient('http://custom:9000', 60000);
      expect(customClient['baseUrl']).toBe('http://custom:9000');
      expect(customClient['timeout']).toBe(60000);
    });
  });

  describe('domainMapping', () => {
    it('should successfully call domain mapping skill', async () => {
      const mockResponse = {
        success: true,
        data: {
          domainModel: {
            entities: [],
            relationships: [],
            schema: {},
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.domainMapping({
        contentFiles: [
          {
            path: '/uploads/file.txt',
            filename: 'file.txt',
            mimeType: 'text/plain',
          },
        ],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/skills/domain-mapping',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw SkillError if skill returns error', async () => {
      const mockResponse = {
        success: false,
        error: {
          message: 'Skill processing failed',
          code: 'SKILL_ERROR',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => mockResponse,
      });

      await expect(
        client.domainMapping({
          contentFiles: [],
        })
      ).rejects.toThrow(SkillError);
    });

    it('should throw SkillError if response is not successful', async () => {
      const mockResponse = {
        success: false,
        data: null,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        client.domainMapping({
          contentFiles: [],
        })
      ).rejects.toThrow(SkillError);
    });
  });

  describe('contentStructuring', () => {
    it('should successfully call content structuring skill', async () => {
      const mockResponse = {
        success: true,
        data: {
          structuredContent: {
            projects: [],
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.contentStructuring({
        contentFiles: [],
        domainModel: {
          entities: [],
          relationships: [],
          schema: {},
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/skills/content-structuring',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw SkillError on failure', async () => {
      const mockResponse = {
        success: false,
        error: {
          message: 'Content structuring failed',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => mockResponse,
      });

      await expect(
        client.contentStructuring({
          contentFiles: [],
          domainModel: {
            entities: [],
            relationships: [],
            schema: {},
          },
        })
      ).rejects.toThrow(SkillError);
    });
  });

  describe('designAutomation', () => {
    it('should successfully call design automation skill', async () => {
      const mockResponse = {
        success: true,
        data: {
          designSystem: {
            tokens: {},
            branding: {},
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.designAutomation({
        pinterestUrl: 'https://pinterest.com/board',
        brandingAssets: {},
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/skills/design-automation',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw SkillError on failure', async () => {
      const mockResponse = {
        success: false,
        error: {
          message: 'Design automation failed',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => mockResponse,
      });

      await expect(
        client.designAutomation({
          brandingAssets: {},
        })
      ).rejects.toThrow(SkillError);
    });
  });

  describe('request timeout', () => {
    it('should timeout if skill takes too long', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolve - simulate hanging request
          })
      );

      const promise = client.domainMapping({
        contentFiles: [],
      });

      // Fast-forward past the timeout
      jest.advanceTimersByTime(31000);

      await expect(promise).rejects.toThrow(SkillError);
      await expect(promise).rejects.toThrow('Skill request timeout');
    });

    it('should use custom timeout if provided', async () => {
      jest.useFakeTimers();

      const customClient = new SkillClient(undefined, 5000);

      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolve
          })
      );

      const promise = customClient.domainMapping({
        contentFiles: [],
      });

      jest.advanceTimersByTime(6000);

      await expect(promise).rejects.toThrow('Skill request timeout');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        client.domainMapping({
          contentFiles: [],
        })
      ).rejects.toThrow(SkillError);
    });

    it('should handle JSON parsing errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        client.domainMapping({
          contentFiles: [],
        })
      ).rejects.toThrow(SkillError);
    });

    it('should include error details in SkillError', async () => {
      const mockResponse = {
        error: {
          message: 'Detailed error',
          code: 'CUSTOM_ERROR',
          details: { field: 'value' },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => mockResponse,
      });

      try {
        await client.domainMapping({ contentFiles: [] });
        fail('Should have thrown SkillError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(SkillError);
        expect(error.message).toContain('Detailed error');
        expect(error.details).toMatchObject({
          statusCode: 400,
          code: 'CUSTOM_ERROR',
        });
      }
    });
  });

  describe('healthCheck', () => {
    it('should return true if health endpoint is OK', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return false if health endpoint fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it('should timeout after 5 seconds', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true }), 10000);
          })
      );

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });
});
