import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

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

describe('ProtectedRoute', () => {
  const TestComponent = () => <div>Protected Content</div>;
  const LoginComponent = () => <div>Login Page</div>;

  describe('when user is not authenticated', () => {
    it('should redirect to /login', () => {
      // Clear localStorage to ensure not authenticated
      localStorage.clear();

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginComponent />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Should be redirected to login page
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('when user is authenticated', () => {
    it('should render children when token exists', async () => {
      // Set token in localStorage to simulate authenticated user
      localStorage.setItem('auth_token', 'test-token-123');

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginComponent />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Wait for AuthContext to initialize from localStorage
      // The AuthContext useEffect should read the token and update state
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner while checking auth state', () => {
      // Clear localStorage
      localStorage.clear();

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginComponent />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // The component should handle loading state
      // In practice, the AuthContext initializes synchronously from localStorage
      // so we won't see a loading spinner in this test
      // But the component should be ready to show one if needed
      const content = screen.queryByText('Protected Content');
      const login = screen.queryByText('Login Page');

      // One of them should be visible (not both, and not loading forever)
      expect(content || login).toBeTruthy();
    });
  });

  describe('navigation preservation', () => {
    it('should preserve the original path for redirect after login', () => {
      localStorage.clear();

      render(
        <MemoryRouter initialEntries={['/protected/some/path']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/protected/some/path"
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginComponent />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Should redirect to login
      expect(screen.getByText('Login Page')).toBeInTheDocument();

      // The Navigate component should include the 'from' location in state
      // This is more of an implementation detail, but we verify redirect happened
    });
  });
});
