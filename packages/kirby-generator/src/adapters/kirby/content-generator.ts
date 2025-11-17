/**
 * Content Generator
 * Generates Kirby .txt content files from generic content items
 */

import { ContentItem, EntitySchema, FieldSchema, GenericFieldType } from '@kirby-gen/shared';

/**
 * Kirby Content File Structure
 * Format: field_name: value
 */
export interface KirbyContentData {
  title?: string;
  [key: string]: any;
}

/**
 * Content Generator Configuration
 */
export interface ContentGeneratorConfig {
  dateFormat?: string;
  booleanFormat?: 'true/false' | 'yes/no' | '1/0';
  multilineMarker?: string;
  includeMetadata?: boolean;
}

/**
 * Content File Result
 */
export interface ContentFileResult {
  path: string; // Relative path within content directory
  content: string; // Content file text
  metadata: {
    slug: string;
    status: string;
    template: string;
  };
}

/**
 * Content Generator
 * Converts generic ContentItem to Kirby .txt format
 */
export class ContentGenerator {
  private config: ContentGeneratorConfig;

  constructor(config: ContentGeneratorConfig = {}) {
    this.config = {
      dateFormat: 'Y-m-d H:i:s',
      booleanFormat: 'true/false',
      multilineMarker: '\n\n----\n\n',
      includeMetadata: true,
      ...config,
    };
  }

  /**
   * Generate content file for a single item
   */
  generateContentFile(
    item: ContentItem,
    entitySchema: EntitySchema,
    parentSlug?: string
  ): ContentFileResult {
    const slug = this.generateSlug(item, entitySchema);
    const status = this.mapStatus(item.metadata.status);
    const template = this.entityToTemplate(item.entityType);

    // Build content path
    const path = this.buildContentPath(slug, parentSlug);

    // Generate content text
    const content = this.serializeContent(item, entitySchema);

    return {
      path,
      content,
      metadata: {
        slug,
        status,
        template,
      },
    };
  }

  /**
   * Serialize content item to Kirby .txt format
   */
  private serializeContent(item: ContentItem, entitySchema: EntitySchema): string {
    const lines: string[] = [];

    // Add title (required by Kirby)
    const titleField = this.getTitleField(item, entitySchema);
    if (titleField) {
      lines.push(`Title: ${titleField}`);
      lines.push('');
    }

    // Add all other fields
    entitySchema.fields.forEach((fieldSchema) => {
      const value = item.fields[fieldSchema.name];

      // Skip if value is undefined or null
      if (value === undefined || value === null) {
        return;
      }

      const serialized = this.serializeField(fieldSchema, value);
      if (serialized) {
        lines.push(serialized);
        lines.push('');
      }
    });

    // Add metadata fields if enabled
    if (this.config.includeMetadata) {
      lines.push(`Created: ${this.formatDate(item.metadata.createdAt)}`);
      lines.push(`Updated: ${this.formatDate(item.metadata.updatedAt)}`);

      if (item.metadata.author) {
        lines.push(`Author: ${item.metadata.author}`);
      }

      if (item.metadata.publishedAt) {
        lines.push(`Published: ${this.formatDate(item.metadata.publishedAt)}`);
      }
    }

    return lines.join('\n').trim();
  }

  /**
   * Serialize a single field
   */
  private serializeField(fieldSchema: FieldSchema, value: any): string {
    const fieldName = this.formatFieldName(fieldSchema.name);

    switch (fieldSchema.type) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'url':
      case 'tel':
      case 'color':
        return `${fieldName}: ${this.escapeValue(String(value))}`;

      case 'richtext':
      case 'markdown':
      case 'code':
        return this.serializeMultilineField(fieldName, String(value));

      case 'number':
      case 'range':
        return `${fieldName}: ${value}`;

      case 'boolean':
        return `${fieldName}: ${this.formatBoolean(value)}`;

      case 'date':
      case 'datetime':
        return `${fieldName}: ${this.formatDate(value)}`;

      case 'time':
        return `${fieldName}: ${this.formatTime(value)}`;

      case 'select':
      case 'radio':
        return `${fieldName}: ${value}`;

      case 'multiselect':
      case 'checkbox':
      case 'tags':
        return `${fieldName}: ${this.serializeArray(value)}`;

      case 'image':
      case 'file':
        return `${fieldName}: ${this.serializeFile(value)}`;

      case 'gallery':
      case 'files':
        return `${fieldName}: ${this.serializeFiles(value)}`;

      case 'list':
        return this.serializeMultilineField(fieldName, this.serializeList(value));

      case 'structure':
        return this.serializeMultilineField(fieldName, this.serializeStructure(value));

      case 'blocks':
        return this.serializeMultilineField(fieldName, this.serializeBlocks(value));

      case 'json':
        return this.serializeMultilineField(fieldName, JSON.stringify(value, null, 2));

      case 'relation':
        return `${fieldName}: ${this.serializeRelation(value)}`;

      case 'relations':
        return `${fieldName}: ${this.serializeRelations(value)}`;

      case 'location':
        return `${fieldName}: ${this.serializeLocation(value)}`;

      default:
        return `${fieldName}: ${String(value)}`;
    }
  }

  /**
   * Serialize multiline field
   */
  private serializeMultilineField(fieldName: string, content: string): string {
    return `${fieldName}:\n\n${content}`;
  }

  /**
   * Serialize array values
   */
  private serializeArray(values: any[]): string {
    if (!Array.isArray(values)) {
      return '';
    }
    return values.map((v) => String(v)).join(', ');
  }

  /**
   * Serialize file reference
   */
  private serializeFile(value: any): string {
    if (typeof value === 'string') {
      return value; // Filename
    }
    if (typeof value === 'object' && value.filename) {
      return value.filename;
    }
    return '';
  }

  /**
   * Serialize multiple files
   */
  private serializeFiles(values: any[]): string {
    if (!Array.isArray(values)) {
      return '';
    }
    return values.map((v) => this.serializeFile(v)).join(', ');
  }

  /**
   * Serialize list field
   */
  private serializeList(values: any[]): string {
    if (!Array.isArray(values)) {
      return '';
    }
    return values.map((v) => `- ${v}`).join('\n');
  }

  /**
   * Serialize structure field (YAML-like format)
   */
  private serializeStructure(items: any[]): string {
    if (!Array.isArray(items)) {
      return '';
    }

    const serialized = items
      .map((item, index) => {
        const lines = [`- `];
        Object.entries(item).forEach(([key, value]) => {
          lines.push(`  ${key}: ${this.escapeValue(String(value))}`);
        });
        return lines.join('\n');
      })
      .join('\n');

    return serialized;
  }

  /**
   * Serialize blocks field (JSON format)
   */
  private serializeBlocks(blocks: any[]): string {
    if (!Array.isArray(blocks)) {
      return '';
    }
    // Kirby blocks are stored as JSON
    return JSON.stringify(blocks, null, 2);
  }

  /**
   * Serialize relation (page reference)
   */
  private serializeRelation(value: any): string {
    if (typeof value === 'string') {
      return value; // Page ID or slug
    }
    if (typeof value === 'object' && value.id) {
      return value.id;
    }
    return '';
  }

  /**
   * Serialize relations (multiple page references)
   */
  private serializeRelations(values: any[]): string {
    if (!Array.isArray(values)) {
      return '';
    }
    return values.map((v) => this.serializeRelation(v)).join(', ');
  }

  /**
   * Serialize location
   */
  private serializeLocation(value: any): string {
    if (typeof value === 'object' && value.lat && value.lng) {
      return `${value.lat},${value.lng}`;
    }
    return String(value);
  }

  /**
   * Format field name for Kirby
   */
  private formatFieldName(name: string): string {
    // Capitalize first letter of each word
    return name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Escape field value
   */
  private escapeValue(value: string): string {
    // Escape newlines in single-line fields
    return value.replace(/\n/g, '\\n');
  }

  /**
   * Format boolean value
   */
  private formatBoolean(value: boolean): string {
    switch (this.config.booleanFormat) {
      case 'yes/no':
        return value ? 'yes' : 'no';
      case '1/0':
        return value ? '1' : '0';
      default:
        return value ? 'true' : 'false';
    }
  }

  /**
   * Format date
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (!d || isNaN(d.getTime())) {
      return '';
    }

    // Format as YYYY-MM-DD HH:mm:ss
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format time
   */
  private formatTime(time: Date | string): string {
    const t = typeof time === 'string' ? new Date(time) : time;

    if (!t || isNaN(t.getTime())) {
      return String(time);
    }

    const hours = String(t.getHours()).padStart(2, '0');
    const minutes = String(t.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  /**
   * Get title field value
   */
  private getTitleField(item: ContentItem, entitySchema: EntitySchema): string {
    // Use displayField if specified
    if (entitySchema.displayField && item.fields[entitySchema.displayField]) {
      return String(item.fields[entitySchema.displayField]);
    }

    // Look for common title fields
    const titleFields = ['title', 'name', 'heading'];
    for (const fieldName of titleFields) {
      if (item.fields[fieldName]) {
        return String(item.fields[fieldName]);
      }
    }

    // Use first text field
    const firstTextField = entitySchema.fields.find((f) => f.type === 'text');
    if (firstTextField && item.fields[firstTextField.name]) {
      return String(item.fields[firstTextField.name]);
    }

    // Fallback to ID
    return item.id;
  }

  /**
   * Generate slug from item
   */
  private generateSlug(item: ContentItem, entitySchema: EntitySchema): string {
    // Use existing slug if available
    if (item.metadata.slug) {
      return this.sanitizeSlug(item.metadata.slug);
    }

    // Use slug source field if specified
    if (entitySchema.slugSource && item.fields[entitySchema.slugSource]) {
      return this.sanitizeSlug(String(item.fields[entitySchema.slugSource]));
    }

    // Use title field
    const titleField = this.getTitleField(item, entitySchema);
    return this.sanitizeSlug(titleField);
  }

  /**
   * Sanitize slug
   */
  private sanitizeSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Map status to Kirby status
   */
  private mapStatus(status: 'draft' | 'published' | 'archived'): string {
    switch (status) {
      case 'draft':
        return 'draft';
      case 'published':
        return 'listed';
      case 'archived':
        return 'unlisted';
      default:
        return 'draft';
    }
  }

  /**
   * Build content file path
   */
  private buildContentPath(slug: string, parentSlug?: string): string {
    const filename = `${slug}.txt`;

    if (parentSlug) {
      return `${parentSlug}/${slug}/${filename}`;
    }

    return `${slug}/${filename}`;
  }

  /**
   * Convert entity ID to template name
   */
  private entityToTemplate(entityId: string): string {
    return entityId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Generate batch of content files
   */
  generateContentFiles(
    items: ContentItem[],
    entitySchema: EntitySchema,
    parentSlug?: string
  ): ContentFileResult[] {
    return items.map((item) => this.generateContentFile(item, entitySchema, parentSlug));
  }
}
