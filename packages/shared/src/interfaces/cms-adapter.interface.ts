import {
  ContentSchema,
  StructuredContentCollection,
  DesignSystemSchema,
} from '../types/cms-agnostic.types';

/**
 * CMS Adapter Interface
 * Converts CMS-agnostic content to specific CMS formats
 *
 * Implementations:
 * - KirbyCMSAdapter: Converts to Kirby CMS format
 * - StrapiAdapter: Converts to Strapi format
 * - ContentfulAdapter: Converts to Contentful format
 * - etc.
 */
export interface ICMSAdapter {
  /**
   * Name of the CMS this adapter targets
   */
  readonly cmsName: string;

  /**
   * Version of the CMS this adapter targets
   */
  readonly cmsVersion: string;

  /**
   * Convert generic content schema to CMS-specific schema/blueprints
   * @param schema - Generic content schema
   * @returns CMS-specific schema definition
   */
  convertSchema(schema: ContentSchema): Promise<CMSSchemaOutput>;

  /**
   * Convert structured content to CMS-specific content files/entries
   * @param content - Generic structured content
   * @returns CMS-specific content files
   */
  convertContent(content: StructuredContentCollection): Promise<CMSContentOutput>;

  /**
   * Convert design system to CMS-specific theme/styling
   * @param designSystem - Generic design system
   * @returns CMS-specific theme files
   */
  convertDesignSystem(designSystem: DesignSystemSchema): Promise<CMSDesignOutput>;

  /**
   * Generate complete CMS installation
   * @param config - Generation configuration
   * @returns Generated CMS site information
   */
  generateSite(config: GenerationConfig): Promise<GeneratedSite>;

  /**
   * Validate if the content schema is compatible with this CMS
   * @param schema - Generic content schema
   * @returns Validation result with warnings/errors
   */
  validateSchema(schema: ContentSchema): Promise<ValidationResult>;
}

/**
 * Generation Configuration
 */
export interface GenerationConfig {
  projectId: string;
  schema: ContentSchema;
  content: StructuredContentCollection;
  designSystem: DesignSystemSchema;
  outputPath: string;
  options?: CMSSpecificOptions;
}

export interface CMSSpecificOptions {
  // CMS-specific configuration
  // Each adapter can define its own options
  [key: string]: any;
}

/**
 * Schema Output
 */
export interface CMSSchemaOutput {
  files: GeneratedFile[];
  metadata: {
    cmsName: string;
    cmsVersion: string;
    generatedAt: Date;
  };
}

/**
 * Content Output
 */
export interface CMSContentOutput {
  files: GeneratedFile[];
  metadata: {
    totalItems: number;
    entities: Record<string, number>; // entityType -> count
  };
}

/**
 * Design Output
 */
export interface CMSDesignOutput {
  files: GeneratedFile[];
  metadata: {
    tokensCount: number;
    componentsCount?: number;
  };
}

/**
 * Generated File
 */
export interface GeneratedFile {
  path: string; // Relative path within CMS structure
  content: string | Buffer;
  encoding?: 'utf-8' | 'binary';
  executable?: boolean;
}

/**
 * Generated Site
 */
export interface GeneratedSite {
  cmsName: string;
  cmsVersion: string;
  sitePath: string;
  entryPoint?: string; // Main file to run/serve
  adminUrl?: string; // Admin panel URL pattern
  files: GeneratedFile[];
  postInstallSteps?: string[]; // Instructions for manual steps
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info?: string[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string; // JSON path to the problematic element
  suggestion?: string;
}

/**
 * CMS Adapter Registry
 * Manages available CMS adapters
 */
export interface ICMSAdapterRegistry {
  /**
   * Register a CMS adapter
   */
  register(adapter: ICMSAdapter): void;

  /**
   * Get adapter by CMS name
   */
  get(cmsName: string): ICMSAdapter | undefined;

  /**
   * List all registered adapters
   */
  list(): CMSAdapterInfo[];

  /**
   * Check if adapter exists
   */
  has(cmsName: string): boolean;
}

export interface CMSAdapterInfo {
  cmsName: string;
  cmsVersion: string;
  features: string[];
  limitations?: string[];
}
