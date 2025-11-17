/**
 * Theme Generator Tests
 */

import { ThemeGenerator } from '../../../../src/adapters/kirby/theme-generator';
import { DesignSystemSchema } from '@kirby-gen/shared';

describe('ThemeGenerator', () => {
  let generator: ThemeGenerator;

  beforeEach(() => {
    generator = new ThemeGenerator();
  });

  const mockDesignSystem: DesignSystemSchema = {
    version: '1.0.0',
    tokens: {
      colors: {
        primary: '#0066ff',
        secondary: '#ff6600',
      },
      fonts: {
        body: {
          family: 'Inter, sans-serif',
          weights: [400, 700],
          source: 'google',
        },
        heading: {
          family: 'Montserrat, sans-serif',
          weights: [600, 800],
          source: 'google',
        },
      },
      spacing: {
        sm: '8px',
        md: '16px',
      },
      shadows: {
        default: '0 2px 4px rgba(0,0,0,0.1)',
      },
      borders: {
        default: '1px solid #ccc',
      },
      radii: {
        default: '4px',
      },
      zIndex: {
        modal: 1000,
      },
      transitions: {
        default: 'all 0.2s ease',
      },
    },
    typography: {
      baseFontSize: 16,
      scale: 1.25,
      headingFont: 'heading',
      bodyFont: 'body',
      styles: {
        'heading-1': {
          fontSize: '2.5rem',
          fontWeight: 800,
          lineHeight: 1.2,
        },
        body: {
          fontSize: '1rem',
          fontWeight: 400,
          lineHeight: 1.6,
        },
      },
    },
    spacing: {
      baseUnit: 8,
      scale: [0, 1, 2, 3, 4, 5],
    },
    colors: {
      primary: {
        50: '#e6f0ff',
        100: '#b3d1ff',
        200: '#80b3ff',
        300: '#4d94ff',
        400: '#1a75ff',
        500: '#0066ff',
        600: '#0052cc',
        700: '#003d99',
        800: '#002966',
        900: '#001433',
      },
      neutral: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
      semantic: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    },
    breakpoints: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  };

  describe('generateTheme', () => {
    it('should generate multiple CSS files', () => {
      const outputs = generator.generateTheme(mockDesignSystem);

      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs.some((o) => o.path.includes('theme.css'))).toBe(true);
      expect(outputs.some((o) => o.path.includes('base.css'))).toBe(true);
      expect(outputs.some((o) => o.path.includes('utilities.css'))).toBe(true);
      expect(outputs.some((o) => o.path.includes('main.css'))).toBe(true);
    });

    it('should generate theme CSS with custom properties', () => {
      const outputs = generator.generateTheme(mockDesignSystem);
      const themeCSS = outputs.find((o) => o.path.includes('theme.css'));

      expect(themeCSS).toBeDefined();
      expect(themeCSS!.content).toContain(':root {');
      expect(themeCSS!.content).toContain('--primary');
      expect(themeCSS!.content).toContain('#0066ff');
    });

    it('should include color scales', () => {
      const outputs = generator.generateTheme(mockDesignSystem);
      const themeCSS = outputs.find((o) => o.path.includes('theme.css'));

      expect(themeCSS!.content).toContain('--color-primary-500');
      expect(themeCSS!.content).toContain('--color-neutral-900');
    });

    it('should include typography tokens', () => {
      const outputs = generator.generateTheme(mockDesignSystem);
      const themeCSS = outputs.find((o) => o.path.includes('theme.css'));

      expect(themeCSS!.content).toContain('--font-body');
      expect(themeCSS!.content).toContain('--font-heading');
    });

    it('should include spacing tokens', () => {
      const outputs = generator.generateTheme(mockDesignSystem);
      const themeCSS = outputs.find((o) => o.path.includes('theme.css'));

      expect(themeCSS!.content).toContain('--spacing-sm');
      expect(themeCSS!.content).toContain('--spacing-md');
    });

    it('should generate base styles', () => {
      const outputs = generator.generateTheme(mockDesignSystem);
      const baseCSS = outputs.find((o) => o.path.includes('base.css'));

      expect(baseCSS).toBeDefined();
      expect(baseCSS!.content).toContain('body {');
      expect(baseCSS!.content).toContain('font-family');
    });

    it('should generate utility classes', () => {
      const outputs = generator.generateTheme(mockDesignSystem);
      const utilitiesCSS = outputs.find((o) => o.path.includes('utilities.css'));

      expect(utilitiesCSS).toBeDefined();
      expect(utilitiesCSS!.content).toContain('.mt-');
      expect(utilitiesCSS!.content).toContain('.text-center');
      expect(utilitiesCSS!.content).toContain('.d-flex');
    });

    it('should generate main CSS with imports', () => {
      const outputs = generator.generateTheme(mockDesignSystem);
      const mainCSS = outputs.find((o) => o.path.includes('main.css'));

      expect(mainCSS).toBeDefined();
      expect(mainCSS!.content).toContain('@import "theme.css"');
      expect(mainCSS!.content).toContain('@import "base.css"');
    });
  });

  describe('generateBreakpointReference', () => {
    it('should generate breakpoint media queries', () => {
      const reference = generator.generateBreakpointReference(mockDesignSystem.breakpoints);

      expect(reference).toContain('@media (min-width: 640px)');
      expect(reference).toContain('@media (min-width: 768px)');
      expect(reference).toContain('@media (min-width: 1024px)');
    });
  });
});
