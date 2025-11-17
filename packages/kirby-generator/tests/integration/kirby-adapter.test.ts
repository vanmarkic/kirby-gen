/**
 * Kirby Adapter Integration Tests
 */

import { KirbyCMSAdapter } from '../../src/adapters/kirby/kirby.adapter';
import {
  ContentSchema,
  StructuredContentCollection,
  DesignSystemSchema,
  GenerationConfig,
} from '@kirby-gen/shared';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('KirbyCMSAdapter Integration', () => {
  let adapter: KirbyCMSAdapter;
  let tempDir: string;

  beforeEach(async () => {
    adapter = new KirbyCMSAdapter({
      kirbyVersion: '4.0.0',
      debugMode: true,
    });

    // Create temp directory for test output
    tempDir = path.join(os.tmpdir(), `kirby-gen-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  const mockSchema: ContentSchema = {
    version: '1.0.0',
    entities: [
      {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        description: 'Portfolio projects',
        fields: [
          {
            id: 'title',
            name: 'title',
            label: 'Title',
            type: 'text',
            required: true,
          },
          {
            id: 'description',
            name: 'description',
            label: 'Description',
            type: 'textarea',
            required: false,
          },
          {
            id: 'content',
            name: 'content',
            label: 'Content',
            type: 'richtext',
            required: false,
          },
          {
            id: 'featured',
            name: 'featured',
            label: 'Featured',
            type: 'boolean',
            required: false,
          },
        ],
        sortable: true,
        icon: 'folder',
      },
      {
        id: 'page',
        name: 'Page',
        pluralName: 'Pages',
        fields: [
          {
            id: 'title',
            name: 'title',
            label: 'Title',
            type: 'text',
            required: true,
          },
          {
            id: 'body',
            name: 'body',
            label: 'Body',
            type: 'blocks',
            required: false,
          },
        ],
      },
    ],
    relationships: [
      {
        id: 'project-page',
        type: 'many-to-many',
        from: 'project',
        to: 'page',
        label: 'Related Pages',
      },
    ],
    metadata: {
      name: 'Test Portfolio',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  };

  const mockContent: StructuredContentCollection = {
    schema: mockSchema,
    content: {
      project: [
        {
          id: '1',
          entityType: 'project',
          fields: {
            title: 'My First Project',
            description: 'A great project',
            content: 'This is the full content of my project.',
            featured: true,
          },
          metadata: {
            slug: 'my-first-project',
            status: 'published',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
          },
        },
        {
          id: '2',
          entityType: 'project',
          fields: {
            title: 'Second Project',
            description: 'Another project',
            featured: false,
          },
          metadata: {
            slug: 'second-project',
            status: 'draft',
            createdAt: new Date('2024-01-03'),
            updatedAt: new Date('2024-01-03'),
          },
        },
      ],
      page: [
        {
          id: '1',
          entityType: 'page',
          fields: {
            title: 'About',
            body: [],
          },
          metadata: {
            slug: 'about',
            status: 'published',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        },
      ],
    },
    metadata: {
      generatedAt: new Date('2024-01-01'),
      generator: 'kirby-gen',
      version: '1.0.0',
    },
  };

  const mockDesignSystem: DesignSystemSchema = {
    version: '1.0.0',
    tokens: {
      colors: {
        primary: '#0066ff',
        secondary: '#ff6600',
      },
      fonts: {
        body: {
          family: 'Inter',
          weights: [400, 700],
          source: 'google',
        },
      },
      spacing: {
        sm: '8px',
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
      headingFont: 'body',
      bodyFont: 'body',
      styles: {
        body: {
          fontSize: '1rem',
          fontWeight: 400,
          lineHeight: 1.6,
        },
      },
    },
    spacing: {
      baseUnit: 8,
      scale: [0, 1, 2, 3, 4],
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

  describe('validateSchema', () => {
    it('should validate valid schema', async () => {
      const result = await adapter.validateSchema(mockSchema);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing entity ID', async () => {
      const invalidSchema: ContentSchema = {
        ...mockSchema,
        entities: [
          {
            id: '',
            name: 'Invalid',
            pluralName: 'Invalids',
            fields: [],
          },
        ],
      };

      const result = await adapter.validateSchema(invalidSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing title field', async () => {
      const schemaWithoutTitle: ContentSchema = {
        ...mockSchema,
        entities: [
          {
            id: 'test',
            name: 'Test',
            pluralName: 'Tests',
            fields: [
              {
                id: 'something',
                name: 'something',
                label: 'Something',
                type: 'number',
                required: false,
              },
            ],
          },
        ],
      };

      const result = await adapter.validateSchema(schemaWithoutTitle);

      expect(result.warnings.some((w) => w.code === 'MISSING_TITLE_FIELD')).toBe(true);
    });
  });

  describe('convertSchema', () => {
    it('should generate blueprints for all entities', async () => {
      const output = await adapter.convertSchema(mockSchema);

      expect(output.files.length).toBeGreaterThan(0);
      expect(output.metadata.cmsName).toBe('Kirby');

      // Check for entity blueprints
      const projectBlueprint = output.files.find((f) => f.path.includes('project.yml'));
      expect(projectBlueprint).toBeDefined();

      const pageBlueprint = output.files.find((f) => f.path.includes('page.yml'));
      expect(pageBlueprint).toBeDefined();

      // Check for site blueprint
      const siteBlueprint = output.files.find((f) => f.path.includes('site.yml'));
      expect(siteBlueprint).toBeDefined();
    });
  });

  describe('convertContent', () => {
    it('should generate content files for all items', async () => {
      const output = await adapter.convertContent(mockContent);

      expect(output.files.length).toBe(3); // 2 projects + 1 page
      expect(output.metadata.totalItems).toBe(3);
      expect(output.metadata.entities.project).toBe(2);
      expect(output.metadata.entities.page).toBe(1);
    });

    it('should generate correct content file format', async () => {
      const output = await adapter.convertContent(mockContent);
      const firstProject = output.files[0];

      expect(firstProject.content).toContain('Title: My First Project');
      expect(firstProject.content).toContain('Description: A great project');
      expect(firstProject.content).toContain('Featured: true');
    });
  });

  describe('convertDesignSystem', () => {
    it('should generate CSS files', async () => {
      const output = await adapter.convertDesignSystem(mockDesignSystem);

      expect(output.files.length).toBeGreaterThan(0);

      // Check for theme CSS
      const themeCSS = output.files.find((f) => f.path.includes('theme.css'));
      expect(themeCSS).toBeDefined();
      expect(themeCSS!.content).toContain(':root');
      expect(themeCSS!.content).toContain('--primary');
    });
  });

  describe('generateSite', () => {
    it('should generate complete Kirby site', async () => {
      const config: GenerationConfig = {
        projectId: 'test-portfolio',
        schema: mockSchema,
        content: mockContent,
        designSystem: mockDesignSystem,
        outputPath: tempDir,
      };

      const site = await adapter.generateSite(config);

      expect(site.cmsName).toBe('Kirby');
      expect(site.sitePath).toBe(tempDir);
      expect(site.entryPoint).toBe('index.php');
      expect(site.adminUrl).toBe('/panel');
      expect(site.files.length).toBeGreaterThan(0);

      // Check that files were written to disk
      const indexExists = await fs.pathExists(path.join(tempDir, 'index.php'));
      expect(indexExists).toBe(true);

      const configExists = await fs.pathExists(path.join(tempDir, 'site/config/config.php'));
      expect(configExists).toBe(true);

      const gitignoreExists = await fs.pathExists(path.join(tempDir, '.gitignore'));
      expect(gitignoreExists).toBe(true);
    });

    it('should create proper directory structure', async () => {
      const config: GenerationConfig = {
        projectId: 'test-portfolio',
        schema: mockSchema,
        content: mockContent,
        designSystem: mockDesignSystem,
        outputPath: tempDir,
      };

      await adapter.generateSite(config);

      // Check key directories
      const dirs = [
        'site/blueprints/pages',
        'site/templates',
        'site/snippets',
        'site/config',
        'content',
        'assets/css',
      ];

      for (const dir of dirs) {
        const exists = await fs.pathExists(path.join(tempDir, dir));
        expect(exists).toBe(true);
      }
    });

    it('should include post-install instructions', async () => {
      const config: GenerationConfig = {
        projectId: 'test-portfolio',
        schema: mockSchema,
        content: mockContent,
        designSystem: mockDesignSystem,
        outputPath: tempDir,
      };

      const site = await adapter.generateSite(config);

      expect(site.postInstallSteps).toBeDefined();
      expect(site.postInstallSteps!.length).toBeGreaterThan(0);
    });
  });

  describe('getInfo', () => {
    it('should return adapter information', () => {
      const info = adapter.getInfo();

      expect(info.cmsName).toBe('Kirby');
      expect(info.cmsVersion).toBe('4.0.0');
      expect(info.features.length).toBeGreaterThan(0);
      expect(info.limitations).toBeDefined();
    });
  });
});
