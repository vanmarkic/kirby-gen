import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../../pages/HomePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useProject hook
const mockCreateProject = vi.fn();
vi.mock('../../hooks/useProject', () => ({
  useProject: () => ({
    createProject: mockCreateProject,
  }),
}));

describe('HomePage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const renderHomePage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the logo and tagline', () => {
    renderHomePage();

    expect(screen.getByText('Kirby Gen')).toBeInTheDocument();
    expect(
      screen.getByText(/generate beautiful, cms-powered portfolio websites/i)
    ).toBeInTheDocument();
  });

  it('renders all feature cards', () => {
    renderHomePage();

    expect(screen.getByText('Upload Your Work')).toBeInTheDocument();
    expect(screen.getByText('AI-Powered Generation')).toBeInTheDocument();
    expect(screen.getByText('Preview & Deploy')).toBeInTheDocument();
  });

  it('has a "Start New Project" button', () => {
    renderHomePage();

    const button = screen.getByRole('button', { name: /start new project/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('creates project and navigates on button click', async () => {
    const mockProject = {
      id: '123',
      name: 'Test Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateProject.mockResolvedValueOnce(mockProject);
    renderHomePage();

    const button = screen.getByRole('button', { name: /start new project/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/project/123/input');
    });
  });

  it('disables button while creating project', async () => {
    mockCreateProject.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderHomePage();

    const button = screen.getByRole('button', { name: /start new project/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(screen.getByText('Creating Project...')).toBeInTheDocument();
    });
  });

  it('navigates to error page on project creation failure', async () => {
    mockCreateProject.mockRejectedValueOnce(new Error('Creation failed'));
    renderHomePage();

    const button = screen.getByRole('button', { name: /start new project/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/error', {
        state: { error: 'Failed to create project' },
      });
    });
  });
});
