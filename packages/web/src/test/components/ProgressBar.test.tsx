import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../../components/ProgressBar';

describe('ProgressBar', () => {
  it('displays progress percentage', () => {
    render(<ProgressBar progress={50} status="in_progress" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows "Complete" when status is completed', () => {
    render(<ProgressBar progress={100} status="completed" />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('shows "Failed" when status is failed', () => {
    render(<ProgressBar progress={30} status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders all stages', () => {
    render(<ProgressBar progress={25} status="in_progress" />);

    expect(screen.getByText('Analyzing Content')).toBeInTheDocument();
    expect(screen.getByText('Generating Schema')).toBeInTheDocument();
    expect(screen.getByText('Creating CMS')).toBeInTheDocument();
    expect(screen.getByText('Building Site')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('highlights active stages based on progress', () => {
    const { container } = render(
      <ProgressBar progress={60} status="in_progress" />
    );

    const activeStages = container.querySelectorAll('.stage.active');
    // Progress 60% should activate first 3 stages (0%, 25%, 50%)
    expect(activeStages.length).toBeGreaterThanOrEqual(3);
  });

  it('clamps progress to 0-100 range', () => {
    const { container, rerender } = render(
      <ProgressBar progress={-10} status="in_progress" />
    );

    let progressFill = container.querySelector('.progress-fill') as HTMLElement;
    expect(progressFill.style.width).toBe('0%');

    rerender(<ProgressBar progress={150} status="in_progress" />);
    progressFill = container.querySelector('.progress-fill') as HTMLElement;
    expect(progressFill.style.width).toBe('100%');
  });
});
