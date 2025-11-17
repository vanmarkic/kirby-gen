/**
 * Theme Generator
 * Generates CSS with design tokens for Kirby CMS
 */

import {
  DesignSystemSchema,
  DesignTokenCollection,
  TypographySystem,
  ColorSystem,
  BreakpointSystem,
} from '@kirby-gen/shared';

/**
 * CSS Output
 */
export interface CSSOutput {
  path: string;
  content: string;
}

/**
 * Theme Generator Configuration
 */
export interface ThemeGeneratorConfig {
  cssVariablePrefix?: string;
  includeUtilities?: boolean;
  includeReset?: boolean;
  cssFormat?: 'expanded' | 'compressed';
  generateSourceMaps?: boolean;
}

/**
 * Theme Generator
 */
export class ThemeGenerator {
  private config: ThemeGeneratorConfig;

  constructor(config: ThemeGeneratorConfig = {}) {
    this.config = {
      cssVariablePrefix: '--',
      includeUtilities: true,
      includeReset: true,
      cssFormat: 'expanded',
      generateSourceMaps: false,
      ...config,
    };
  }

  /**
   * Generate complete theme CSS
   */
  generateTheme(designSystem: DesignSystemSchema): CSSOutput[] {
    const outputs: CSSOutput[] = [];

    // Main theme file with CSS custom properties
    outputs.push({
      path: 'assets/css/theme.css',
      content: this.generateThemeCSS(designSystem),
    });

    // Base styles
    outputs.push({
      path: 'assets/css/base.css',
      content: this.generateBaseStyles(designSystem),
    });

    // Utility classes
    if (this.config.includeUtilities) {
      outputs.push({
        path: 'assets/css/utilities.css',
        content: this.generateUtilities(designSystem),
      });
    }

    // Main CSS file (imports all others)
    outputs.push({
      path: 'assets/css/main.css',
      content: this.generateMainCSS(),
    });

    return outputs;
  }

  /**
   * Generate theme CSS with custom properties
   */
  private generateThemeCSS(designSystem: DesignSystemSchema): string {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Design System Theme');
    lines.push(' * CSS Custom Properties (CSS Variables)');
    lines.push(' */');
    lines.push('');

    lines.push(':root {');

    // Colors
    lines.push('  /* Colors */');
    Object.entries(designSystem.tokens.colors).forEach(([key, value]) => {
      lines.push(`  ${this.toCSSVar(key)}: ${value};`);
    });
    lines.push('');

    // Typography
    lines.push('  /* Typography */');
    lines.push(`  ${this.toCSSVar('font-size-base')}: ${designSystem.typography.baseFontSize}px;`);
    lines.push(`  ${this.toCSSVar('font-scale')}: ${designSystem.typography.scale};`);
    lines.push('');

    Object.entries(designSystem.tokens.fonts).forEach(([key, font]) => {
      lines.push(`  ${this.toCSSVar(`font-${key}`)}: ${font.family};`);
      if (font.lineHeight) {
        lines.push(`  ${this.toCSSVar(`line-height-${key}`)}: ${font.lineHeight};`);
      }
      if (font.letterSpacing) {
        lines.push(`  ${this.toCSSVar(`letter-spacing-${key}`)}: ${font.letterSpacing};`);
      }
    });
    lines.push('');

    // Typography styles
    Object.entries(designSystem.typography.styles).forEach(([key, style]) => {
      lines.push(`  ${this.toCSSVar(`type-${key}-size`)}: ${style.fontSize};`);
      lines.push(`  ${this.toCSSVar(`type-${key}-weight`)}: ${style.fontWeight};`);
      lines.push(`  ${this.toCSSVar(`type-${key}-height`)}: ${style.lineHeight};`);
      if (style.letterSpacing) {
        lines.push(`  ${this.toCSSVar(`type-${key}-spacing`)}: ${style.letterSpacing};`);
      }
    });
    lines.push('');

    // Spacing
    lines.push('  /* Spacing */');
    lines.push(`  ${this.toCSSVar('spacing-unit')}: ${designSystem.spacing.baseUnit}px;`);
    designSystem.spacing.scale.forEach((value, index) => {
      lines.push(`  ${this.toCSSVar(`space-${index}`)}: ${value * designSystem.spacing.baseUnit}px;`);
    });
    lines.push('');

    Object.entries(designSystem.tokens.spacing).forEach(([key, value]) => {
      lines.push(`  ${this.toCSSVar(`spacing-${key}`)}: ${value};`);
    });
    lines.push('');

    // Shadows
    lines.push('  /* Shadows */');
    Object.entries(designSystem.tokens.shadows).forEach(([key, value]) => {
      lines.push(`  ${this.toCSSVar(`shadow-${key}`)}: ${value};`);
    });
    lines.push('');

    // Borders
    lines.push('  /* Borders */');
    Object.entries(designSystem.tokens.borders).forEach(([key, value]) => {
      lines.push(`  ${this.toCSSVar(`border-${key}`)}: ${value};`);
    });
    lines.push('');

    // Border Radius
    lines.push('  /* Border Radius */');
    Object.entries(designSystem.tokens.radii).forEach(([key, value]) => {
      lines.push(`  ${this.toCSSVar(`radius-${key}`)}: ${value};`);
    });
    lines.push('');

    // Z-Index
    lines.push('  /* Z-Index */');
    Object.entries(designSystem.tokens.zIndex).forEach(([key, value]) => {
      lines.push(`  ${this.toCSSVar(`z-${key}`)}: ${value};`);
    });
    lines.push('');

    // Transitions
    lines.push('  /* Transitions */');
    Object.entries(designSystem.tokens.transitions).forEach(([key, value]) => {
      lines.push(`  ${this.toCSSVar(`transition-${key}`)}: ${value};`);
    });
    lines.push('');

    // Breakpoints
    lines.push('  /* Breakpoints */');
    Object.entries(designSystem.breakpoints).forEach(([key, value]) => {
      lines.push(`  ${this.toCSSVar(`breakpoint-${key}`)}: ${value}px;`);
    });

    lines.push('}');
    lines.push('');

    // Color scales
    if (designSystem.colors) {
      lines.push(this.generateColorScales(designSystem.colors));
    }

    return lines.join('\n');
  }

  /**
   * Generate color scales
   */
  private generateColorScales(colors: ColorSystem): string {
    const lines: string[] = [];

    lines.push('/* Color Scales */');
    lines.push(':root {');

    // Primary colors
    if (colors.primary) {
      Object.entries(colors.primary).forEach(([shade, value]) => {
        lines.push(`  ${this.toCSSVar(`color-primary-${shade}`)}: ${value};`);
      });
    }

    // Secondary colors
    if (colors.secondary) {
      Object.entries(colors.secondary).forEach(([shade, value]) => {
        lines.push(`  ${this.toCSSVar(`color-secondary-${shade}`)}: ${value};`);
      });
    }

    // Accent colors
    if (colors.accent) {
      Object.entries(colors.accent).forEach(([shade, value]) => {
        lines.push(`  ${this.toCSSVar(`color-accent-${shade}`)}: ${value};`);
      });
    }

    // Neutral colors
    if (colors.neutral) {
      Object.entries(colors.neutral).forEach(([shade, value]) => {
        lines.push(`  ${this.toCSSVar(`color-neutral-${shade}`)}: ${value};`);
      });
    }

    // Semantic colors
    if (colors.semantic) {
      Object.entries(colors.semantic).forEach(([key, value]) => {
        lines.push(`  ${this.toCSSVar(`color-${key}`)}: ${value};`);
      });
    }

    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate base styles
   */
  private generateBaseStyles(designSystem: DesignSystemSchema): string {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Base Styles');
    lines.push(' */');
    lines.push('');

    // CSS Reset
    if (this.config.includeReset) {
      lines.push(this.generateReset());
      lines.push('');
    }

    // Base typography
    lines.push('/* Base Typography */');
    lines.push('body {');
    lines.push(`  font-family: var(${this.toCSSVar(`font-${designSystem.typography.bodyFont}`)});`);
    lines.push(`  font-size: var(${this.toCSSVar('font-size-base')});`);
    lines.push('  line-height: 1.6;');
    lines.push('  color: var(--color-neutral-900);');
    lines.push('  background-color: var(--color-neutral-50);');
    lines.push('}');
    lines.push('');

    // Headings
    lines.push('/* Headings */');
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag, index) => {
      const styleKey = `heading-${index + 1}`;
      if (designSystem.typography.styles[styleKey]) {
        lines.push(`${tag} {`);
        lines.push(`  font-family: var(${this.toCSSVar(`font-${designSystem.typography.headingFont}`)});`);
        lines.push(`  font-size: var(${this.toCSSVar(`type-${styleKey}-size`)});`);
        lines.push(`  font-weight: var(${this.toCSSVar(`type-${styleKey}-weight`)});`);
        lines.push(`  line-height: var(${this.toCSSVar(`type-${styleKey}-height`)});`);
        lines.push(`  margin-top: 0;`);
        lines.push(`  margin-bottom: var(--spacing-4);`);
        lines.push('}');
        lines.push('');
      }
    });

    // Links
    lines.push('/* Links */');
    lines.push('a {');
    lines.push('  color: var(--color-primary-500);');
    lines.push('  text-decoration: none;');
    lines.push('  transition: var(--transition-default);');
    lines.push('}');
    lines.push('');
    lines.push('a:hover {');
    lines.push('  color: var(--color-primary-600);');
    lines.push('  text-decoration: underline;');
    lines.push('}');
    lines.push('');

    // Container
    lines.push('/* Layout */');
    lines.push('.container {');
    lines.push('  max-width: 1200px;');
    lines.push('  margin-left: auto;');
    lines.push('  margin-right: auto;');
    lines.push('  padding-left: var(--spacing-4);');
    lines.push('  padding-right: var(--spacing-4);');
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate CSS reset
   */
  private generateReset(): string {
    return `/* CSS Reset */
*, *::before, *::after {
  box-sizing: border-box;
}

* {
  margin: 0;
  padding: 0;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}`;
  }

  /**
   * Generate utility classes
   */
  private generateUtilities(designSystem: DesignSystemSchema): string {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Utility Classes');
    lines.push(' */');
    lines.push('');

    // Spacing utilities
    lines.push('/* Spacing Utilities */');
    designSystem.spacing.scale.forEach((value, index) => {
      lines.push(`.mt-${index} { margin-top: var(--space-${index}); }`);
      lines.push(`.mb-${index} { margin-bottom: var(--space-${index}); }`);
      lines.push(`.ml-${index} { margin-left: var(--space-${index}); }`);
      lines.push(`.mr-${index} { margin-right: var(--space-${index}); }`);
      lines.push(`.pt-${index} { padding-top: var(--space-${index}); }`);
      lines.push(`.pb-${index} { padding-bottom: var(--space-${index}); }`);
      lines.push(`.pl-${index} { padding-left: var(--space-${index}); }`);
      lines.push(`.pr-${index} { padding-right: var(--space-${index}); }`);
    });
    lines.push('');

    // Text utilities
    lines.push('/* Text Utilities */');
    lines.push('.text-left { text-align: left; }');
    lines.push('.text-center { text-align: center; }');
    lines.push('.text-right { text-align: right; }');
    lines.push('.text-justify { text-align: justify; }');
    lines.push('');

    // Display utilities
    lines.push('/* Display Utilities */');
    lines.push('.d-none { display: none; }');
    lines.push('.d-block { display: block; }');
    lines.push('.d-inline { display: inline; }');
    lines.push('.d-inline-block { display: inline-block; }');
    lines.push('.d-flex { display: flex; }');
    lines.push('.d-grid { display: grid; }');
    lines.push('');

    // Flex utilities
    lines.push('/* Flex Utilities */');
    lines.push('.flex-row { flex-direction: row; }');
    lines.push('.flex-column { flex-direction: column; }');
    lines.push('.justify-start { justify-content: flex-start; }');
    lines.push('.justify-center { justify-content: center; }');
    lines.push('.justify-end { justify-content: flex-end; }');
    lines.push('.justify-between { justify-content: space-between; }');
    lines.push('.align-start { align-items: flex-start; }');
    lines.push('.align-center { align-items: center; }');
    lines.push('.align-end { align-items: flex-end; }');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate main CSS file
   */
  private generateMainCSS(): string {
    const imports: string[] = [];

    if (this.config.includeReset) {
      imports.push('@import "base.css";');
    }

    imports.push('@import "theme.css";');

    if (this.config.includeUtilities) {
      imports.push('@import "utilities.css";');
    }

    imports.push('');
    imports.push('/**');
    imports.push(' * Custom Styles');
    imports.push(' * Add your custom CSS below');
    imports.push(' */');

    return imports.join('\n');
  }

  /**
   * Convert key to CSS variable name
   */
  private toCSSVar(key: string): string {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${this.config.cssVariablePrefix}${normalized}`;
  }

  /**
   * Generate responsive breakpoint mixins (as comments for PHP usage)
   */
  generateBreakpointReference(breakpoints: BreakpointSystem): string {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Responsive Breakpoints Reference');
    lines.push(' * Use these media queries in your custom CSS');
    lines.push(' */');
    lines.push('');

    Object.entries(breakpoints).forEach(([key, value]) => {
      lines.push(`/* ${key}: ${value}px */`);
      lines.push(`@media (min-width: ${value}px) {`);
      lines.push(`  /* Styles for ${key} and up */`);
      lines.push(`}`);
      lines.push('');
    });

    return lines.join('\n');
  }
}
