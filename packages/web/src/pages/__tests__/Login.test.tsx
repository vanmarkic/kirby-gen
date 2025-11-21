/**
 * Login page tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Login } from '../Login';
import { AuthProvider } from '../../contexts';
import { apiClient } from '../../api/client';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock apiClient
vi.mock('../../api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render login form', () => {
    renderLogin();

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should show error with empty password', async () => {
    renderLogin();

    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should call login and navigate on success', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, token: 'valid-token' },
    });

    renderLogin();

    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(passwordInput, { target: { value: 'correct-password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show error with invalid password', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({
      response: {
        data: { message: 'Invalid password' },
      },
      message: 'Invalid password',
    });

    renderLogin();

    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid password/i)).toBeInTheDocument();
    });
  });

  it('should disable button while loading', async () => {
    vi.mocked(apiClient.post).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true, token: 'test' } }), 100))
    );

    renderLogin();

    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(loginButton);

    expect(loginButton).toBeDisabled();
    expect(screen.getByText(/logging in/i)).toBeInTheDocument();
  });
});
