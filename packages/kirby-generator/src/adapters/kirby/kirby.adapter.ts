/**
 * Kirby CMS Adapter
 * Implements ICMSAdapter interface for Kirby CMS
 */

import {
  ICMSAdapter,
  ContentSchema,
  StructuredContentCollection,
  DesignSystemSchema,
  GenerationConfig,
  CMSSchemaOutput,
  CMSContentOutput,
  CMSDesignOutput,
  GeneratedSite,
  ValidationResult,
  ValidationIssue,
  GeneratedFile,
} from '@kirby-gen/shared';
import { BlueprintGenerator } from './blueprint-generator';
import { ContentGenerator } from './content-generator';
import { TemplateGenerator } from './template-generator';
import { ThemeGenerator } from './theme-generator';
import { SiteScaffolder } from './site-scaffolder';
import { FieldMapper } from './field-mapper';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Kirby Adapter Options
 */
export interface KirbyAdapterOptions {
  kirbyVersion?: string;
  enableDrafts?: boolean;
  enablePreview?: boolean;
  useTabLayout?: boolean;
  includeDesignTokens?: boolean;
  phpVersion?: string;
  debugMode?: boolean;
}

/**
 * Kirby CMS Adapter
 * Converts CMS-agnostic content to Kirby CMS format
 */
export class KirbyCMSAdapter implements ICMSAdapter {
  readonly cmsName = 'Kirby';
  readonly cmsVersion: string;

  private blueprintGenerator: BlueprintGenerator;
  private contentGenerator: ContentGenerator;
  private templateGenerator: TemplateGenerator;
  private themeGenerator: ThemeGenerator;
  private siteScaffolder: SiteScaffolder;
  private fieldMapper: FieldMapper;
  private options: KirbyAdapterOptions;

  constructor(options: KirbyAdapterOptions = {}) {
    this.options = {
      kirbyVersion: '4.0.0',
      enableDrafts: true,
      enablePreview: true,
      useTabLayout: true,
      includeDesignTokens: false,
      phpVersion: '8.0',
      debugMode: false,
      ...options,
    };

    this.cmsVersion = this.options.kirbyVersion || '4.0.0';

    // Initialize generators
    this.blueprintGenerator = new BlueprintGenerator({
      enableDrafts: this.options.enableDrafts,
      enablePreview: this.options.enablePreview,
      useTabLayout: this.options.useTabLayout,
      includeDesignTokens: this.options.includeDesignTokens,
    });

    this.contentGenerator = new ContentGenerator({
      dateFormat: 'Y-m-d H:i:s',
      booleanFormat: 'true/false',
      includeMetadata: true,
    });

    this.templateGenerator = new TemplateGenerator({
      useAtomicDesign: true,
      includeComments: true,
      phpVersion: this.options.phpVersion,
      useStrictTypes: true,
    });

    this.themeGenerator = new ThemeGenerator({
      cssVariablePrefix: '--',
      includeUtilities: true,
      includeReset: true,
    });

    this.siteScaffolder = new SiteScaffolder({
      installKirby: true,
      kirbyVersion: this.options.kirbyVersion,
      createGitignore: true,
      createHtaccess: true,
      createReadme: true,
      setupPanel: true,
      debugMode: this.options.debugMode,
    });

    this.fieldMapper = new FieldMapper({
      prefixCustomFields: false,
      enableTranslations: true,
      strictValidation: true,
    });
  }

  /**
   * Convert generic content schema to Kirby blueprints
   */
  async convertSchema(schema: ContentSchema): Promise<CMSSchemaOutput> {
    const files: GeneratedFile[] = [];

    // Generate blueprints for each entity
    for (const entity of schema.entities) {
      const blueprintYaml = this.blueprintGenerator.generateBlueprint(entity);
      const filename = this.blueprintGenerator.getBlueprintFilename(entity);

      files.push({
        path: `site/blueprints/pages/${filename}`,
        content: blueprintYaml,
        encoding: 'utf-8',
      });
    }

    // Generate site blueprint
    const siteBlueprintYaml = this.blueprintGenerator.generateSiteBlueprint(schema.entities);
    files.push({
      path: 'site/blueprints/site.yml',
      content: siteBlueprintYaml,
      encoding: 'utf-8',
    });

    return {
      files,
      metadata: {
        cmsName: this.cmsName,
        cmsVersion: this.cmsVersion,
        generatedAt: new Date(),
      },
    };
  }

  /**
   * Convert structured content to Kirby content files
   */
  async convertContent(content: StructuredContentCollection): Promise<CMSContentOutput> {
    const files: GeneratedFile[] = [];
    const entityCounts: Record<string, number> = {};

    // Process each entity type
    for (const [entityId, items] of Object.entries(content.content)) {
      // Find entity schema
      const entitySchema = content.schema.entities.find((e) => e.id === entityId);
      if (!entitySchema) {
        continue;
      }

      // Generate content files
      const contentFiles = this.contentGenerator.generateContentFiles(items, entitySchema);

      contentFiles.forEach((contentFile) => {
        files.push({
          path: `content/${contentFile.path}`,
          content: contentFile.content,
          encoding: 'utf-8',
        });
      });

      entityCounts[entityId] = items.length;
    }

    return {
      files,
      metadata: {
        totalItems: Object.values(entityCounts).reduce((sum, count) => sum + count, 0),
        entities: entityCounts,
      },
    };
  }

  /**
   * Convert design system to Kirby theme/CSS
   */
  async convertDesignSystem(designSystem: DesignSystemSchema): Promise<CMSDesignOutput> {
    const files: GeneratedFile[] = [];

    // Generate theme CSS files
    const cssFiles = this.themeGenerator.generateTheme(designSystem);
    files.push(...cssFiles.map((css) => ({
      path: css.path,
      content: css.content,
      encoding: 'utf-8' as const,
    })));

    // Generate design token blueprint (if enabled)
    if (this.options.includeDesignTokens) {
      const tokenBlueprint = this.blueprintGenerator.generateDesignTokenBlueprint(
        designSystem.tokens
      );

      files.push({
        path: 'site/blueprints/pages/design-tokens.yml',
        content: tokenBlueprint,
        encoding: 'utf-8',
      });
    }

    return {
      files,
      metadata: {
        tokensCount: Object.keys(designSystem.tokens.colors).length,
        componentsCount: designSystem.components?.length || 0,
      },
    };
  }

  /**
   * Generate complete Kirby CMS installation
   */
  async generateSite(config: GenerationConfig): Promise<GeneratedSite> {
    const files: GeneratedFile[] = [];

    // 1. Validate schema first
    const validation = await this.validateSchema(config.schema);
    if (!validation.valid) {
      throw new Error(
        `Schema validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
      );
    }

    // 2. Generate site structure
    const structureFiles = this.siteScaffolder.generateSiteStructure();
    files.push(...structureFiles);

    // 3. Generate blueprints
    const schemaOutput = await this.convertSchema(config.schema);
    files.push(...schemaOutput.files);

    // 4. Generate content
    const contentOutput = await this.convertContent(config.content);
    files.push(...contentOutput.files);

    // 5. Generate templates
    const templates = await this.templateGenerator.generateAllTemplates(config.schema.entities);
    files.push(
      ...templates.map((t) => ({
        path: t.path,
        content: t.content,
        encoding: 'utf-8' as const,
      }))
    );

    // 6. Generate design system
    const designOutput = await this.convertDesignSystem(config.designSystem);
    files.push(...designOutput.files);

    // 7. Generate additional files
    files.push(this.siteScaffolder.generateComposerJSON());
    files.push(this.siteScaffolder.generatePackageJSON(config.projectId));
    files.push(this.siteScaffolder.generatePanelPlugin());
    files.push(...this.siteScaffolder.generatePlaceholders());

    // 8. Write all files to disk
    await this.writeFiles(config.outputPath, files);

    return {
      cmsName: this.cmsName,
      cmsVersion: this.cmsVersion,
      sitePath: config.outputPath,
      entryPoint: 'index.php',
      adminUrl: '/panel',
      files,
      postInstallSteps: this.siteScaffolder.generatePostInstallInstructions(),
    };
  }

  /**
   * Validate schema for Kirby compatibility
   */
  async validateSchema(schema: ContentSchema): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: string[] = [];

    // Check schema version
    if (!schema.version) {
      warnings.push({
        severity: 'warning',
        code: 'MISSING_VERSION',
        message: 'Schema version not specified',
        suggestion: 'Add a version field to enable migration support',
      });
    }

    // Validate entities
    schema.entities.forEach((entity, index) => {
      // Check for required fields
      if (!entity.id) {
        errors.push({
          severity: 'error',
          code: 'MISSING_ENTITY_ID',
          message: `Entity at index ${index} is missing an ID`,
          path: `entities[${index}]`,
        });
      }

      if (!entity.name) {
        errors.push({
          severity: 'error',
          code: 'MISSING_ENTITY_NAME',
          message: `Entity ${entity.id} is missing a name`,
          path: `entities[${index}].name`,
        });
      }

      // Check for title field
      const hasTitleField = entity.fields.some(
        (f) => f.name === 'title' || f.type === 'text'
      );
      if (!hasTitleField) {
        warnings.push({
          severity: 'warning',
          code: 'MISSING_TITLE_FIELD',
          message: `Entity ${entity.id} has no title field`,
          path: `entities[${index}].fields`,
          suggestion: 'Add a text field that can serve as the page title',
        });
      }

      // Validate fields
      entity.fields.forEach((field, fieldIndex) => {
        // Check field compatibility
        const fieldWarnings = this.fieldMapper.getFieldWarnings(field);
        fieldWarnings.forEach((warning) => {
          warnings.push({
            severity: 'warning',
            code: 'FIELD_COMPATIBILITY',
            message: `${entity.id}.${field.name}: ${warning}`,
            path: `entities[${index}].fields[${fieldIndex}]`,
          });
        });

        // Check for unique validation (not natively supported)
        if (field.validation?.unique) {
          warnings.push({
            severity: 'warning',
            code: 'UNSUPPORTED_VALIDATION',
            message: `Unique validation on ${entity.id}.${field.name} requires custom implementation`,
            path: `entities[${index}].fields[${fieldIndex}].validation.unique`,
            suggestion: 'Implement custom validation hook in Kirby',
          });
        }
      });
    });

    // Check for circular relationships
    const relationshipErrors = this.validateRelationships(schema);
    errors.push(...relationshipErrors);

    // Add info messages
    info.push(`Schema contains ${schema.entities.length} entities`);
    info.push(`Total fields: ${schema.entities.reduce((sum, e) => sum + e.fields.length, 0)}`);
    info.push(`Relationships: ${schema.relationships?.length || 0}`);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Validate relationships
   */
  private validateRelationships(schema: ContentSchema): ValidationIssue[] {
    const errors: ValidationIssue[] = [];

    if (!schema.relationships) {
      return errors;
    }

    schema.relationships.forEach((rel, index) => {
      // Check that referenced entities exist
      const fromEntity = schema.entities.find((e) => e.id === rel.from);
      const toEntity = schema.entities.find((e) => e.id === rel.to);

      if (!fromEntity) {
        errors.push({
          severity: 'error',
          code: 'INVALID_RELATIONSHIP',
          message: `Relationship references non-existent entity: ${rel.from}`,
          path: `relationships[${index}].from`,
        });
      }

      if (!toEntity) {
        errors.push({
          severity: 'error',
          code: 'INVALID_RELATIONSHIP',
          message: `Relationship references non-existent entity: ${rel.to}`,
          path: `relationships[${index}].to`,
        });
      }
    });

    return errors;
  }

  /**
   * Write files to disk
   */
  private async writeFiles(outputPath: string, files: GeneratedFile[]): Promise<void> {
    for (const file of files) {
      const filePath = path.join(outputPath, file.path);
      await fs.ensureDir(path.dirname(filePath));

      if (typeof file.content === 'string') {
        await fs.writeFile(filePath, file.content, file.encoding || 'utf-8');
      } else {
        await fs.writeFile(filePath, file.content);
      }

      // Set executable flag if specified
      if (file.executable) {
        await fs.chmod(filePath, 0o755);
      }
    }
  }

  /**
   * Get adapter information
   */
  getInfo() {
    return {
      cmsName: this.cmsName,
      cmsVersion: this.cmsVersion,
      features: [
        'Blueprint generation',
        'Content file generation',
        'Template generation',
        'Design system integration',
        'Atomic design structure',
        'Full site scaffolding',
      ],
      limitations: [
        'Unique validation requires custom implementation',
        'Location fields need custom field plugin',
        'Some advanced field types may require plugins',
      ],
    };
  }
}
