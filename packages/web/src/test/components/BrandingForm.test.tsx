import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BrandingForm from '../../components/BrandingForm';
import type { BrandingConfig } from '@kirby-gen/shared';

describe('BrandingForm', () => {
  const defaultBranding: BrandingConfig = {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    fontFamily: 'Inter',
  };

  it('renders all form fields', () => {
    const mockOnChange = vi.fn();
    render(
      <BrandingForm branding={defaultBranding} onChange={mockOnChange} />
    );

    expect(screen.getByLabelText(/primary color/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/secondary color/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/font family/i)).toBeInTheDocument();
  });

  it('displays current branding values', () => {
    const mockOnChange = vi.fn();
    render(
      <BrandingForm branding={defaultBranding} onChange={mockOnChange} />
    );

    const primaryColorInput = screen
      .getAllByDisplayValue('#000000')
      .find((el) => el.getAttribute('type') === 'text') as HTMLInputElement;
    const fontSelect = screen.getByDisplayValue('Inter') as HTMLSelectElement;

    expect(primaryColorInput).toBeInTheDocument();
    expect(fontSelect).toBeInTheDocument();
  });

  it('calls onChange when primary color changes', () => {
    const mockOnChange = vi.fn();
    render(
      <BrandingForm branding={defaultBranding} onChange={mockOnChange} />
    );

    const colorInput = screen
      .getAllByDisplayValue('#000000')
      .find((el) => el.getAttribute('type') === 'text') as HTMLInputElement;

    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultBranding,
      primaryColor: '#ff0000',
    });
  });

  it('calls onChange when font family changes', () => {
    const mockOnChange = vi.fn();
    render(
      <BrandingForm branding={defaultBranding} onChange={mockOnChange} />
    );

    const fontSelect = screen.getByDisplayValue('Inter');
    fireEvent.change(fontSelect, { target: { value: 'Roboto' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultBranding,
      fontFamily: 'Roboto',
    });
  });

  it('displays preview with applied styles', () => {
    const mockOnChange = vi.fn();
    const customBranding: BrandingConfig = {
      primaryColor: '#6366f1',
      secondaryColor: '#f8fafc',
      fontFamily: 'Montserrat',
    };

    render(
      <BrandingForm branding={customBranding} onChange={mockOnChange} />
    );

    expect(screen.getByText(/preview/i)).toBeInTheDocument();
    expect(screen.getByText(/your portfolio/i)).toBeInTheDocument();
  });
});
