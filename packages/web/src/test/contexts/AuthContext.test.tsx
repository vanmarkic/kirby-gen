import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with isAuthenticated=false when no token in localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should start with isAuthenticated=true when token exists in localStorage', () => {
      localStorage.setItem('auth_token', 'test-token-123');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('test-token-123');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('login', () => {
    it('should successfully login with valid password', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'valid-token-456',
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.login('correct-password');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        password: 'correct-password',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('valid-token-456');
      expect(localStorage.getItem('auth_token')).toBe('valid-token-456');
    });

    it('should throw error on login failure', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Invalid password',
          },
        },
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(async () => {
        await act(async () => {
          await result.current.login('wrong-password');
        });
      }).rejects.toThrow();

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should set loading state during login', async () => {
      const mockResponse = {
        data: {
          success: true,
          token: 'valid-token',
        },
      };

      let resolveLogin: any;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      vi.mocked(apiClient.post).mockImplementationOnce(() => loginPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Start login
      act(() => {
        result.current.login('password');
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete login
      await act(async () => {
        resolveLogin(mockResponse);
      });

      // Should not be loading anymore
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('logout', () => {
    it('should clear token and authentication state', () => {
      localStorage.setItem('auth_token', 'test-token');

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Initially authenticated
      expect(result.current.isAuthenticated).toBe(true);

      // Logout
      act(() => {
        result.current.logout();
      });

      // Should be logged out
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Token Persistence', () => {
    it('should persist token across page reloads', () => {
      localStorage.setItem('auth_token', 'persisted-token');

      const { result: result1 } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result1.current.isAuthenticated).toBe(true);
      expect(result1.current.token).toBe('persisted-token');

      // Simulate page reload by creating new hook instance
      const { result: result2 } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result2.current.isAuthenticated).toBe(true);
      expect(result2.current.token).toBe('persisted-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during login', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(apiClient.post).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(async () => {
        await act(async () => {
          await result.current.login('password');
        });
      }).rejects.toThrow('Network Error');

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle malformed API responses', async () => {
      const mockResponse = {
        data: {
          success: false,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(async () => {
        await act(async () => {
          await result.current.login('password');
        });
      }).rejects.toThrow();

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
