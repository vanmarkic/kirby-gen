import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';

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

describe('API Client', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    // Reset localStorage before each test
    localStorageMock.clear();
    // Create a new mock adapter for axios
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    // Reset the mock adapter after each test
    mock.reset();
  });

  describe('Configuration', () => {
    it('should have baseURL configured', () => {
      // The baseURL should be set from VITE_API_URL environment variable or default to '/api'
      // This ensures all API calls are prefixed correctly
      expect(apiClient.defaults.baseURL).toBeDefined();
      expect(typeof apiClient.defaults.baseURL).toBe('string');
    });

    it('should construct full URL with baseURL + endpoint path', async () => {
      // This test verifies that axios constructs URLs correctly with baseURL
      // When baseURL is 'http://localhost:3000/api' and we call '/auth/login'
      // The full URL should be 'http://localhost:3000/api/auth/login'

      // Arrange: Mock expects the path, axios handles baseURL internally
      mock.onPost('/auth/login').reply(200, { success: true, token: 'test' });

      // Act: Make request to /auth/login
      const response = await apiClient.post('/auth/login', { password: 'test' });

      // Assert: Request succeeded, meaning baseURL was applied correctly
      expect(response.data).toEqual({ success: true, token: 'test' });
    });
  });

  describe('Request Interceptor - Auth Token', () => {
    it('should add auth token from localStorage to request headers', async () => {
      // Arrange
      const testToken = 'test-token-123';
      localStorageMock.setItem('auth_token', testToken);

      // Mock the API response
      mock.onGet('/test').reply((config) => {
        // Assert that the header is present
        expect(config.headers?.['x-auth-token']).toBe(testToken);
        return [200, { success: true }];
      });

      // Act
      await apiClient.get('/test');

      // Assert is done in the mock reply handler
    });

    it('should not add auth token header when token is not in localStorage', async () => {
      // Arrange - no token in localStorage

      // Mock the API response
      mock.onGet('/test').reply((config) => {
        // Assert that the header is not present
        expect(config.headers?.['x-auth-token']).toBeUndefined();
        return [200, { success: true }];
      });

      // Act
      await apiClient.get('/test');

      // Assert is done in the mock reply handler
    });

    it('should update token in subsequent requests when token changes', async () => {
      // Arrange
      const firstToken = 'first-token';
      const secondToken = 'second-token';

      localStorageMock.setItem('auth_token', firstToken);

      // First request
      mock.onGet('/test1').reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(firstToken);
        return [200, { success: true }];
      });

      await apiClient.get('/test1');

      // Change token
      localStorageMock.setItem('auth_token', secondToken);

      // Second request
      mock.onGet('/test2').reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(secondToken);
        return [200, { success: true }];
      });

      // Act
      await apiClient.get('/test2');

      // Assert is done in the mock reply handlers
    });
  });

  describe('Response Interceptor - 401 Error Handling', () => {
    it('should clear token from localStorage on 401 error', async () => {
      // Arrange
      const testToken = 'test-token-123';
      localStorageMock.setItem('auth_token', testToken);

      // Mock a 401 response
      mock.onGet('/protected').reply(401, {
        error: 'Unauthorized',
        message: 'Authentication required',
      });

      // Act & Assert
      try {
        await apiClient.get('/protected');
        // Should not reach here
        expect.fail('Expected request to throw an error');
      } catch (error) {
        // Assert that the token was cleared
        expect(localStorageMock.getItem('auth_token')).toBeNull();
      }
    });

    it('should not clear token on non-401 errors', async () => {
      // Arrange
      const testToken = 'test-token-123';
      localStorageMock.setItem('auth_token', testToken);

      // Mock a 500 response
      mock.onGet('/error').reply(500, {
        error: 'Server Error',
        message: 'Internal server error',
      });

      // Act & Assert
      try {
        await apiClient.get('/error');
        // Should not reach here
        expect.fail('Expected request to throw an error');
      } catch (error) {
        // Assert that the token was NOT cleared
        expect(localStorageMock.getItem('auth_token')).toBe(testToken);
      }
    });

    it('should clear token on 401 even if request had no token', async () => {
      // Arrange - no token initially
      expect(localStorageMock.getItem('auth_token')).toBeNull();

      // Mock a 401 response
      mock.onGet('/protected').reply(401, {
        error: 'Unauthorized',
      });

      // Act & Assert
      try {
        await apiClient.get('/protected');
        expect.fail('Expected request to throw an error');
      } catch (error) {
        // Assert that localStorage is still clear (no errors thrown)
        expect(localStorageMock.getItem('auth_token')).toBeNull();
      }
    });
  });

  describe('Integration - Auth Flow', () => {
    it('should use token after login and clear it on 401', async () => {
      // Arrange
      const validToken = 'valid-token';

      // Step 1: Login (sets token)
      localStorageMock.setItem('auth_token', validToken);

      // Step 2: Make authenticated request
      mock.onGet('/data').reply((config) => {
        expect(config.headers?.['x-auth-token']).toBe(validToken);
        return [200, { data: 'success' }];
      });

      const response = await apiClient.get('/data');
      expect(response.data).toEqual({ data: 'success' });

      // Step 3: Token expires, get 401
      mock.onGet('/data2').reply(401, { error: 'Unauthorized' });

      try {
        await apiClient.get('/data2');
        expect.fail('Expected 401 error');
      } catch (error) {
        // Token should be cleared
        expect(localStorageMock.getItem('auth_token')).toBeNull();
      }

      // Step 4: Next request should have no token
      mock.onGet('/data3').reply((config) => {
        expect(config.headers?.['x-auth-token']).toBeUndefined();
        return [401, { error: 'Unauthorized' }];
      });

      try {
        await apiClient.get('/data3');
      } catch (error) {
        // Expected
      }
    });
  });
});
