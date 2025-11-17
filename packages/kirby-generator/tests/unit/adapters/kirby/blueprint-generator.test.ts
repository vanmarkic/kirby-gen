/**
 * Blueprint Generator Tests
 */

import { BlueprintGenerator } from '../../../../src/adapters/kirby/blueprint-generator';
import { EntitySchema } from '@kirby-gen/shared';
import { parse } from 'yaml';

describe('BlueprintGenerator', () => {
  let generator: BlueprintGenerator;

  beforeEach(() => {
    generator = new BlueprintGenerator();
  });

  describe('generateBlueprint', () => {
    it('should generate valid YAML blueprint', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        description: 'Portfolio project',
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
        ],
        sortable: true,
      };

      const yaml = generator.generateBlueprint(entity);

      expect(yaml).toBeTruthy();
      expect(yaml).toContain('title: Project');

      // Parse YAML to ensure it's valid
      const parsed = parse(yaml);
      expect(parsed.title).toBe('Project');
    });

    it('should include icon if specified', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [],
        icon: 'folder',
      };

      const yaml = generator.generateBlueprint(entity);
      const parsed = parse(yaml);

      expect(parsed.icon).toBe('folder');
    });

    it('should set num field for sortable entities', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [],
        sortable: true,
      };

      const yaml = generator.generateBlueprint(entity);
      const parsed = parse(yaml);

      expect(parsed.num).toBe('num');
    });

    it('should include status options when drafts enabled', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [],
      };

      const yaml = generator.generateBlueprint(entity);
      const parsed = parse(yaml);

      expect(parsed.status).toBeDefined();
      expect(parsed.status.draft).toBeDefined();
      expect(parsed.status.listed).toBeDefined();
    });

    it('should create tabs for entities with many fields', () => {
      const fields = Array.from({ length: 10 }, (_, i) => ({
        id: `field${i}`,
        name: `field${i}`,
        label: `Field ${i}`,
        type: 'text' as const,
        required: false,
      }));

      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields,
      };

      const yaml = generator.generateBlueprint(entity);
      const parsed = parse(yaml);

      expect(parsed.tabs).toBeDefined();
    });

    it('should create columns for entities with few fields', () => {
      const entity: EntitySchema = {
        id: 'project',
        name: 'Project',
        pluralName: 'Projects',
        fields: [
          {
            id: 'title',
            name: 'title',
            label: 'Title',
            type: 'text',
            required: true,
          },
        ],
      };

      const generatorNoTabs = new BlueprintGenerator({ useTabLayout: false });
      const yaml = generatorNoTabs.generateBlueprint(entity);
      const parsed = parse(yaml);

      expect(parsed.columns).toBeDefined();
    });
  });

  describe('getBlueprintFilename', () => {
    it('should generate correct filename', () => {
      const entity: EntitySchema = {
        id: 'portfolioProject',
        name: 'Portfolio Project',
        pluralName: 'Portfolio Projects',
        fields: [],
      };

      const filename = generator.getBlueprintFilename(entity);

      expect(filename).toBe('portfolioproject.yml');
    });
  });

  describe('generateSiteBlueprint', () => {
    it('should generate site blueprint', () => {
      const entities: EntitySchema[] = [
        {
          id: 'project',
          name: 'Project',
          pluralName: 'Projects',
          fields: [],
        },
        {
          id: 'page',
          name: 'Page',
          pluralName: 'Pages',
          fields: [],
        },
      ];

      const yaml = generator.generateSiteBlueprint(entities);
      const parsed = parse(yaml);

      expect(parsed.title).toBe('Site');
      expect(parsed.tabs).toBeDefined();
    });
  });

  describe('generateDesignTokenBlueprint', () => {
    it('should generate design token blueprint', () => {
      const tokens = {
        colors: {
          primary: '#0066ff',
          secondary: '#ff6600',
        },
        fonts: {
          body: {
            family: 'Inter',
            weights: [400, 700],
            source: 'google' as const,
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
      };

      const yaml = generator.generateDesignTokenBlueprint(tokens);
      const parsed = parse(yaml);

      expect(parsed.title).toBe('Design Tokens');
      expect(parsed.tabs).toBeDefined();
      expect(parsed.tabs.colors).toBeDefined();
      expect(parsed.tabs.typography).toBeDefined();
    });
  });
});
