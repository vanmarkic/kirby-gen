/**
 * Kirby Adapter Usage Examples
 */

import { KirbyCMSAdapter } from '../src/adapters/kirby/kirby.adapter';
import {
  ContentSchema,
  StructuredContentCollection,
  DesignSystemSchema,
  GenerationConfig,
} from '@kirby-gen/shared';

/**
 * Example 1: Basic Usage
 */
async function basicUsage() {
  // Initialize adapter
  const adapter = new KirbyCMSAdapter({
    kirbyVersion: '4.0.0',
    enableDrafts: true,
    enablePreview: true,
  });

  // Define schema
  const schema: ContentSchema = {
    version: '1.0.0',
    entities: [
      {
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
          {
            id: 'description',
            name: 'description',
            label: 'Description',
            type: 'richtext',
            required: false,
          },
        ],
        sortable: true,
      },
    ],
    relationships: [],
    metadata: {
      name: 'Portfolio',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  // Validate schema
  const validation = await adapter.validateSchema(schema);
  if (!validation.valid) {
    console.error('Schema validation failed:', validation.errors);
    return;
  }

  // Convert schema to blueprints
  const blueprints = await adapter.convertSchema(schema);
  console.log(`Generated ${blueprints.files.length} blueprint files`);
}

/**
 * Example 2: Full Site Generation
 */
async function fullSiteGeneration() {
  const adapter = new KirbyCMSAdapter();

  const schema: ContentSchema = {
    version: '1.0.0',
    entities: [
      {
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
      },
    ],
    relationships: [],
    metadata: {
      name: 'Portfolio',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const content: StructuredContentCollection = {
    schema,
    content: {
      project: [
        {
          id: '1',
          entityType: 'project',
          fields: {
            title: 'My First Project',
          },
          metadata: {
            slug: 'my-first-project',
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    },
    metadata: {
      generatedAt: new Date(),
      generator: 'kirby-gen',
      version: '1.0.0',
    },
  };

  const designSystem: DesignSystemSchema = {
    version: '1.0.0',
    tokens: {
      colors: {
        primary: '#0066ff',
      },
      fonts: {
        body: {
          family: 'Inter',
          weights: [400, 700],
          source: 'google',
        },
      },
      spacing: {},
      shadows: {},
      borders: {},
      radii: {},
      zIndex: {},
      transitions: {},
    },
    typography: {
      baseFontSize: 16,
      scale: 1.25,
      headingFont: 'body',
      bodyFont: 'body',
      styles: {},
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

  const config: GenerationConfig = {
    projectId: 'my-portfolio',
    schema,
    content,
    designSystem,
    outputPath: './output/kirby-site',
  };

  // Generate complete site
  const site = await adapter.generateSite(config);

  console.log('Site generated successfully!');
  console.log('Location:', site.sitePath);
  console.log('Entry point:', site.entryPoint);
  console.log('Admin panel:', site.adminUrl);
  console.log('\nNext steps:');
  site.postInstallSteps?.forEach((step) => console.log(step));
}

/**
 * Example 3: Individual Component Usage
 */
async function individualComponents() {
  const adapter = new KirbyCMSAdapter();

  const schema: ContentSchema = {
    version: '1.0.0',
    entities: [
      {
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
      },
    ],
    relationships: [],
    metadata: {
      name: 'Portfolio',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  // Just convert schema
  const blueprints = await adapter.convertSchema(schema);
  console.log('Blueprints:', blueprints.files.length);

  // Just convert content
  const content: StructuredContentCollection = {
    schema,
    content: {
      project: [
        {
          id: '1',
          entityType: 'project',
          fields: { title: 'Test' },
          metadata: {
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    },
    metadata: {
      generatedAt: new Date(),
      generator: 'test',
      version: '1.0.0',
    },
  };

  const contentFiles = await adapter.convertContent(content);
  console.log('Content files:', contentFiles.files.length);

  // Get adapter info
  const info = adapter.getInfo();
  console.log('CMS:', info.cmsName, info.cmsVersion);
  console.log('Features:', info.features);
  console.log('Limitations:', info.limitations);
}

// Run examples
if (require.main === module) {
  basicUsage()
    .then(() => console.log('Basic usage complete'))
    .catch(console.error);
}

export { basicUsage, fullSiteGeneration, individualComponents };
