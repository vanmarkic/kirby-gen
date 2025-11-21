/**
 * Blueprint Generator
 * Generates Kirby blueprint YAML files from generic entity schemas
 */

import { stringify as stringifyYaml } from 'yaml';
import { EntitySchema, FieldSchema, DesignTokenCollection } from '@kirby-gen/shared';
import { FieldMapper, KirbyFieldConfig } from './field-mapper';

/**
 * Kirby Blueprint Structure
 */
export interface KirbyBlueprint {
  title: string;
  icon?: string;
  num?: string;
  status?: {
    draft?: { label: string; text: string };
    listed?: { label: string; text: string };
    unlisted?: { label: string; text: string };
  };
  columns?: BlueprintColumn[];
  tabs?: Record<string, BlueprintTab>;
  fields?: Record<string, KirbyFieldConfig>;
  options?: {
    changeSlug?: boolean;
    changeStatus?: boolean;
    changeTemplate?: boolean;
    delete?: boolean;
    duplicate?: boolean;
    preview?: boolean | string;
    read?: boolean;
    update?: boolean;
  };
}

export interface BlueprintColumn {
  width: string;
  sections: Record<string, BlueprintSection>;
}

export interface BlueprintTab {
  label: string;
  icon?: string;
  columns?: BlueprintColumn[];
  fields?: Record<string, KirbyFieldConfig>;
}

export interface BlueprintSection {
  type: 'pages' | 'files' | 'fields' | 'info' | 'stats';
  headline?: string;
  label?: string;
  layout?: string;
  template?: string | string[];
  info?: string;
  fields?: Record<string, KirbyFieldConfig>;
  [key: string]: any;
}

/**
 * Blueprint Generator Configuration
 */
export interface BlueprintGeneratorConfig {
  enableDrafts?: boolean;
  enablePreview?: boolean;
  useTabLayout?: boolean;
  includeDesignTokens?: boolean;
}

/**
 * Blueprint Generator
 */
export class BlueprintGenerator {
  private fieldMapper: FieldMapper;
  private config: BlueprintGeneratorConfig;

  constructor(config: BlueprintGeneratorConfig = {}) {
    this.config = {
      enableDrafts: true,
      enablePreview: true,
      useTabLayout: true,
      includeDesignTokens: false,
      ...config,
    };
    this.fieldMapper = new FieldMapper();
  }

  /**
   * Generate blueprint for an entity
   */
  generateBlueprint(entity: EntitySchema): string {
    const blueprint = this.createBlueprint(entity);
    return stringifyYaml(blueprint, {
      indent: 2,
      lineWidth: 0,
      defaultStringType: 'QUOTE_DOUBLE',
      defaultKeyType: 'PLAIN',
    });
  }

  /**
   * Create blueprint object
   */
  private createBlueprint(entity: EntitySchema): KirbyBlueprint {
    const blueprint: KirbyBlueprint = {
      title: entity.name,
    };

    // Add icon
    if (entity.icon) {
      blueprint.icon = entity.icon;
    }

    // Add numbering
    if (entity.sortable) {
      blueprint.num = 'num';
    }

    // Add status options
    if (this.config.enableDrafts) {
      blueprint.status = {
        draft: {
          label: 'Draft',
          text: 'This page is in draft mode',
        },
        listed: {
          label: 'Published',
          text: 'This page is published and visible',
        },
        unlisted: {
          label: 'Unlisted',
          text: 'This page is published but not listed',
        },
      };
    }

    // Add options
    blueprint.options = {
      changeSlug: true,
      changeStatus: true,
      changeTemplate: false,
      delete: true,
      duplicate: true,
      preview: this.config.enablePreview,
      read: true,
      update: true,
    };

    // Create fields or tabs based on configuration
    if (this.config.useTabLayout && entity.fields.length > 6) {
      blueprint.tabs = this.createTabs(entity);
    } else {
      blueprint.columns = this.createColumns(entity.fields);
    }

    return blueprint;
  }

  /**
   * Create tabs for blueprint
   */
  private createTabs(entity: EntitySchema): Record<string, BlueprintTab> {
    const tabs: Record<string, BlueprintTab> = {};

    // Group fields by category
    const contentFields = entity.fields.filter(
      (f: any) => !['image', 'file', 'gallery', 'files'].includes(f.type)
    );
    const mediaFields = entity.fields.filter((f: any) =>
      ['image', 'file', 'gallery', 'files'].includes(f.type)
    );

    // Content tab
    if (contentFields.length > 0) {
      tabs.content = {
        label: 'Content',
        icon: 'text',
        columns: this.createColumns(contentFields),
      };
    }

    // Media tab
    if (mediaFields.length > 0) {
      tabs.media = {
        label: 'Media',
        icon: 'image',
        columns: this.createColumns(mediaFields),
      };
    }

    // Settings tab (metadata)
    tabs.settings = {
      label: 'Settings',
      icon: 'cog',
      fields: {
        slug: {
          label: 'Slug',
          type: 'text',
          help: 'URL-friendly identifier',
          icon: 'url',
        },
      },
    };

    return tabs;
  }

  /**
   * Create columns for fields
   */
  private createColumns(fields: FieldSchema[]): BlueprintColumn[] {
    // Split fields into two columns if there are many fields
    if (fields.length > 8) {
      const midpoint = Math.ceil(fields.length / 2);
      const leftFields = fields.slice(0, midpoint);
      const rightFields = fields.slice(midpoint);

      return [
        {
          width: '1/2',
          sections: {
            main: this.createFieldsSection(leftFields),
          },
        },
        {
          width: '1/2',
          sections: {
            secondary: this.createFieldsSection(rightFields),
          },
        },
      ];
    }

    // Single column layout
    return [
      {
        width: '1/1',
        sections: {
          main: this.createFieldsSection(fields),
        },
      },
    ];
  }

  /**
   * Create a fields section
   */
  private createFieldsSection(fields: FieldSchema[]): BlueprintSection {
    const section: BlueprintSection = {
      type: 'fields',
      fields: {},
    };

    fields.forEach((field) => {
      section.fields![field.name] = this.fieldMapper.mapField(field);
    });

    return section;
  }

  /**
   * Generate blueprint for design tokens
   */
  generateDesignTokenBlueprint(tokens: DesignTokenCollection): string {
    const blueprint: KirbyBlueprint = {
      title: 'Design Tokens',
      icon: 'palette',
      tabs: {
        colors: {
          label: 'Colors',
          icon: 'palette',
          fields: this.createColorFields(tokens.colors),
        },
        typography: {
          label: 'Typography',
          icon: 'text',
          fields: this.createTypographyFields(tokens.fonts),
        },
        spacing: {
          label: 'Spacing',
          icon: 'grid',
          fields: this.createSpacingFields(tokens.spacing),
        },
        effects: {
          label: 'Effects',
          icon: 'wand',
          fields: {
            ...this.createShadowFields(tokens.shadows),
            ...this.createBorderFields(tokens.borders),
          },
        },
      },
    };

    return stringifyYaml(blueprint, {
      indent: 2,
      lineWidth: 0,
    });
  }

  /**
   * Create color fields
   */
  private createColorFields(colors: Record<string, string>): Record<string, KirbyFieldConfig> {
    const fields: Record<string, KirbyFieldConfig> = {};

    Object.entries(colors).forEach(([key, value]) => {
      fields[key] = {
        label: this.formatLabel(key),
        type: 'color',
        default: value,
      };
    });

    return fields;
  }

  /**
   * Create typography fields
   */
  private createTypographyFields(fonts: Record<string, any>): Record<string, KirbyFieldConfig> {
    const fields: Record<string, KirbyFieldConfig> = {};

    Object.entries(fonts).forEach(([key, value]) => {
      fields[`${key}_family`] = {
        label: `${this.formatLabel(key)} Family`,
        type: 'text',
        default: value.family,
      };
      fields[`${key}_weights`] = {
        label: `${this.formatLabel(key)} Weights`,
        type: 'tags',
        default: value.weights?.join(', ') || '',
      };
    });

    return fields;
  }

  /**
   * Create spacing fields
   */
  private createSpacingFields(spacing: Record<string, string | number>): Record<string, KirbyFieldConfig> {
    const fields: Record<string, KirbyFieldConfig> = {};

    Object.entries(spacing).forEach(([key, value]) => {
      fields[key] = {
        label: this.formatLabel(key),
        type: 'text',
        default: String(value),
      };
    });

    return fields;
  }

  /**
   * Create shadow fields
   */
  private createShadowFields(shadows: Record<string, string>): Record<string, KirbyFieldConfig> {
    const fields: Record<string, KirbyFieldConfig> = {};

    Object.entries(shadows).forEach(([key, value]) => {
      fields[`shadow_${key}`] = {
        label: `Shadow: ${this.formatLabel(key)}`,
        type: 'text',
        default: value,
        help: 'CSS box-shadow value',
      };
    });

    return fields;
  }

  /**
   * Create border fields
   */
  private createBorderFields(borders: Record<string, string>): Record<string, KirbyFieldConfig> {
    const fields: Record<string, KirbyFieldConfig> = {};

    Object.entries(borders).forEach(([key, value]) => {
      fields[`border_${key}`] = {
        label: `Border: ${this.formatLabel(key)}`,
        type: 'text',
        default: value,
      };
    });

    return fields;
  }

  /**
   * Generate site blueprint (site.yml)
   */
  generateSiteBlueprint(entities: EntitySchema[]): string {
    const blueprint: KirbyBlueprint = {
      title: 'Site',
      icon: 'home',
      tabs: {
        pages: {
          label: 'Pages',
          icon: 'page',
          columns: [
            {
              width: '1/1',
              sections: {
                pages: {
                  type: 'pages',
                  headline: 'Pages',
                  layout: 'list',
                  template: entities.map((e) => this.entityToTemplate(e.id)),
                },
              },
            },
          ],
        },
        files: {
          label: 'Files',
          icon: 'image',
          columns: [
            {
              width: '1/1',
              sections: {
                files: {
                  type: 'files',
                  headline: 'Site Files',
                  layout: 'cards',
                },
              },
            },
          ],
        },
      },
    };

    return stringifyYaml(blueprint, {
      indent: 2,
      lineWidth: 0,
    });
  }

  /**
   * Format label from field name
   */
  private formatLabel(name: string): string {
    return name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Convert entity ID to template name
   */
  private entityToTemplate(entityId: string): string {
    return entityId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Get blueprint filename for entity
   */
  getBlueprintFilename(entity: EntitySchema): string {
    return `${this.entityToTemplate(entity.id)}.yml`;
  }
}
