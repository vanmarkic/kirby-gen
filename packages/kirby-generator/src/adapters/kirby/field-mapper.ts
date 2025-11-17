/**
 * Field Mapper
 * Maps generic field types to Kirby CMS field types
 */

import { GenericFieldType, FieldSchema, FieldOptions } from '@kirby-gen/shared';

/**
 * Kirby Field Type
 */
export type KirbyFieldType =
  | 'text'
  | 'textarea'
  | 'writer'
  | 'blocks'
  | 'markdown'
  | 'number'
  | 'range'
  | 'toggle'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkboxes'
  | 'date'
  | 'time'
  | 'files'
  | 'structure'
  | 'list'
  | 'pages'
  | 'url'
  | 'email'
  | 'tel'
  | 'color'
  | 'tags';

/**
 * Kirby Field Configuration
 */
export interface KirbyFieldConfig {
  label: string;
  type: KirbyFieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  width?: string;
  default?: any;
  translate?: boolean;

  // Type-specific options
  [key: string]: any;
}

/**
 * Field Mapping Configuration
 */
export interface FieldMappingConfig {
  prefixCustomFields?: boolean;
  enableTranslations?: boolean;
  strictValidation?: boolean;
}

/**
 * Field Type Mapper
 * Converts generic field types to Kirby field types with configuration
 */
export class FieldMapper {
  private config: FieldMappingConfig;

  constructor(config: FieldMappingConfig = {}) {
    this.config = {
      prefixCustomFields: false,
      enableTranslations: true,
      strictValidation: true,
      ...config,
    };
  }

  /**
   * Map a generic field to Kirby field configuration
   */
  mapField(field: FieldSchema): KirbyFieldConfig {
    const kirbyConfig: KirbyFieldConfig = {
      label: field.label,
      type: this.mapFieldType(field.type),
      translate: this.config.enableTranslations,
    };

    // Add required flag
    if (field.required) {
      kirbyConfig.required = true;
    }

    // Add help text
    if (field.helpText) {
      kirbyConfig.help = field.helpText;
    }

    // Add placeholder
    if (field.placeholder) {
      kirbyConfig.placeholder = field.placeholder;
    }

    // Add width
    if (field.width) {
      kirbyConfig.width = this.mapWidth(field.width);
    }

    // Add type-specific options
    if (field.options) {
      Object.assign(kirbyConfig, this.mapFieldOptions(field.type, field.options));
    }

    // Add validation rules
    if (field.validation) {
      Object.assign(kirbyConfig, this.mapValidationRules(field));
    }

    return kirbyConfig;
  }

  /**
   * Map generic field type to Kirby field type
   */
  private mapFieldType(type: GenericFieldType): KirbyFieldType {
    const mapping: Record<GenericFieldType, KirbyFieldType> = {
      // Text types
      text: 'text',
      textarea: 'textarea',
      richtext: 'writer',
      markdown: 'markdown',
      code: 'textarea', // Use textarea with custom CSS class

      // Number types
      number: 'number',
      range: 'range',

      // Choice types
      boolean: 'toggle',
      select: 'select',
      multiselect: 'multiselect',
      radio: 'radio',
      checkbox: 'checkboxes',

      // Date/Time types
      date: 'date',
      time: 'time',
      datetime: 'date', // Kirby doesn't have datetime, use date with time format

      // Media types
      image: 'files',
      file: 'files',
      gallery: 'files',
      files: 'files',

      // Structured types
      json: 'textarea', // Store as JSON string, can use custom field
      list: 'list',
      structure: 'structure',
      blocks: 'blocks',

      // Relational types
      relation: 'pages',
      relations: 'pages',

      // Special types
      url: 'url',
      email: 'email',
      tel: 'tel',
      color: 'color',
      location: 'text', // Custom field needed for full location support
      tags: 'tags',
    };

    return mapping[type] || 'text';
  }

  /**
   * Map field options to Kirby-specific configuration
   */
  private mapFieldOptions(type: GenericFieldType, options: FieldOptions): Partial<KirbyFieldConfig> {
    const config: Partial<KirbyFieldConfig> = {};

    // Default value
    if (options.defaultValue !== undefined) {
      config.default = options.defaultValue;
    }

    // Readonly
    if (options.readonly) {
      config.disabled = true;
    }

    // Type-specific options
    switch (type) {
      case 'text':
      case 'textarea':
        if (options.minLength) config.minlength = options.minLength;
        if (options.maxLength) config.maxlength = options.maxLength;
        if (options.pattern) config.pattern = options.pattern;
        break;

      case 'code':
        config.buttons = false;
        config.font = 'monospace';
        if (options.maxLength) config.maxlength = options.maxLength;
        break;

      case 'number':
      case 'range':
        if (options.min !== undefined) config.min = options.min;
        if (options.max !== undefined) config.max = options.max;
        if (options.step !== undefined) config.step = options.step;
        break;

      case 'select':
      case 'multiselect':
      case 'radio':
      case 'checkbox':
        if (options.choices) {
          config.options = this.mapChoices(options.choices);
        }
        break;

      case 'image':
      case 'file':
        config.query = 'page.images';
        config.max = type === 'image' ? 1 : (options.maxFiles || 1);
        if (options.accept) {
          config.accept = options.accept.join(',');
        }
        if (options.maxSize) {
          config.max_size = Math.floor(options.maxSize / 1024); // Convert to KB
        }
        break;

      case 'gallery':
      case 'files':
        config.query = type === 'gallery' ? 'page.images' : 'page.files';
        if (options.maxFiles) {
          config.max = options.maxFiles;
        }
        if (options.accept) {
          config.accept = options.accept.join(',');
        }
        break;

      case 'structure':
        if (options.fields) {
          config.fields = {};
          options.fields.forEach((field) => {
            config.fields![field.name] = this.mapField(field);
          });
        }
        if (options.maxItems) {
          config.max = options.maxItems;
        }
        break;

      case 'list':
        if (options.maxItems) {
          config.max = options.maxItems;
        }
        break;

      case 'relation':
      case 'relations':
        if (options.targetEntity) {
          // Map to pages query - this would need entity type to page type mapping
          config.query = `site.find('${options.targetEntity}').children`;
        }
        config.multiple = type === 'relations' || options.multiple;
        break;

      case 'blocks':
        if (options.allowedBlocks) {
          config.fieldsets = options.allowedBlocks;
        }
        break;

      case 'richtext':
        if (options.allowedFormats) {
          config.marks = options.allowedFormats;
        }
        if (options.allowedBlocks) {
          config.nodes = options.allowedBlocks;
        }
        break;
    }

    return config;
  }

  /**
   * Map field choices to Kirby options format
   */
  private mapChoices(choices: Array<{ value: string | number; label: string; disabled?: boolean }>): Record<string, string> {
    const options: Record<string, string> = {};
    choices.forEach((choice) => {
      if (!choice.disabled) {
        options[String(choice.value)] = choice.label;
      }
    });
    return options;
  }

  /**
   * Map validation rules to Kirby validation
   */
  private mapValidationRules(field: FieldSchema): Partial<KirbyFieldConfig> {
    const config: Partial<KirbyFieldConfig> = {};

    if (!field.validation) return config;

    // Required
    if (field.validation.required) {
      config.required = true;
    }

    // Min/Max
    if (field.validation.min !== undefined) {
      config.min = field.validation.min;
    }
    if (field.validation.max !== undefined) {
      config.max = field.validation.max;
    }

    // Pattern
    if (field.validation.pattern) {
      config.pattern = field.validation.pattern;
    }

    // Custom validation - would need to create custom validators
    if (field.validation.custom && field.validation.custom.length > 0) {
      config.validate = field.validation.custom.map((rule) => rule.type);
    }

    return config;
  }

  /**
   * Map generic width to Kirby width
   */
  private mapWidth(width: 'full' | 'half' | 'third' | 'quarter'): string {
    const mapping = {
      full: '1/1',
      half: '1/2',
      third: '1/3',
      quarter: '1/4',
    };
    return mapping[width];
  }

  /**
   * Check if a field type is supported by Kirby
   */
  isSupported(type: GenericFieldType): boolean {
    // All types have some mapping, even if not perfect
    return true;
  }

  /**
   * Get warnings for field mapping
   */
  getFieldWarnings(field: FieldSchema): string[] {
    const warnings: string[] = [];

    // Check for types that need custom implementation
    if (field.type === 'location') {
      warnings.push('Location field type requires custom Kirby field plugin for full functionality');
    }

    if (field.type === 'json') {
      warnings.push('JSON field type stored as text - consider custom field for better UX');
    }

    if (field.type === 'code') {
      warnings.push('Code field uses textarea - consider custom field with syntax highlighting');
    }

    // Check for unsupported features
    if (field.validation?.unique) {
      warnings.push('Unique validation requires custom implementation in Kirby');
    }

    return warnings;
  }

  /**
   * Get Kirby field type information
   */
  getKirbyFieldInfo(kirbyType: KirbyFieldType): {
    description: string;
    documentation: string;
  } {
    const info: Record<KirbyFieldType, { description: string; documentation: string }> = {
      text: {
        description: 'Single-line text input',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/text',
      },
      textarea: {
        description: 'Multi-line text input',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/textarea',
      },
      writer: {
        description: 'Rich text editor with formatting',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/writer',
      },
      blocks: {
        description: 'Modular block editor',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/blocks',
      },
      markdown: {
        description: 'Markdown editor',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/markdown',
      },
      number: {
        description: 'Number input',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/number',
      },
      range: {
        description: 'Range slider',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/range',
      },
      toggle: {
        description: 'Boolean toggle switch',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/toggle',
      },
      select: {
        description: 'Single selection dropdown',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/select',
      },
      multiselect: {
        description: 'Multiple selection dropdown',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/multiselect',
      },
      radio: {
        description: 'Radio button group',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/radio',
      },
      checkboxes: {
        description: 'Checkbox group',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/checkboxes',
      },
      date: {
        description: 'Date picker',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/date',
      },
      time: {
        description: 'Time picker',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/time',
      },
      files: {
        description: 'File selector',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/files',
      },
      structure: {
        description: 'Structured repeatable content',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/structure',
      },
      list: {
        description: 'Simple list of items',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/list',
      },
      pages: {
        description: 'Page selector',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/pages',
      },
      url: {
        description: 'URL input',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/url',
      },
      email: {
        description: 'Email input',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/email',
      },
      tel: {
        description: 'Telephone input',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/tel',
      },
      color: {
        description: 'Color picker',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/color',
      },
      tags: {
        description: 'Tag input',
        documentation: 'https://getkirby.com/docs/reference/panel/fields/tags',
      },
    };

    return info[kirbyType] || {
      description: 'Unknown field type',
      documentation: 'https://getkirby.com/docs/reference/panel/fields',
    };
  }
}
