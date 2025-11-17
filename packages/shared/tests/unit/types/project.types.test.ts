/**
 * Project types validation tests
 */
import {
  ProjectData,
  ProjectStatus,
  FileReference,
  Entity,
  EntityField,
  FieldType,
  Relationship,
  ContentItem,
  DesignSystem,
  DesignTokens,
  ColorPalette,
  FontDefinition,
} from '../../../src/types/project.types';

describe('Project Types', () => {
  describe('ProjectData', () => {
    it('should have correct structure for input phase', () => {
      const project: ProjectData = {
        id: 'test-project',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        status: 'input',
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      expect(project.id).toBe('test-project');
      expect(project.status).toBe('input');
      expect(project.inputs).toBeDefined();
    });

    it('should allow optional domain model', () => {
      const project: ProjectData = {
        id: 'test-project',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        domainModel: {
          entities: [],
          relationships: [],
          schema: {},
        },
        status: 'mapping',
        currentStep: 1,
        totalSteps: 5,
        errors: [],
      };

      expect(project.domainModel).toBeDefined();
      expect(project.domainModel?.entities).toEqual([]);
    });

    it('should support all project statuses', () => {
      const statuses: ProjectStatus[] = [
        'input',
        'mapping',
        'structuring',
        'design',
        'blueprints',
        'generating',
        'deploying',
        'completed',
        'failed',
      ];

      statuses.forEach((status) => {
        const project: ProjectData = {
          id: 'test',
          createdAt: new Date(),
          updatedAt: new Date(),
          inputs: { contentFiles: [], brandingAssets: {} },
          status,
          currentStep: 0,
          totalSteps: 5,
          errors: [],
        };

        expect(project.status).toBe(status);
      });
    });
  });

  describe('FileReference', () => {
    it('should have all required fields', () => {
      const file: FileReference = {
        id: 'file-123',
        filename: 'document.pdf',
        originalName: 'My Document.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        uploadedAt: new Date(),
        path: '/uploads/test-project/document.pdf',
      };

      expect(file.id).toBe('file-123');
      expect(file.filename).toBe('document.pdf');
      expect(file.originalName).toBe('My Document.pdf');
      expect(file.mimeType).toBe('application/pdf');
      expect(file.size).toBe(1024000);
      expect(file.path).toBe('/uploads/test-project/document.pdf');
    });
  });

  describe('ColorPalette', () => {
    it('should require only primary color', () => {
      const palette: ColorPalette = {
        primary: '#FF0000',
      };

      expect(palette.primary).toBe('#FF0000');
    });

    it('should support optional colors', () => {
      const palette: ColorPalette = {
        primary: '#FF0000',
        secondary: '#00FF00',
        accent: '#0000FF',
        background: '#FFFFFF',
        text: '#000000',
        custom: {
          'brand-red': '#FF5555',
          'brand-blue': '#5555FF',
        },
      };

      expect(palette.secondary).toBe('#00FF00');
      expect(palette.custom?.['brand-red']).toBe('#FF5555');
    });
  });

  describe('FontDefinition', () => {
    it('should support Google fonts', () => {
      const font: FontDefinition = {
        name: 'Roboto',
        family: 'Roboto, sans-serif',
        weights: [400, 700],
        source: 'google',
        url: 'https://fonts.googleapis.com/css2?family=Roboto',
      };

      expect(font.source).toBe('google');
      expect(font.weights).toContain(400);
      expect(font.weights).toContain(700);
    });

    it('should support custom fonts', () => {
      const font: FontDefinition = {
        name: 'CustomFont',
        family: 'CustomFont, serif',
        weights: [400],
        source: 'custom',
        files: [
          {
            id: 'font-1',
            filename: 'CustomFont-Regular.woff2',
            originalName: 'CustomFont-Regular.woff2',
            mimeType: 'font/woff2',
            size: 50000,
            uploadedAt: new Date(),
            path: '/uploads/fonts/CustomFont-Regular.woff2',
          },
        ],
      };

      expect(font.source).toBe('custom');
      expect(font.files).toHaveLength(1);
    });

    it('should support system fonts', () => {
      const font: FontDefinition = {
        name: 'Arial',
        family: 'Arial, sans-serif',
        weights: [400],
        source: 'system',
      };

      expect(font.source).toBe('system');
    });
  });

  describe('Entity', () => {
    it('should have all required fields', () => {
      const entity: Entity = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        description: 'A project entity',
        fields: [],
      };

      expect(entity.id).toBe('project');
      expect(entity.name).toBe('Project');
      expect(entity.pluralName).toBe('Projects');
    });

    it('should support optional icon and color', () => {
      const entity: Entity = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        description: 'A project entity',
        fields: [],
        icon: 'folder',
        color: '#FF5733',
      };

      expect(entity.icon).toBe('folder');
      expect(entity.color).toBe('#FF5733');
    });
  });

  describe('EntityField', () => {
    it('should support all field types', () => {
      const fieldTypes: FieldType[] = [
        'text',
        'textarea',
        'markdown',
        'number',
        'date',
        'datetime',
        'toggle',
        'select',
        'multiselect',
        'tags',
        'url',
        'email',
        'tel',
        'image',
        'file',
        'gallery',
        'relation',
        'structure',
        'blocks',
      ];

      fieldTypes.forEach((type) => {
        const field: EntityField = {
          id: 'test-field',
          name: 'testField',
          label: 'Test Field',
          type,
          required: false,
        };

        expect(field.type).toBe(type);
      });
    });

    it('should support field validation', () => {
      const field: EntityField = {
        id: 'email',
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        validation: {
          pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
        },
      };

      expect(field.validation?.pattern).toBeDefined();
    });

    it('should support field options', () => {
      const field: EntityField = {
        id: 'category',
        name: 'category',
        label: 'Category',
        type: 'select',
        required: false,
        options: {
          choices: ['web', 'mobile', 'desktop'],
          default: 'web',
        },
      };

      expect(field.options?.choices).toContain('web');
      expect(field.options?.default).toBe('web');
    });
  });

  describe('Relationship', () => {
    it('should support one-to-one relationship', () => {
      const relationship: Relationship = {
        id: 'rel-1',
        type: 'one-to-one',
        from: 'user',
        to: 'profile',
        label: 'Has Profile',
      };

      expect(relationship.type).toBe('one-to-one');
    });

    it('should support one-to-many relationship', () => {
      const relationship: Relationship = {
        id: 'rel-2',
        type: 'one-to-many',
        from: 'user',
        to: 'post',
        label: 'Has Posts',
        inversLabel: 'Author',
      };

      expect(relationship.type).toBe('one-to-many');
      expect(relationship.inversLabel).toBe('Author');
    });

    it('should support many-to-many relationship', () => {
      const relationship: Relationship = {
        id: 'rel-3',
        type: 'many-to-many',
        from: 'post',
        to: 'tag',
        label: 'Tagged With',
      };

      expect(relationship.type).toBe('many-to-many');
    });
  });

  describe('ContentItem', () => {
    it('should have required fields and metadata', () => {
      const content: ContentItem = {
        id: 'content-1',
        entityType: 'project',
        title: 'My Project',
        slug: 'my-project',
        fields: {
          description: 'A great project',
          date: '2025-01-01',
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'published',
        },
      };

      expect(content.entityType).toBe('project');
      expect(content.slug).toBe('my-project');
      expect(content.fields.description).toBe('A great project');
      expect(content.metadata.status).toBe('published');
    });

    it('should support draft status', () => {
      const content: ContentItem = {
        id: 'content-2',
        entityType: 'post',
        title: 'Draft Post',
        slug: 'draft-post',
        fields: {},
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft',
          source: 'file-123',
        },
      };

      expect(content.metadata.status).toBe('draft');
      expect(content.metadata.source).toBe('file-123');
    });
  });

  describe('DesignSystem', () => {
    it('should have tokens and branding', () => {
      const designSystem: DesignSystem = {
        tokens: {
          colors: {
            primary: '#FF0000',
            secondary: '#00FF00',
          },
          typography: {
            fontFamily: 'Roboto, sans-serif',
          },
          spacing: {
            base: '16px',
          },
          breakpoints: {
            sm: '640px',
            md: '768px',
          },
          shadows: {
            sm: '0 1px 2px rgba(0,0,0,0.05)',
          },
          borders: {
            radius: '4px',
          },
          animations: {
            duration: '200ms',
          },
        },
        branding: {},
      };

      expect(designSystem.tokens.colors.primary).toBe('#FF0000');
      expect(designSystem.tokens.spacing.base).toBe('16px');
    });

    it('should support optional moodboard', () => {
      const designSystem: DesignSystem = {
        tokens: {
          colors: {},
          typography: {},
          spacing: {},
          breakpoints: {},
          shadows: {},
          borders: {},
          animations: {},
        },
        branding: {},
        moodboard: {
          url: 'https://pinterest.com/board',
          extractedColors: ['#FF0000', '#00FF00'],
          colorPalette: {
            primary: '#FF0000',
          },
          typography: {
            headingStyle: 'sans-serif',
            bodyStyle: 'serif',
            scale: 1.25,
            suggestions: ['Roboto', 'Open Sans'],
          },
          spacing: {
            scale: 'comfortable',
            baseUnit: 8,
          },
          mood: ['modern', 'clean'],
          keywords: ['minimal', 'professional'],
        },
      };

      expect(designSystem.moodboard?.url).toBe('https://pinterest.com/board');
      expect(designSystem.moodboard?.extractedColors).toContain('#FF0000');
      expect(designSystem.moodboard?.typography.headingStyle).toBe('sans-serif');
    });
  });

  describe('DesignTokens', () => {
    it('should support nested token categories', () => {
      const tokens: DesignTokens = {
        colors: {
          brand: {
            primary: '#FF0000',
            secondary: '#00FF00',
          },
          semantic: {
            success: '#00FF00',
            error: '#FF0000',
          },
        },
        typography: {
          fontSize: {
            base: '16px',
            lg: '20px',
          },
        },
        spacing: {
          0: '0',
          1: '0.25rem',
          2: '0.5rem',
        },
        breakpoints: {
          sm: 640,
          md: 768,
        },
        shadows: {},
        borders: {},
        animations: {},
      };

      expect((tokens.colors.brand as any).primary).toBe('#FF0000');
      expect((tokens.typography.fontSize as any).base).toBe('16px');
    });

    it('should support custom token categories', () => {
      const tokens: DesignTokens = {
        colors: {},
        typography: {},
        spacing: {},
        breakpoints: {},
        shadows: {},
        borders: {},
        animations: {},
        custom: {
          zIndex: {
            modal: 1000,
            dropdown: 900,
          },
        },
      };

      expect((tokens.custom?.zIndex as any).modal).toBe(1000);
    });
  });

  describe('type safety', () => {
    it('should enforce required fields at compile time', () => {
      // This test ensures TypeScript compilation catches missing fields
      // If this compiles, the types are correctly defined

      const project: ProjectData = {
        id: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        status: 'input',
        currentStep: 0,
        totalSteps: 5,
        errors: [],
      };

      // All required fields are present
      expect(project).toBeDefined();
    });

    it('should allow optional fields to be undefined', () => {
      const project: ProjectData = {
        id: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        status: 'input',
        currentStep: 0,
        totalSteps: 5,
        errors: [],
        // domainModel, structuredContent, designSystem, blueprints, generated are all optional
      };

      expect(project.domainModel).toBeUndefined();
      expect(project.structuredContent).toBeUndefined();
      expect(project.designSystem).toBeUndefined();
    });
  });
});
