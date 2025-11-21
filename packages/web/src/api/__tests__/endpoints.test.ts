import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import { projectEndpoints, domainMappingEndpoints, fileEndpoints } from '../endpoints';
import type { Project } from '@kirby-gen/shared';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('API Endpoints - Authentication Integration', () => {
  let mock: MockAdapter;
  const testToken = 'test-auth-token-123';
  const projectId = 'test-project-id';

  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.setItem('auth_token', testToken);
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.reset();
  });

  describe('Project Endpoints', () => {
    it('should include auth token when creating project', async () => {
      mock.onPost('/projects').reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true, data: { id: projectId, name: 'Test' } }];
      });

      await projectEndpoints.create({ name: 'Test' });
    });

    it('should include auth token when getting project', async () => {
      mock.onGet(`/projects/${projectId}`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true, data: { id: projectId } }];
      });

      await projectEndpoints.get(projectId);
    });

    it('should include auth token when listing projects', async () => {
      mock.onGet('/projects').reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true, data: [] }];
      });

      await projectEndpoints.list();
    });

    it('should include auth token when updating project', async () => {
      mock.onPut(`/projects/${projectId}`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true, data: { id: projectId } }];
      });

      await projectEndpoints.update(projectId, { name: 'Updated' });
    });

    it('should include auth token when deleting project', async () => {
      mock.onDelete(`/projects/${projectId}`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true }];
      });

      await projectEndpoints.delete(projectId);
    });

    it('should include auth token when generating project', async () => {
      mock.onPost(`/projects/${projectId}/generate`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true }];
      });

      await projectEndpoints.generate(projectId);
    });

    it('should include auth token when getting preview URL', async () => {
      mock.onGet(`/projects/${projectId}/preview-url`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true, data: { url: 'http://preview.test' } }];
      });

      await projectEndpoints.getPreviewUrl(projectId);
    });

    it('should include auth token when downloading project', async () => {
      const blob = new Blob(['test'], { type: 'application/zip' });

      mock.onGet(`/projects/${projectId}/download`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, blob];
      });

      await projectEndpoints.download(projectId);
    });
  });

  describe('Domain Mapping Endpoints', () => {
    it('should include auth token when initializing domain mapping', async () => {
      mock.onPost(`/projects/${projectId}/domain-mapping/init`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true, data: { initialMessage: 'Hello' } }];
      });

      await domainMappingEndpoints.initialize(projectId);
    });

    it('should include auth token when sending message', async () => {
      mock.onPost(`/projects/${projectId}/domain-mapping/message`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [
          200,
          {
            success: true,
            data: { message: 'Response', isComplete: false },
          },
        ];
      });

      await domainMappingEndpoints.sendMessage(projectId, {
        message: 'Test',
        conversationHistory: [],
      });
    });

    it('should include auth token when getting schema', async () => {
      mock.onGet(`/projects/${projectId}/domain-mapping/schema`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true, data: { entities: [] } }];
      });

      await domainMappingEndpoints.getSchema(projectId);
    });
  });

  describe('File Endpoints', () => {
    it('should include auth token when uploading content files', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      mock.onPost(`/projects/${projectId}/files/content`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        expect(config.headers?.['Content-Type']).toContain('multipart/form-data');
        return [200, { success: true }];
      });

      await fileEndpoints.uploadContent(projectId, [file]);
    });

    it('should include auth token when uploading files', async () => {
      const file = new File(['content'], 'image.png', { type: 'image/png' });

      mock.onPost(`/projects/${projectId}/files`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        expect(config.headers?.['Content-Type']).toContain('multipart/form-data');
        return [200, { success: true }];
      });

      await fileEndpoints.upload(projectId, [file]);
    });

    it('should include auth token when uploading Pinterest URL', async () => {
      const url = 'https://pinterest.com/pin/123';

      mock.onPost(`/projects/${projectId}/pinterest`).reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true }];
      });

      await fileEndpoints.uploadPinterestUrl(projectId, url);
    });
  });

  describe('Error Handling - 401 Unauthorized', () => {
    it('should clear auth token on 401 response from any endpoint', async () => {
      mock.onGet('/projects').reply(401, {
        error: 'Unauthorized',
        message: 'Invalid token',
      });

      expect(localStorageMock.getItem('auth_token')).toBe(testToken);

      try {
        await projectEndpoints.list();
        expect.fail('Should have thrown error');
      } catch (error) {
        // Token should be cleared by response interceptor
        expect(localStorageMock.getItem('auth_token')).toBeNull();
      }
    });

    it('should propagate 401 errors with proper error message', async () => {
      const errorMessage = 'No authentication token provided';

      mock.onPost(`/projects/${projectId}/domain-mapping/init`).reply(401, {
        error: 'UnauthorizedError',
        message: errorMessage,
      });

      try {
        await domainMappingEndpoints.initialize(projectId);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe(errorMessage);
      }
    });
  });

  describe('Poka-Yoke: Verify ALL endpoints use apiClient', () => {
    it('should verify all project endpoints return axios responses', async () => {
      // This test verifies that endpoints use apiClient (axios instance)
      // by checking that responses have axios-specific properties

      mock.onGet('/projects').reply(200, { success: true, data: [] });
      const response = await projectEndpoints.list();

      // If using fetch(), this would just be an array
      // If using apiClient (axios), data is extracted from response.data
      expect(Array.isArray(response)).toBe(true);
    });

    it('should verify domain mapping endpoints return axios responses', async () => {
      mock.onPost(`/projects/${projectId}/domain-mapping/init`).reply(200, {
        success: true,
        data: { initialMessage: 'Test' },
      });

      const response = await domainMappingEndpoints.initialize(projectId);

      // Verify we get the extracted data, not raw fetch Response
      expect(response).toHaveProperty('initialMessage');
      expect(typeof response.initialMessage).toBe('string');
    });
  });
});
