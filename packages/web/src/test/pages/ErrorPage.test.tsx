import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ErrorPage from '../../pages/ErrorPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: {
        error: 'Test error message',
        details: 'Error details here',
      },
    }),
  };
});

describe('ErrorPage', () => {
  const renderErrorPage = () => {
    return render(
      <BrowserRouter>
        <ErrorPage />
      </BrowserRouter>
    );
  };

  it('renders error message from location state', () => {
    renderErrorPage();

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders error details when provided', () => {
    renderErrorPage();

    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText('Error details here')).toBeInTheDocument();
  });

  it('has "Go Back" button that calls navigate(-1)', () => {
    renderErrorPage();

    const backButton = screen.getByRole('button', { name: /go back/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('has "Return Home" button that navigates to root', () => {
    renderErrorPage();

    const homeButton = screen.getByRole('button', { name: /return home/i });
    fireEvent.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders default error message when no state is provided', () => {
    vi.mocked(await import('react-router-dom')).useLocation = () => ({
      state: null,
      pathname: '',
      search: '',
      hash: '',
      key: '',
    });

    renderErrorPage();

    expect(
      screen.getByText('An unexpected error occurred')
    ).toBeInTheDocument();
  });
});
