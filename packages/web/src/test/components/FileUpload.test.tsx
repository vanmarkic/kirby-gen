import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUpload from '../../components/FileUpload';

describe('FileUpload', () => {
  it('renders dropzone with correct text', () => {
    const mockOnChange = vi.fn();
    render(<FileUpload files={[]} onFilesChange={mockOnChange} />);

    expect(
      screen.getByText(/drag and drop files here/i)
    ).toBeInTheDocument();
  });

  it('displays uploaded files', () => {
    const mockOnChange = vi.fn();
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    const files = [mockFile];

    render(<FileUpload files={files} onFilesChange={mockOnChange} />);

    expect(screen.getByText('test.png')).toBeInTheDocument();
    expect(screen.getByText(/uploaded files \(1\)/i)).toBeInTheDocument();
  });

  it('removes file when remove button is clicked', () => {
    const mockOnChange = vi.fn();
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    const files = [mockFile];

    render(<FileUpload files={files} onFilesChange={mockOnChange} />);

    const removeButton = screen.getByLabelText(/remove test\.png/i);
    fireEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('formats file sizes correctly', () => {
    const mockOnChange = vi.fn();
    const mockFile = new File(['a'.repeat(1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    });
    const files = [mockFile];

    render(<FileUpload files={files} onFilesChange={mockOnChange} />);

    expect(screen.getByText(/MB/)).toBeInTheDocument();
  });
});
